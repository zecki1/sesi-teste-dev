using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using Sesi.Catalogo.Api.Scorm;
using Sesi.Catalogo.Domain.Abstractions;
using Sesi.Catalogo.Domain.Dtos;
using Sesi.Catalogo.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Configuração
builder.Services.AdicionarInfraestrutura(builder.Configuration);

// Reserva espaço para os metadados multipart além do limite configurável de 200 MB.
builder.WebHost.ConfigureKestrel(opcoes =>
    opcoes.Limits.MaxRequestBodySize = 205 * 1024 * 1024);
builder.Services.Configure<FormOptions>(opcoes =>
    opcoes.MultipartBodyLengthLimit = 205 * 1024 * 1024);
builder.Services.AddSingleton<ScormArmazenamento>();

// CORS
// WithOrigins não aceita curingas, por isso a comparação é feita manualmente
// (ex.: "https://*.vercel.app" cobre produção e previews da Vercel).
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://*.vercel.app"
    ];

static IResult ErroValidacao(InvalidOperationException ex) =>
    Results.BadRequest(new { erro = ex.Message });

static bool OrigemPermitida(string origem, string[] padroes) =>
    padroes.Any(padrao =>
    {
        if (!padrao.Contains('*'))
            return string.Equals(padrao.TrimEnd('/'), origem.TrimEnd('/'), StringComparison.OrdinalIgnoreCase);

        var regex = "^" + Regex.Escape(padrao).Replace("\\*", ".*") + "$";
        return Regex.IsMatch(origem, regex, RegexOptions.IgnoreCase);
    });

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(origem => OrigemPermitida(origem, corsOrigins))
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new()
    {
        Title = "Sesi.Catalogo.Api",
        Version = "v1",
        Description = "API REST do Catálogo de Cursos SESI Indústria - Fase 1 (Domain + API + DB + Swagger)."
    });
});

// ProblemDetails
builder.Services.AddProblemDetails();

var app = builder.Build();

// Inicializa banco (SQLite local ou PostgreSQL)
await app.Services.InicializarBancoAsync();

// Pipeline
app.UseExceptionHandler();
app.UseStatusCodePages();

// Conteúdo dos pacotes SCORM extraídos (mesma origem do wrapper/player).
var armazenamentoScorm = app.Services.GetRequiredService<ScormArmazenamento>();
var tiposConteudo = new FileExtensionContentTypeProvider();
tiposConteudo.Mappings[".woff2"] = "font/woff2";
tiposConteudo.Mappings[".woff"] = "font/woff";
tiposConteudo.Mappings[".json"] = "application/json";
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(armazenamentoScorm.RaizPublica),
    RequestPath = "/scorm",
    ContentTypeProvider = tiposConteudo,
    ServeUnknownFileTypes = true,
    DefaultContentType = "application/octet-stream",
});

if (app.Environment.IsDevelopment() || app.Environment.IsStaging())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Sesi.Catalogo.Api v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseCors();
app.UseHttpsRedirection();

// Health
app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }))
   .WithName("Health")
   .WithTags("Sistema")
   .WithOpenApi();

// V1 endpoints
var v1 = app.MapGroup("/api/v1").WithTags("Catálogo");

v1.MapGet("/facetas", async (ICatalogoRepositorio repo, CancellationToken ct) =>
{
    var facetas = await repo.ObterFacetasAsync(ct);
    return Results.Ok(facetas);
})
.WithName("ObterFacetas")
.WithSummary("Facetas disponíveis para filtros")
.Produces<FacetasDto>(StatusCodes.Status200OK);

v1.MapGet("/cursos", async ([AsParameters] CursoFiltro filtro, ICatalogoRepositorio repo, CancellationToken ct) =>
{
    var resultado = await repo.ListarCursosAsync(filtro, ct);
    return Results.Ok(resultado);
})
.WithName("ListarCursos")
.WithSummary("Lista cursos paginados com filtros e facetas")
.Produces<PaginaDto<CursoResumoDto>>(StatusCodes.Status200OK);

v1.MapGet("/cursos/{slug}", async (string slug, ICatalogoRepositorio repo, CancellationToken ct) =>
{
    var curso = await repo.ObterCursoPorSlugAsync(slug, ct);
    return curso is null ? Results.NotFound() : Results.Ok(curso);
})
.WithName("ObterCursoPorSlug")
.WithSummary("Detalhe do curso por slug (módulos e aulas)")
.Produces<CursoDetalheDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status404NotFound);

v1.MapGet("/cursos/{slug}/turmas", async (string slug, ICatalogoRepositorio repo, CancellationToken ct) =>
{
    var turmas = await repo.ListarTurmasAsync(slug, ct);
    return Results.Ok(turmas);
})
.WithName("ListarTurmasDoCurso")
.WithSummary("Turmas ativas do curso com data, dias, horário e modalidade")
.Produces<IReadOnlyList<TurmaDto>>(StatusCodes.Status200OK);

v1.MapPost("/cursos", async ([FromBody] CursoSalvarRequest request, ICatalogoRepositorio repo, CancellationToken ct) =>
{
    try
    {
        var curso = await repo.CriarCursoAsync(request, ct);
        return Results.Created($"/api/v1/cursos/{curso.Slug}", curso);
    }
    catch (InvalidOperationException ex)
    {
        return ErroValidacao(ex);
    }
})
.WithName("CriarCurso")
.WithSummary("Cria um curso no catálogo")
.Produces<CursoDetalheDto>(StatusCodes.Status201Created)
.Produces(StatusCodes.Status400BadRequest);

v1.MapPut("/cursos/{slug}", async (string slug, [FromBody] CursoSalvarRequest request, ICatalogoRepositorio repo, CancellationToken ct) =>
{
    try
    {
        var curso = await repo.AtualizarCursoAsync(slug, request, ct);
        return curso is null ? Results.NotFound() : Results.Ok(curso);
    }
    catch (InvalidOperationException ex)
    {
        return ErroValidacao(ex);
    }
})
.WithName("AtualizarCurso")
.WithSummary("Atualiza os metadados de um curso")
.Produces<CursoDetalheDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status400BadRequest)
.Produces(StatusCodes.Status404NotFound);

v1.MapDelete("/cursos/{slug}", async (string slug, ICatalogoRepositorio repo, CancellationToken ct) =>
{
    var removido = await repo.ExcluirCursoAsync(slug, ct);
    return removido ? Results.NoContent() : Results.NotFound();
})
.WithName("ExcluirCurso")
.WithSummary("Desativa um curso do catálogo")
.Produces(StatusCodes.Status204NoContent)
.Produces(StatusCodes.Status404NotFound);

v1.MapGet("/cursos/{slug}/progresso", async (string slug, [FromHeader(Name = "X-Usuario-Id")] string? usuarioId, ICatalogoRepositorio repo, CancellationToken ct) =>
{
    var progresso = await repo.ObterProgressoAsync(slug, usuarioId, ct);
    return progresso is null ? Results.NotFound() : Results.Ok(progresso);
})
.WithName("ObterProgressoCurso")
.WithSummary("Progresso agregado do aluno no curso")
.Produces<ProgressoCursoDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status404NotFound);

v1.MapPost("/matriculas", async ([FromBody] CriarMatriculaRequest request, ICatalogoRepositorio repo, CancellationToken ct) =>
{
    try
    {
        var matricula = await repo.CriarMatriculaAsync(request, ct);
        return Results.Ok(matricula);
    }
    catch (InvalidOperationException ex)
    {
        return ErroValidacao(ex);
    }
})
.WithName("CriarMatricula")
.WithSummary("Matricula o aluno em uma turma")
.Produces<MatriculaDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status400BadRequest);

v1.MapGet("/matriculas", async ([FromQuery] string usuarioId, ICatalogoRepositorio repo, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(usuarioId))
        return Results.BadRequest(new { erro = "usuarioId é obrigatório." });

    var matriculas = await repo.ListarMatriculasAsync(usuarioId, ct);
    return Results.Ok(matriculas);
})
.WithName("ListarMatriculas")
.WithSummary("Lista as matrículas do aluno")
.Produces<IReadOnlyList<MatriculaDto>>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status400BadRequest);

v1.MapPost("/sessoes-scorm", async ([FromBody] CommitScormRequest request, ICatalogoRepositorio repo, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(request.SessaoId))
        return Results.BadRequest(new { erro = "SessaoId é obrigatório." });
    if (request.AulaScormId <= 0)
        return Results.BadRequest(new { erro = "AulaScormId inválido." });

    var resultado = await repo.SalvarCommitScormAsync(request, ct);
    return Results.Ok(resultado);
})
.WithName("SalvarCommitScorm")
.WithSummary("Persiste commit SCORM e retorna estado da sessão")
.Produces<SessaoScormDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status400BadRequest);

v1.MapGet("/sessoes-scorm", async ([FromQuery] string sessaoId, ICatalogoRepositorio repo, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(sessaoId))
        return Results.BadRequest(new { erro = "sessaoId é obrigatório." });

    var sessao = await repo.ObterSessaoScormAsync(sessaoId, ct);
    return sessao is null ? Results.NotFound() : Results.Ok(sessao);
})
.WithName("ObterSessaoScorm")
.WithSummary("Recupera estado atual da sessão SCORM")
.Produces<SessaoScormDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status400BadRequest)
.Produces(StatusCodes.Status404NotFound);

// SCORM: upload do pacote, player e progresso persistente
v1.MapGet("/scorm/configuracoes", async (ScormArmazenamento armazenamento, CancellationToken ct) =>
{
    var configuracao = await armazenamento.ObterConfiguracaoAsync(ct);
    return Results.Ok(configuracao);
})
.WithName("ObterConfiguracaoScorm")
.WithSummary("Obtém o limite configurado para pacotes SCORM")
.Produces<ScormConfiguracaoDto>(StatusCodes.Status200OK);

v1.MapPut("/scorm/configuracoes", async (
    [FromBody] AtualizarLimiteScormRequest? request,
    ScormArmazenamento armazenamento,
    CancellationToken ct) =>
{
    if (request is null)
        return Results.BadRequest(new { erro = "Informe o limite de upload SCORM." });

    try
    {
        var configuracao = await armazenamento.AtualizarConfiguracaoAsync(request, ct);
        return Results.Ok(configuracao);
    }
    catch (InvalidOperationException ex)
    {
        return ErroValidacao(ex);
    }
})
.WithName("AtualizarConfiguracaoScorm")
.WithSummary("Atualiza o limite de upload SCORM (20, 50, 80, 100 ou 200 MB)")
.Produces<ScormConfiguracaoDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status400BadRequest);

v1.MapGet("/scorm/paginas/{cursoSlug}", async (
    string cursoSlug,
    ScormArmazenamento armazenamento,
    CancellationToken ct) =>
{
    var configuracao = await armazenamento.ObterConfiguracaoPaginaAsync(cursoSlug, ct);
    return configuracao is null ? Results.NotFound() : Results.Ok(configuracao);
})
.WithName("ObterConfiguracaoPaginaScorm")
.WithSummary("Obtém a configuração persistida da página pública SCORM")
.Produces<ScormPaginaConfigDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status404NotFound);

v1.MapPut("/scorm/paginas/{cursoSlug}", async (
    string cursoSlug,
    [FromBody] ScormPaginaConfigDto? configuracao,
    ScormArmazenamento armazenamento,
    CancellationToken ct) =>
{
    if (configuracao is null)
        return Results.BadRequest(new { erro = "Informe os dados da página SCORM." });

    try
    {
        var salva = await armazenamento.SalvarConfiguracaoPaginaAsync(cursoSlug, configuracao, ct);
        return Results.Ok(salva);
    }
    catch (InvalidOperationException ex)
    {
        return ErroValidacao(ex);
    }
})
.WithName("SalvarConfiguracaoPaginaScorm")
.WithSummary("Salva a configuração pública da página SCORM")
.Produces<ScormPaginaConfigDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status400BadRequest);

v1.MapPost("/scorm/pacotes", async (HttpRequest request, ScormArmazenamento armazenamento, CancellationToken ct) =>
{
    if (!request.HasFormContentType)
        return Results.BadRequest(new { erro = "Envie o pacote como multipart/form-data." });

    var form = await request.ReadFormAsync(ct);
    var arquivo = form.Files.GetFile("arquivo") ?? form.Files.FirstOrDefault();
    var cursoSlug = form["cursoSlug"].ToString();
    var versao = form["versao"].ToString();

    if (arquivo is null || arquivo.Length == 0)
        return Results.BadRequest(new { erro = "Anexe o arquivo .zip do pacote SCORM." });
    if (string.IsNullOrWhiteSpace(cursoSlug))
        return Results.BadRequest(new { erro = "cursoSlug é obrigatório." });

    try
    {
        await using var stream = arquivo.OpenReadStream();
        var pacote = await armazenamento.SalvarAsync(
            cursoSlug,
            arquivo.FileName,
            arquivo.Length,
            stream,
            string.IsNullOrWhiteSpace(versao) ? null : versao,
            ct);

        return Results.Ok(pacote);
    }
    catch (InvalidOperationException ex)
    {
        return ErroValidacao(ex);
    }
})
.DisableAntiforgery()
.WithName("EnviarPacoteScorm")
.WithSummary("Envia e extrai um pacote SCORM .zip")
.Produces<ScormPacoteDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status400BadRequest);

v1.MapGet("/scorm/pacotes/{cursoSlug}", async (string cursoSlug, ScormArmazenamento armazenamento, CancellationToken ct) =>
{
    var pacote = await armazenamento.ObterPorCursoAsync(cursoSlug, ct);
    return pacote is null ? Results.NotFound() : Results.Ok(pacote);
})
.WithName("ObterPacoteScorm")
.WithSummary("Obtém o pacote SCORM publicado para um curso")
.Produces<ScormPacoteDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status404NotFound);

v1.MapGet("/scorm/pacotes", async (ScormArmazenamento armazenamento, CancellationToken ct) =>
    Results.Ok(await armazenamento.ListarPacotesAsync(ct)))
.WithName("ListarPacotesScorm")
.WithSummary("Lista os pacotes SCORM ativos para identificação dos cursos no admin")
.Produces<IReadOnlyList<ScormPacoteDto>>(StatusCodes.Status200OK);

v1.MapGet("/scorm/pacotes/{id}/launch", async (string id, string? usuarioId, ScormArmazenamento armazenamento, CancellationToken ct) =>
{
    var pacote = await armazenamento.ObterPorIdAsync(id, ct);
    if (pacote is null) return Results.NotFound();

    var aluno = string.IsNullOrWhiteSpace(usuarioId) ? "anonimo" : usuarioId.Trim();
    var totalAulas = await armazenamento.ObterQuantidadeAulasAsync(pacote, ct);
    return Results.Content(ScormWrapper.GerarHtml(pacote, aluno, totalAulas), "text/html; charset=utf-8");
})
.WithName("AbrirPlayerScorm")
.WithSummary("Player SCORM com API 1.2/2004 e retomada de progresso");

v1.MapGet("/scorm/pacotes/{id}/download", async (
    string id,
    ScormArmazenamento armazenamento,
    CancellationToken ct) =>
{
    var caminho = await armazenamento.ObterCaminhoDownloadAsync(id, ct);
    if (caminho is null) return Results.NotFound();

    var pacote = await armazenamento.ObterPorIdAsync(id, ct);
    return pacote is null
        ? Results.NotFound()
        : Results.File(caminho, "application/zip", Path.GetFileName(pacote.NomeArquivo), enableRangeProcessing: true);
})
.WithName("BaixarPacoteScorm")
.WithSummary("Baixa o ZIP original do pacote SCORM ativo")
.Produces(StatusCodes.Status200OK)
.Produces(StatusCodes.Status404NotFound);

v1.MapDelete("/scorm/pacotes/{cursoSlug}", async (string cursoSlug, ScormArmazenamento armazenamento, CancellationToken ct) =>
{
    var removido = await armazenamento.ExcluirAsync(cursoSlug, ct);
    return removido ? Results.NoContent() : Results.NotFound();
})
.WithName("ExcluirPacoteScorm")
.WithSummary("Remove o pacote SCORM de um curso")
.Produces(StatusCodes.Status204NoContent)
.Produces(StatusCodes.Status404NotFound);

v1.MapGet("/scorm/progresso", async (
    [FromQuery] string cursoSlug,
    [FromQuery] string usuarioId,
    ScormArmazenamento armazenamento,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(cursoSlug) || string.IsNullOrWhiteSpace(usuarioId))
        return Results.BadRequest(new { erro = "cursoSlug e usuarioId são obrigatórios." });

    var pacote = await armazenamento.ObterPorCursoAsync(cursoSlug, ct);
    var totalAulas = pacote is null ? 0 : await armazenamento.ObterQuantidadeAulasAsync(pacote, ct);
    var progresso = await armazenamento.ObterProgressoAsync(cursoSlug, usuarioId, ct, totalAulas);
    return progresso is null ? Results.NoContent() : Results.Ok(progresso);
})
.WithName("ObterProgressoScorm")
.WithSummary("Recupera o progresso SCORM de um aluno")
.Produces<ProgressoScormDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status204NoContent);

v1.MapPost("/scorm/progresso", async (
    [FromBody] SalvarProgressoScormRequest request,
    ScormArmazenamento armazenamento,
    CancellationToken ct) =>
{
    try
    {
        var progresso = await armazenamento.SalvarProgressoAsync(request, ct);
        return Results.Ok(progresso);
    }
    catch (InvalidOperationException ex)
    {
        return ErroValidacao(ex);
    }
})
.WithName("SalvarProgressoScorm")
.WithSummary("Persiste o commit SCORM (progresso nunca regride)")
.Produces<ProgressoScormDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status400BadRequest);

v1.MapPost("/scorm/progresso/reiniciar", async (
    [FromQuery] string cursoSlug,
    [FromQuery] string usuarioId,
    ScormArmazenamento armazenamento,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(cursoSlug) || string.IsNullOrWhiteSpace(usuarioId))
        return Results.BadRequest(new { erro = "cursoSlug e usuarioId são obrigatórios." });

    var progresso = await armazenamento.ReiniciarProgressoAsync(cursoSlug, usuarioId, ct);
    return progresso is null ? Results.NotFound() : Results.Ok(progresso);
})
.WithName("ReiniciarProgressoScorm")
.WithSummary("Limpa o checkpoint SCORM para iniciar do começo sem reduzir o progresso máximo")
.Produces<ProgressoScormDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status400BadRequest)
.Produces(StatusCodes.Status404NotFound);

app.Run();

/// <summary>
/// Ponto de entrada para testes de integração.
/// </summary>
public partial class Program { }
