using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
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
            builder.UseSetting("Scorm:Root", Path.Combine(Path.GetTempPath(), "sesi-scorm-testes", Guid.NewGuid().ToString("N")));

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
        facetas!.Categorias.Should().HaveCount(5);
        facetas.Modalidades.Should().HaveCount(3);
        facetas.Status.Should().HaveCount(3);
    }

    [Fact]
    public async Task Cursos_DeveListarComPaginacao()
    {
        var client = _factory.CreateClient();
        var pagina = await client.GetFromJsonAsync<PaginaDto<CursoResumoDto>>("/api/v1/cursos?pagina=1&tamanho=5");

        pagina.Should().NotBeNull();
        pagina!.Total.Should().Be(12);
        pagina.Pagina.Should().Be(1);
        pagina.Tamanho.Should().Be(5);
        pagina.Itens.Should().HaveCount(5);
        pagina.Facetas.Should().NotBeNull();
    }

    [Fact]
    public async Task Cursos_FiltroPorCategoria_DeveFuncionar()
    {
        var client = _factory.CreateClient();
        var pagina = await client.GetFromJsonAsync<PaginaDto<CursoResumoDto>>("/api/v1/cursos?categoria=tecnologia");

        pagina.Should().NotBeNull();
        pagina!.Itens.Should().OnlyContain(c => c.Categoria.Slug == "tecnologia");
        pagina.Itens.Should().NotBeEmpty();
    }

    [Fact]
    public async Task CursoPorSlug_DeveRetornarDetalheComModulos()
    {
        var client = _factory.CreateClient();
        var curso = await client.GetFromJsonAsync<CursoDetalheDto>("/api/v1/cursos/processo-seletivo-desenvolvedor-de-sistemas-i");

        curso.Should().NotBeNull();
        curso!.Slug.Should().Be("processo-seletivo-desenvolvedor-de-sistemas-i");
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
        var progresso = await client.GetFromJsonAsync<ProgressoCursoDto>("/api/v1/cursos/processo-seletivo-desenvolvedor-de-sistemas-i/progresso");

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

    [Fact]
    public async Task Cursos_PaginacaoInvalida_DeveSerNormalizada()
    {
        var client = _factory.CreateClient();
        var pagina = await client.GetFromJsonAsync<PaginaDto<CursoResumoDto>>("/api/v1/cursos?pagina=0&tamanho=999");

        pagina.Should().NotBeNull();
        pagina!.Pagina.Should().Be(1);
        pagina.Tamanho.Should().BeLessThanOrEqualTo(48);
    }

    [Fact]
    public async Task Cursos_FiltroInexistente_DeveRetornarListaVazia()
    {
        var client = _factory.CreateClient();
        var pagina = await client.GetFromJsonAsync<PaginaDto<CursoResumoDto>>("/api/v1/cursos?categoria=nao-existe");

        pagina.Should().NotBeNull();
        pagina!.Total.Should().Be(0);
        pagina.Itens.Should().BeEmpty();
    }

    [Fact]
    public async Task Turmas_DevemListarComModalidadeDiasHorario()
    {
        var client = _factory.CreateClient();
        var turmas = await client.GetFromJsonAsync<List<TurmaDto>>(
            "/api/v1/cursos/processo-seletivo-desenvolvedor-de-sistemas-i/turmas");

        turmas.Should().NotBeNull();
        turmas!.Should().HaveCountGreaterThanOrEqualTo(2);
        turmas.Should().Contain(t => t.Modalidade.Slug == "semi-presencial");
        turmas.Should().OnlyContain(t => !string.IsNullOrWhiteSpace(t.DiasSemana) && !string.IsNullOrWhiteSpace(t.HorarioInicio));
    }

    [Fact]
    public async Task Matricula_DeveCriarERecuperar()
    {
        var client = _factory.CreateClient();
        var usuarioId = $"aluno-{Guid.NewGuid():N}@teste.com";
        var turmas = await client.GetFromJsonAsync<List<TurmaDto>>(
            "/api/v1/cursos/processo-seletivo-desenvolvedor-de-sistemas-i/turmas");
        var turma = turmas!.First();

        var request = new CriarMatriculaRequest(
            "processo-seletivo-desenvolvedor-de-sistemas-i", turma.Id, usuarioId);
        var post = await client.PostAsJsonAsync("/api/v1/matriculas", request);
        post.StatusCode.Should().Be(HttpStatusCode.OK, await post.Content.ReadAsStringAsync());

        var criada = await post.Content.ReadFromJsonAsync<MatriculaDto>();
        criada.Should().NotBeNull();
        criada!.UsuarioId.Should().Be(usuarioId);
        criada.Turma.Id.Should().Be(turma.Id);
        criada.Curso.Slug.Should().Be("processo-seletivo-desenvolvedor-de-sistemas-i");

        var lista = await client.GetFromJsonAsync<List<MatriculaDto>>(
            $"/api/v1/matriculas?usuarioId={Uri.EscapeDataString(usuarioId)}");
        lista.Should().ContainSingle(m => m.Id == criada.Id);

        var repetida = await client.PostAsJsonAsync("/api/v1/matriculas", request);
        repetida.StatusCode.Should().Be(HttpStatusCode.OK);
        var mesma = await repetida.Content.ReadFromJsonAsync<MatriculaDto>();
        mesma!.Id.Should().Be(criada.Id);
    }

    [Fact]
    public async Task Cursos_CriarAtualizarExcluir_DevePersistirNaApi()
    {
        var client = _factory.CreateClient();
        var slug = $"curso-teste-{Guid.NewGuid():N}";
        var request = new CursoSalvarRequest(
            "Curso de Teste", "Curso Teste", slug,
            "Curso criado pelo teste de integração.", 12,
            "Alunos de teste", "/cursos/teste.svg", null, false,
            "tecnologia", "ead", "disponivel",
            new[] { new ModuloSalvarDto("Módulo único", null, new[] { "Aula única" }) });

        var post = await client.PostAsJsonAsync("/api/v1/cursos", request);
        post.StatusCode.Should().Be(HttpStatusCode.Created);
        var criado = await post.Content.ReadFromJsonAsync<CursoDetalheDto>();
        criado.Should().NotBeNull();
        criado!.Slug.Should().Be(slug);
        criado.Modulos.Should().ContainSingle();

        var atualizadoRequest = request with { NomeBreve = "Curso Teste Editado", Destaque = true };
        var put = await client.PutAsJsonAsync($"/api/v1/cursos/{slug}", atualizadoRequest);
        put.StatusCode.Should().Be(HttpStatusCode.OK);
        var atualizado = await put.Content.ReadFromJsonAsync<CursoDetalheDto>();
        atualizado!.NomeBreve.Should().Be("Curso Teste Editado");
        atualizado.Destaque.Should().BeTrue();

        var delete = await client.DeleteAsync($"/api/v1/cursos/{slug}");
        delete.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var get = await client.GetAsync($"/api/v1/cursos/{slug}");
        get.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Cors_DevePermitirOrigemVercel()
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/v1/cursos");
        request.Headers.Add("Origin", "https://frontend-ezequiel-reginos-projects.vercel.app");
        request.Headers.Add("Access-Control-Request-Method", "GET");

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        response.Headers.GetValues("Access-Control-Allow-Origin")
            .Should().ContainSingle("https://frontend-ezequiel-reginos-projects.vercel.app");
    }

    [Theory]
    [InlineData("http://localhost:5174")]
    [InlineData("http://127.0.0.1:5174")]
    public async Task Cors_DevePermitirPortaAlternativaDoFrontendLocal(string origem)
    {
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/v1/cursos");
        request.Headers.Add("Origin", origem);
        request.Headers.Add("Access-Control-Request-Method", "GET");

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        response.Headers.GetValues("Access-Control-Allow-Origin")
            .Should().ContainSingle(origem);
    }

    [Fact]
    public async Task ScormPacote_UploadLaunchConteudoEProgresso()
    {
        var client = _factory.CreateClient();
        var slug = $"scorm-teste-{Guid.NewGuid():N}";

        using var memoria = new MemoryStream();
        using (var zip = new ZipArchive(memoria, ZipArchiveMode.Create, leaveOpen: true))
        {
            var manifesto = zip.CreateEntry("imsmanifest.xml");
            await using (var escritor = new StreamWriter(manifesto.Open(), Encoding.UTF8))
            {
                await escritor.WriteAsync("""
                    <?xml version="1.0" encoding="UTF-8"?>
                    <manifest xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
                              xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
                              identifier="teste">
                      <metadata>
                        <schema>ADL SCORM</schema>
                        <schemaversion>1.2</schemaversion>
                      </metadata>
                      <organizations default="ORG">
                        <organization identifier="ORG">
                          <title>Curso de teste</title>
                          <item identifier="ITEM" identifierref="RES"><title>Início</title></item>
                        </organization>
                      </organizations>
                      <resources>
                        <resource identifier="RES" type="webcontent" adlcp:scormtype="sco" href="index.html">
                          <file href="index.html"/>
                        </resource>
                      </resources>
                    </manifest>
                    """);
            }

            var pagina = zip.CreateEntry("index.html");
            await using var html = new StreamWriter(pagina.Open(), Encoding.UTF8);
            await html.WriteAsync("<html><body>conteudo scorm de teste</body></html>");
        }

        memoria.Position = 0;
        using var formulario = new MultipartFormDataContent();
        using var arquivo = new ByteArrayContent(memoria.ToArray());
        arquivo.Headers.ContentType = new MediaTypeHeaderValue("application/zip");
        formulario.Add(arquivo, "arquivo", "curso-teste.zip");
        formulario.Add(new StringContent(slug), "cursoSlug");
        formulario.Add(new StringContent("1.2"), "versao");

        var upload = await client.PostAsync("/api/v1/scorm/pacotes", formulario);
        upload.StatusCode.Should().Be(HttpStatusCode.OK, await upload.Content.ReadAsStringAsync());

        var pacote = await upload.Content.ReadFromJsonAsync<ScormPacoteDto>();
        pacote.Should().NotBeNull();
        pacote!.CursoSlug.Should().Be(slug);
        pacote.Versao.Should().Be("1.2");
        pacote.EntryFile.Should().Be("index.html");

        var launch = await client.GetStringAsync($"/api/v1/scorm/pacotes/{pacote.Id}/launch?usuarioId=aluno");
        launch.Should().Contain("window.API").And.Contain("API_1484_11").And.Contain("/scorm/");

        var conteudo = await client.GetAsync(pacote.ConteudoUrl);
        conteudo.StatusCode.Should().Be(HttpStatusCode.OK);
        (await conteudo.Content.ReadAsStringAsync()).Should().Contain("conteudo scorm de teste");
        var download = await client.GetAsync($"/api/v1/scorm/pacotes/{pacote.Id}/download");
        download.StatusCode.Should().Be(HttpStatusCode.OK);
        download.Content.Headers.ContentType?.MediaType.Should().Be("application/zip");
        (await download.Content.ReadAsByteArrayAsync()).Should().Equal(memoria.ToArray());

        var primeiro = new SalvarProgressoScormRequest(
            slug, "aluno", "{\"pagina\":2}", "incomplete", "aula-2", null, 40, null);
        var commit = await client.PostAsJsonAsync("/api/v1/scorm/progresso", primeiro);
        commit.StatusCode.Should().Be(HttpStatusCode.OK, await commit.Content.ReadAsStringAsync());

        var segundo = primeiro with { Percentual = 20, LessonLocation = "aula-1" };
        (await client.PostAsJsonAsync("/api/v1/scorm/progresso", segundo)).StatusCode.Should().Be(HttpStatusCode.OK);

        var progresso = await client.GetFromJsonAsync<ProgressoScormDto>(
            $"/api/v1/scorm/progresso?cursoSlug={slug}&usuarioId=aluno");
        progresso.Should().NotBeNull();
        progresso!.Percentual.Should().Be(40);
        progresso.SuspendData.Should().Be("{\"pagina\":2}");
        progresso.LessonLocation.Should().Be("aula-1");

        var reinicio = await client.PostAsync(
            $"/api/v1/scorm/progresso/reiniciar?cursoSlug={slug}&usuarioId=aluno",
            content: null);
        reinicio.StatusCode.Should().Be(HttpStatusCode.OK, await reinicio.Content.ReadAsStringAsync());

        var checkpointLimpo = await client.GetFromJsonAsync<ProgressoScormDto>(
            $"/api/v1/scorm/progresso?cursoSlug={slug}&usuarioId=aluno");
        checkpointLimpo.Should().NotBeNull();
        checkpointLimpo!.Percentual.Should().Be(40);
        checkpointLimpo.SuspendData.Should().BeNull();
        checkpointLimpo.LessonLocation.Should().BeNull();
        checkpointLimpo.LessonStatus.Should().BeNull();
        checkpointLimpo.CmiDataJson.Should().BeNull();

        using var formularioSubstituto = new MultipartFormDataContent();
        using var arquivoSubstituto = new ByteArrayContent(memoria.ToArray());
        arquivoSubstituto.Headers.ContentType = new MediaTypeHeaderValue("application/zip");
        formularioSubstituto.Add(arquivoSubstituto, "arquivo", "curso-atualizado.zip");
        formularioSubstituto.Add(new StringContent(slug), "cursoSlug");
        formularioSubstituto.Add(new StringContent("1.2"), "versao");
        var substituicao = await client.PostAsync("/api/v1/scorm/pacotes", formularioSubstituto);
        substituicao.StatusCode.Should().Be(HttpStatusCode.OK);
        var pacoteSubstituto = await substituicao.Content.ReadFromJsonAsync<ScormPacoteDto>();
        pacoteSubstituto.Should().NotBeNull();
        pacoteSubstituto!.Id.Should().NotBe(pacote.Id);
        (await client.GetAsync($"/api/v1/scorm/pacotes/{pacote.Id}/download")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await client.GetFromJsonAsync<List<ScormPacoteDto>>("/api/v1/scorm/pacotes"))
            .Should().ContainSingle(item => item.CursoSlug == slug);
    }

    [Fact]
    public async Task ScormConfiguracoes_LimiteEPaginaDevemPersistirNoBackend()
    {
        var client = _factory.CreateClient();
        (await client.GetFromJsonAsync<ScormConfiguracaoDto>("/api/v1/scorm/configuracoes"))!
            .LimiteUploadMb.Should().Be(100);

        var limite = await client.PutAsJsonAsync(
            "/api/v1/scorm/configuracoes",
            new AtualizarLimiteScormRequest(50));
        limite.StatusCode.Should().Be(HttpStatusCode.OK);
        (await client.GetFromJsonAsync<ScormConfiguracaoDto>("/api/v1/scorm/configuracoes"))!
            .LimiteUploadMb.Should().Be(50);

        var limiteInvalido = await client.PutAsJsonAsync(
            "/api/v1/scorm/configuracoes",
            new AtualizarLimiteScormRequest(25));
        limiteInvalido.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await client.PutAsJsonAsync(
            "/api/v1/scorm/configuracoes",
            new AtualizarLimiteScormRequest(20))).StatusCode.Should().Be(HttpStatusCode.OK);
        using var formularioGrande = new MultipartFormDataContent();
        using var arquivoGrande = new ByteArrayContent(new byte[20 * 1024 * 1024 + 1]);
        formularioGrande.Add(arquivoGrande, "arquivo", "acima-do-limite.zip");
        formularioGrande.Add(new StringContent("curso-grande"), "cursoSlug");
        var uploadAcimaDoLimite = await client.PostAsync("/api/v1/scorm/pacotes", formularioGrande);
        uploadAcimaDoLimite.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await uploadAcimaDoLimite.Content.ReadAsStringAsync()).Should().Contain("limite configurado de 20 MB");

        var slug = $"pagina-scorm-{Guid.NewGuid():N}";
        var pagina = new ScormPaginaConfigDto(
            "Curso SCORM", "Subtítulo", "Sobre", "", "/capa.webp", 10, "Iniciar curso");
        (await client.GetAsync($"/api/v1/scorm/paginas/{slug}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        var salva = await client.PutAsJsonAsync($"/api/v1/scorm/paginas/{slug}", pagina);
        salva.StatusCode.Should().Be(HttpStatusCode.OK);
        (await client.GetFromJsonAsync<ScormPaginaConfigDto>($"/api/v1/scorm/paginas/{slug}"))
            .Should().BeEquivalentTo(pagina);
    }

    [Fact]
    public async Task ScormPacote_SemManifesto_DeveRetornar400()
    {
        var client = _factory.CreateClient();

        using var memoria = new MemoryStream();
        using (var zip = new ZipArchive(memoria, ZipArchiveMode.Create, leaveOpen: true))
        {
            var pagina = zip.CreateEntry("index.html");
            await using var html = new StreamWriter(pagina.Open(), Encoding.UTF8);
            await html.WriteAsync("<html></html>");
        }

        memoria.Position = 0;
        using var formulario = new MultipartFormDataContent();
        using var arquivo = new ByteArrayContent(memoria.ToArray());
        formulario.Add(arquivo, "arquivo", "sem-manifesto.zip");
        formulario.Add(new StringContent("curso-sem-manifesto"), "cursoSlug");

        var resposta = await client.PostAsync("/api/v1/scorm/pacotes", formulario);
        resposta.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
