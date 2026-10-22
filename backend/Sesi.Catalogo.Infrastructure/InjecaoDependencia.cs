using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Sesi.Catalogo.Domain.Abstractions;
using Sesi.Catalogo.Infrastructure.Data;
using Sesi.Catalogo.Infrastructure.Repositorios;

namespace Sesi.Catalogo.Infrastructure;

/// <summary>
/// Registro dos serviços da Infrastructure (DbContext multi-provider e repositório).
/// </summary>
public static class InjecaoDependencia
{
    /// <summary>
    /// Registra o <see cref="CatalogoDbContext"/> escolhendo o provider a partir de
    /// <c>Database__Provider</c> ("Sqlite" local, "Npgsql" produção) e a connection string
    /// <c>ConnectionStrings__Catalogo</c>.
    /// </summary>
    public static IServiceCollection AdicionarInfraestrutura(
        this IServiceCollection services, IConfiguration configuration)
    {
        var provider = configuration["Database:Provider"] ?? "Sqlite";
        var connectionString = configuration.GetConnectionString("Catalogo");

        services.AddDbContext<CatalogoDbContext>(options =>
        {
            if (provider.Equals("Npgsql", StringComparison.OrdinalIgnoreCase) ||
                provider.Equals("Postgres", StringComparison.OrdinalIgnoreCase))
            {
                options.UseNpgsql(connectionString);
            }
            else
            {
                options.UseSqlite(connectionString ?? "Data Source=catalogo.db");
            }
        });

        services.AddScoped<ICatalogoRepositorio, CatalogoRepositorio>();

        return services;
    }

    /// <summary>
    /// Cria o banco (quando necessário) e executa o seeder de forma idempotente.
    /// </summary>
    public static async Task InicializarBancoAsync(this IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CatalogoDbContext>();
        await db.Database.EnsureCreatedAsync(ct);
        await CatalogoSeeder.SemearAsync(db, ct);
        await CatalogoScormSeeder.SemearAsync(db, ct);
    }
}

/// <summary>
/// Popula as associações SCORM das aulas (todas as aulas ganham um SCO 1.2 por padrão).
/// Executa de forma idempotente.
/// </summary>
public static class CatalogoScormSeeder
{
    public static async Task SemearAsync(CatalogoDbContext db, CancellationToken ct = default)
    {
        if (await db.AulasScorm.AnyAsync(ct))
            return;

        var aulas = await db.Aulas.ToListAsync(ct);
        foreach (var aula in aulas)
        {
            db.AulasScorm.Add(new Domain.Entities.AulaScorm
            {
                AulaId = aula.Id,
                Versao = "1.2",
                LaunchUrl = $"/scorm/{aula.Id}/index.html",
                ItemId = $"SCO_{aula.Id}"
            });
        }

        await db.SaveChangesAsync(ct);
    }
}
