using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Data;
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
        await GarantirColunasFluxoCursoAsync(db, ct);
        await GarantirTabelasTraducaoAsync(db, ct);
        await GarantirTabelaAvaliacoesAsync(db, ct);
        await AtualizarCorCienciasDaNaturezaAsync(db, ct);
        await CatalogoSeeder.SemearAsync(db, ct);
        await CatalogoTurmasSeeder.SemearAsync(db, ct);
        await CatalogoScormSeeder.SemearAsync(db, ct);
        await CatalogoTraducoesSeeder.SemearAsync(db, ct);
        await CatalogoPerguntasSeeder.SemearAsync(db, ct);
    }

    /// <summary>
    /// Atualiza a cor da categoria Ciências da Natureza para o lilás do design.
    /// Só troca quando o valor antigo ainda está no banco, para não sobrescrever
    /// uma cor personalizada pela gestão.
    /// </summary>
    private static async Task AtualizarCorCienciasDaNaturezaAsync(CatalogoDbContext db, CancellationToken ct)
    {
        var categoria = await db.Categorias
            .FirstOrDefaultAsync(c => c.Slug == "ciencias-da-natureza", ct);

        if (categoria is null || !categoria.Cor.Equals("#0EA5E9", StringComparison.OrdinalIgnoreCase))
            return;

        categoria.Cor = "#DEC8F8";
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Cria as tabelas de tradução em bancos já existentes.
    /// Como o projeto usa <c>EnsureCreated</c> (sem migrations), tabelas novas não são
    /// criadas automaticamente em um banco que já existe.
    /// </summary>
    private static async Task GarantirTabelasTraducaoAsync(CatalogoDbContext db, CancellationToken ct)
    {
        if (db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true)
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE IF NOT EXISTS "CategoriasTraducoes" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_CategoriasTraducoes" PRIMARY KEY AUTOINCREMENT,
                    "CategoriaId" INTEGER NOT NULL,
                    "Idioma" TEXT NOT NULL,
                    "Nome" TEXT NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_CategoriasTraducoes_CategoriaId_Idioma"
                    ON "CategoriasTraducoes" ("CategoriaId", "Idioma");

                CREATE TABLE IF NOT EXISTS "ModalidadesTraducoes" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_ModalidadesTraducoes" PRIMARY KEY AUTOINCREMENT,
                    "ModalidadeId" INTEGER NOT NULL,
                    "Idioma" TEXT NOT NULL,
                    "Nome" TEXT NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_ModalidadesTraducoes_ModalidadeId_Idioma"
                    ON "ModalidadesTraducoes" ("ModalidadeId", "Idioma");

                CREATE TABLE IF NOT EXISTS "CursosTraducoes" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_CursosTraducoes" PRIMARY KEY AUTOINCREMENT,
                    "CursoId" INTEGER NOT NULL,
                    "Idioma" TEXT NOT NULL,
                    "NomeCompleto" TEXT NOT NULL,
                    "NomeBreve" TEXT NOT NULL,
                    "Descricao" TEXT NULL,
                    "PublicoAlvo" TEXT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_CursosTraducoes_CursoId_Idioma"
                    ON "CursosTraducoes" ("CursoId", "Idioma");

                CREATE TABLE IF NOT EXISTS "CursosPerguntas" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_CursosPerguntas" PRIMARY KEY AUTOINCREMENT,
                    "CursoId" INTEGER NOT NULL,
                    "Ordem" INTEGER NOT NULL,
                    "Ativa" INTEGER NOT NULL,
                    CONSTRAINT "FK_CursosPerguntas_Cursos_CursoId" FOREIGN KEY ("CursoId") REFERENCES "Cursos" ("Id") ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS "IX_CursosPerguntas_CursoId_Ordem"
                    ON "CursosPerguntas" ("CursoId", "Ordem");

                CREATE TABLE IF NOT EXISTS "CursosPerguntasTraducoes" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_CursosPerguntasTraducoes" PRIMARY KEY AUTOINCREMENT,
                    "CursoPerguntaId" INTEGER NOT NULL,
                    "Idioma" TEXT NOT NULL,
                    "Pergunta" TEXT NOT NULL,
                    "Resposta" TEXT NOT NULL,
                    CONSTRAINT "FK_CursosPerguntasTraducoes_CursosPerguntas_CursoPerguntaId" FOREIGN KEY ("CursoPerguntaId") REFERENCES "CursosPerguntas" ("Id") ON DELETE CASCADE
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_CursosPerguntasTraducoes_CursoPerguntaId_Idioma"
                    ON "CursosPerguntasTraducoes" ("CursoPerguntaId", "Idioma");
                """,
                ct);
            return;
        }

        if (db.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true)
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE IF NOT EXISTS "CategoriasTraducoes" (
                    "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                    "CategoriaId" integer NOT NULL,
                    "Idioma" character varying(10) NOT NULL,
                    "Nome" character varying(120) NOT NULL,
                    CONSTRAINT "PK_CategoriasTraducoes" PRIMARY KEY ("Id")
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_CategoriasTraducoes_CategoriaId_Idioma"
                    ON "CategoriasTraducoes" ("CategoriaId", "Idioma");

                CREATE TABLE IF NOT EXISTS "ModalidadesTraducoes" (
                    "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                    "ModalidadeId" integer NOT NULL,
                    "Idioma" character varying(10) NOT NULL,
                    "Nome" character varying(80) NOT NULL,
                    CONSTRAINT "PK_ModalidadesTraducoes" PRIMARY KEY ("Id")
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_ModalidadesTraducoes_ModalidadeId_Idioma"
                    ON "ModalidadesTraducoes" ("ModalidadeId", "Idioma");

                CREATE TABLE IF NOT EXISTS "CursosTraducoes" (
                    "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                    "CursoId" integer NOT NULL,
                    "Idioma" character varying(10) NOT NULL,
                    "NomeCompleto" character varying(200) NOT NULL,
                    "NomeBreve" character varying(160) NOT NULL,
                    "Descricao" character varying(2000) NULL,
                    "PublicoAlvo" character varying(400) NULL,
                    CONSTRAINT "PK_CursosTraducoes" PRIMARY KEY ("Id")
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_CursosTraducoes_CursoId_Idioma"
                    ON "CursosTraducoes" ("CursoId", "Idioma");

                CREATE TABLE IF NOT EXISTS "CursosPerguntas" (
                    "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                    "CursoId" integer NOT NULL,
                    "Ordem" integer NOT NULL,
                    "Ativa" boolean NOT NULL,
                    CONSTRAINT "PK_CursosPerguntas" PRIMARY KEY ("Id"),
                    CONSTRAINT "FK_CursosPerguntas_Cursos_CursoId" FOREIGN KEY ("CursoId") REFERENCES "Cursos" ("Id") ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS "IX_CursosPerguntas_CursoId_Ordem"
                    ON "CursosPerguntas" ("CursoId", "Ordem");

                CREATE TABLE IF NOT EXISTS "CursosPerguntasTraducoes" (
                    "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                    "CursoPerguntaId" integer NOT NULL,
                    "Idioma" character varying(10) NOT NULL,
                    "Pergunta" character varying(300) NOT NULL,
                    "Resposta" character varying(2000) NOT NULL,
                    CONSTRAINT "PK_CursosPerguntasTraducoes" PRIMARY KEY ("Id"),
                    CONSTRAINT "FK_CursosPerguntasTraducoes_CursosPerguntas_CursoPerguntaId" FOREIGN KEY ("CursoPerguntaId") REFERENCES "CursosPerguntas" ("Id") ON DELETE CASCADE
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_CursosPerguntasTraducoes_CursoPerguntaId_Idioma"
                    ON "CursosPerguntasTraducoes" ("CursoPerguntaId", "Idioma");
                """,
                ct);
        }
    }

    /// <summary>
    /// Cria a tabela de avaliações de curso em bancos já existentes (o projeto usa
    /// <c>EnsureCreated</c>, sem migrations, então tabelas novas exigem DDL idempotente).
    /// </summary>
    private static async Task GarantirTabelaAvaliacoesAsync(CatalogoDbContext db, CancellationToken ct)
    {
        if (db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true)
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE IF NOT EXISTS "Avaliacoes" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_Avaliacoes" PRIMARY KEY AUTOINCREMENT,
                    "CursoId" INTEGER NOT NULL,
                    "UsuarioId" TEXT NOT NULL,
                    "Nome" TEXT NOT NULL,
                    "Nota" INTEGER NOT NULL,
                    "Depoimento" TEXT NOT NULL,
                    "NotaPlataforma" INTEGER NOT NULL,
                    "NotaCurso" INTEGER NOT NULL,
                    "NotaAvaliacao" INTEGER NOT NULL,
                    "NotaAcessibilidade" INTEGER NOT NULL,
                    "Sugestao" TEXT NOT NULL,
                    "Idioma" TEXT NOT NULL,
                    "Publicada" INTEGER NOT NULL,
                    "CriadoEm" TEXT NOT NULL,
                    "AtualizadoEm" TEXT NULL,
                    CONSTRAINT "FK_Avaliacoes_Cursos_CursoId" FOREIGN KEY ("CursoId") REFERENCES "Cursos" ("Id") ON DELETE CASCADE
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_Avaliacoes_CursoId_UsuarioId"
                    ON "Avaliacoes" ("CursoId", "UsuarioId");
                """,
                ct);
            return;
        }

        if (db.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true)
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE IF NOT EXISTS "Avaliacoes" (
                    "Id" integer GENERATED BY DEFAULT AS IDENTITY,
                    "CursoId" integer NOT NULL,
                    "UsuarioId" character varying(200) NOT NULL,
                    "Nome" character varying(120) NOT NULL,
                    "Nota" integer NOT NULL,
                    "Depoimento" character varying(2000) NOT NULL,
                    "NotaPlataforma" integer NOT NULL,
                    "NotaCurso" integer NOT NULL,
                    "NotaAvaliacao" integer NOT NULL,
                    "NotaAcessibilidade" integer NOT NULL,
                    "Sugestao" character varying(2000) NOT NULL,
                    "Idioma" character varying(10) NOT NULL,
                    "Publicada" boolean NOT NULL,
                    "CriadoEm" timestamp with time zone NOT NULL,
                    "AtualizadoEm" timestamp with time zone NULL,
                    CONSTRAINT "PK_Avaliacoes" PRIMARY KEY ("Id"),
                    CONSTRAINT "FK_Avaliacoes_Cursos_CursoId" FOREIGN KEY ("CursoId") REFERENCES "Cursos" ("Id") ON DELETE CASCADE
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_Avaliacoes_CursoId_UsuarioId"
                    ON "Avaliacoes" ("CursoId", "UsuarioId");
                """,
                ct);
        }
    }

    private static async Task GarantirColunasFluxoCursoAsync(CatalogoDbContext db, CancellationToken ct)
    {
        if (db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true)
        {
            await GarantirColunaSqliteAsync(db, "DataPublicacao", ct);
            await GarantirColunaSqliteAsync(db, "DataLiberacaoMatricula", ct);
            await GarantirColunaSqliteAsync(db, "EtapaDesenvolvimento", ct);
            return;
        }

        if (db.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true)
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                ALTER TABLE "Cursos" ADD COLUMN IF NOT EXISTS "DataPublicacao" date NULL;
                ALTER TABLE "Cursos" ADD COLUMN IF NOT EXISTS "DataLiberacaoMatricula" date NULL;
                ALTER TABLE "Cursos" ADD COLUMN IF NOT EXISTS "EtapaDesenvolvimento" character varying(20) NOT NULL DEFAULT 'Publicado';
                """,
                ct);
        }
    }

    private static async Task GarantirColunaSqliteAsync(
        CatalogoDbContext db, string coluna, CancellationToken ct)
    {
        var conexao = db.Database.GetDbConnection();
        var abriuConexao = conexao.State != ConnectionState.Open;
        if (abriuConexao) await conexao.OpenAsync(ct);

        try
        {
            await using var comando = conexao.CreateCommand();
            comando.CommandText = "PRAGMA table_info(\"Cursos\")";
            await using var reader = await comando.ExecuteReaderAsync(ct);
            var existe = false;
            while (await reader.ReadAsync(ct))
            {
                if (reader.GetString(1).Equals(coluna, StringComparison.OrdinalIgnoreCase))
                {
                    existe = true;
                    break;
                }
            }
            await reader.DisposeAsync();

            if (!existe)
            {
                var comandoAlteracao = coluna switch
                {
                    "DataPublicacao" => "ALTER TABLE \"Cursos\" ADD COLUMN \"DataPublicacao\" TEXT NULL",
                    "DataLiberacaoMatricula" => "ALTER TABLE \"Cursos\" ADD COLUMN \"DataLiberacaoMatricula\" TEXT NULL",
                    "EtapaDesenvolvimento" => "ALTER TABLE \"Cursos\" ADD COLUMN \"EtapaDesenvolvimento\" TEXT NOT NULL DEFAULT 'Publicado'",
                    _ => throw new InvalidOperationException("Coluna de fluxo de curso não reconhecida.")
                };
                await db.Database.ExecuteSqlRawAsync(comandoAlteracao, ct);
            }
        }
        finally
        {
            if (abriuConexao) await conexao.CloseAsync();
        }
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
