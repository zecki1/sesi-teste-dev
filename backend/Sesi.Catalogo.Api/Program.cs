using Microsoft.AspNetCore.Mvc;
using Sesi.Catalogo.Domain.Abstractions;
using Sesi.Catalogo.Domain.Dtos;
using Sesi.Catalogo.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Configuração
builder.Services.AdicionarInfraestrutura(builder.Configuration);

// CORS
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173", "https://*.vercel.app"];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(corsOrigins)
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

v1.MapGet("/cursos/{slug}/progresso", async (string slug, [FromHeader(Name = "X-Usuario-Id")] string? usuarioId, ICatalogoRepositorio repo, CancellationToken ct) =>
{
    var progresso = await repo.ObterProgressoAsync(slug, usuarioId, ct);
    return progresso is null ? Results.NotFound() : Results.Ok(progresso);
})
.WithName("ObterProgressoCurso")
.WithSummary("Progresso agregado do aluno no curso")
.Produces<ProgressoCursoDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status404NotFound);

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

app.Run();

/// <summary>
/// Ponto de entrada para testes de integração.
/// </summary>
public partial class Program { }
