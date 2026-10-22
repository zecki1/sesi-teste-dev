using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sesi.Catalogo.Domain.Dtos;
using Sesi.Catalogo.Infrastructure.Data;

namespace Sesi.Catalogo.Tests;

public class CatalogoApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public CatalogoApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var descriptors = services.Where(d =>
                    d.ServiceType == typeof(DbContextOptions<CatalogoDbContext>) ||
                    d.ServiceType == typeof(CatalogoDbContext)).ToList();
                foreach (var descriptor in descriptors)
                    services.Remove(descriptor);

                var connection = new Microsoft.Data.Sqlite.SqliteConnection("Data Source=:memory:");
                connection.Open();
                services.AddSingleton(connection);

                services.AddDbContext<CatalogoDbContext>(options =>
                    options.UseSqlite(connection));

                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<CatalogoDbContext>();
                db.Database.EnsureCreated();
            });
        });
    }

    [Fact]
    public async Task Health_DeveRetornarOk()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Facetas_DeveRetornarCategoriasModalidadesStatus()
    {
        var client = _factory.CreateClient();
        var facetas = await client.GetFromJsonAsync<FacetasDto>("/api/v1/facetas");

        facetas.Should().NotBeNull();
        facetas!.Categorias.Should().HaveCount(4);
        facetas.Modalidades.Should().HaveCount(2);
        facetas.Status.Should().HaveCount(3);
    }

    [Fact]
    public async Task Cursos_DeveListarComPaginacao()
    {
        var client = _factory.CreateClient();
        var pagina = await client.GetFromJsonAsync<PaginaDto<CursoResumoDto>>("/api/v1/cursos?pagina=1&tamanho=5");

        pagina.Should().NotBeNull();
        pagina!.Total.Should().Be(10);
        pagina.Pagina.Should().Be(1);
        pagina.Tamanho.Should().Be(5);
        pagina.Itens.Should().HaveCount(5);
        pagina.Facetas.Should().NotBeNull();
    }

    [Fact]
    public async Task Cursos_FiltroPorCategoria_DeveFuncionar()
    {
        var client = _factory.CreateClient();
        var pagina = await client.GetFromJsonAsync<PaginaDto<CursoResumoDto>>("/api/v1/cursos?categoria=linguagens");

        pagina.Should().NotBeNull();
        pagina!.Itens.Should().OnlyContain(c => c.Categoria.Slug == "linguagens");
        pagina.Itens.Should().NotBeEmpty();
    }

    [Fact]
    public async Task CursoPorSlug_DeveRetornarDetalheComModulos()
    {
        var client = _factory.CreateClient();
        var curso = await client.GetFromJsonAsync<CursoDetalheDto>("/api/v1/cursos/robotica-e-automacao-industrial");

        curso.Should().NotBeNull();
        curso!.Slug.Should().Be("robotica-e-automacao-industrial");
        curso.Modulos.Should().HaveCount(3);
        curso.Modulos[0].Aulas.Should().HaveCount(3);
    }

    [Fact]
    public async Task CursoPorSlug_Inexistente_DeveRetornar404()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/cursos/curso-que-nao-existe");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ProgressoSemUsuario_DeveRetornarZerado()
    {
        var client = _factory.CreateClient();
        var progresso = await client.GetFromJsonAsync<ProgressoCursoDto>("/api/v1/cursos/robotica-e-automacao-industrial/progresso");

        progresso.Should().NotBeNull();
        progresso!.TotalAulas.Should().Be(9);
        progresso.AulasConcluidas.Should().Be(0);
        progresso.Percentual.Should().Be(0);
    }

    [Fact]
    public async Task SessaoScorm_CommitERecuperacao()
    {
        var client = _factory.CreateClient();

        var commit = new CommitScormRequest("sessao-teste-123", 1, "aluno1", "{\"page\":1}", "incomplete", null, null, null, null, null, null, null, null);
        var post = await client.PostAsJsonAsync("/api/v1/sessoes-scorm", commit);
        post.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetAsync("/api/v1/sessoes-scorm?sessaoId=sessao-teste-123");
        get.StatusCode.Should().Be(HttpStatusCode.OK);

        var sessao = await get.Content.ReadFromJsonAsync<SessaoScormDto>();
        sessao.Should().NotBeNull();
        sessao!.SessaoId.Should().Be("sessao-teste-123");
        sessao.AulaScormId.Should().Be(1);
    }

    [Fact]
    public async Task SessaoScorm_SemSessaoId_DeveRetornar400()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/sessoes-scorm?sessaoId=");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
