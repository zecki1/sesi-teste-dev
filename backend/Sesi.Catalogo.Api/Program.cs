using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using Sesi.Catalogo.Api.Dev;
using Sesi.Catalogo.Api.Gestao;
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
builder.Services.AddSingleton<GestaoArmazenamento>();
builder.Services.AddHttpClient<ResendEmailSender>(cliente => cliente.Timeout = TimeSpan.FromSeconds(10));
if (builder.Environment.IsDevelopment() &&
    !string.Equals(Environment.GetEnvironmentVariable("SESI_DEV_COORDINATOR"), "1", StringComparison.Ordinal))
{
    builder.Services.AddHostedService<FrontendDevServer>();
}

// CORS
// Development pode incluir previews; em produção a lista deve usar origens exatas.
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? (builder.Environment.IsDevelopment()
        ? [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "https://*.vercel.app"
        ]
        : ["https://frontend-ezequiel-reginos-projects.vercel.app"]);

if (!builder.Environment.IsDevelopment() && corsOrigins.Any(origem => origem.Contains('*')))
    throw new InvalidOperationException("Configure Cors:AllowedOrigins com origens exatas fora de Development.");

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

builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = builder.Environment.IsDevelopment() ? "sesi-admin" : "__Host-sesi-admin";
        options.Cookie.HttpOnly = true;
        options.Cookie.Path = "/";
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
        options.Cookie.SameSite = builder.Environment.IsDevelopment()
            ? SameSiteMode.Lax
            : SameSiteMode.None;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = contexto =>
        {
            contexto.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = contexto =>
        {
            contexto.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Administrador", policy =>
        policy.RequireAuthenticatedUser()
            .RequireRole("Administrador")
            .AddRequirements(new OrigemAdminRequirement(corsOrigins)));
});
builder.Services.AddSingleton<IAuthorizationHandler, OrigemAdminAuthorizationHandler>();

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

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Sesi.Catalogo.Api v1");
    c.RoutePrefix = "swagger";
});

app.UseCors();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// Health
app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }))
   .WithName("Health")
   .WithTags("Sistema")
   .WithOpenApi();

// V1 endpoints
var v1 = app.MapGroup("/api/v1").WithTags("Catálogo");

v1.MapPost("/chamados", async (
    [FromBody] CriarChamadoRequest request,
    GestaoArmazenamento armazenamento,
    ResendEmailSender emailSender,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(request.Nome) || request.Nome.Length > 120)
        return Results.BadRequest(new { erro = "Informe seu nome, com até 120 caracteres." });
    if (!ResendEmailSender.EmailValido(request.Email) || request.Email.Length > 254)
        return Results.BadRequest(new { erro = "Informe um e-mail válido." });
    if (request.Categoria is not ("Acesso" or "Curso" or "Conteúdo" or "Certificado" or "Outro"))
        return Results.BadRequest(new { erro = "Selecione uma categoria válida para o chamado." });
    if (string.IsNullOrWhiteSpace(request.Descricao) || request.Descricao.Trim().Length < 10 ||
        request.Descricao.Length > 4000)
        return Results.BadRequest(new { erro = "Descreva o problema com 10 a 4000 caracteres." });
    if (request.Pagina is null || request.Pagina.Length > 500)
        return Results.BadRequest(new { erro = "O endereço da página informado é muito longo." });
    var capturaTela = request.CapturaTela;
    if (!string.IsNullOrWhiteSpace(capturaTela))
    {
        const string prefixoCaptura = "data:image/jpeg;base64,";
        if (!capturaTela.StartsWith(prefixoCaptura, StringComparison.Ordinal) ||
            capturaTela.Length > 5_600_000)
            return Results.BadRequest(new { erro = "A captura deve ser uma imagem JPEG de até 4 MB." });

        try
        {
            var bytes = Convert.FromBase64String(capturaTela[prefixoCaptura.Length..]);
            if (bytes.Length > 4 * 1024 * 1024 ||
                bytes.Length < 3 ||
                bytes[0] != 0xFF ||
                bytes[1] != 0xD8 ||
                bytes[2] != 0xFF)
                return Results.BadRequest(new { erro = "A captura deve ser uma imagem JPEG de até 4 MB." });
        }
        catch (FormatException)
        {
            return Results.BadRequest(new { erro = "A captura de tela está em um formato inválido." });
        }
    }

    var chamado = await armazenamento.CriarChamadoAsync(request, ct);
    var envio = await emailSender.EnviarChamadoAsync(chamado, ct);
    return Results.Created($"/api/v1/chamados/{chamado.Id}", new
    {
        chamado,
        envio.SuporteEnviado,
        envio.AlunoEnviado,
        envio.Erro
    });
})
.WithName("CriarChamadoSuporte")
.WithSummary("Registra um chamado e tenta notificar o suporte e o aluno")
.Produces(StatusCodes.Status201Created)
.Produces(StatusCodes.Status400BadRequest);

var gestao = v1.MapGroup("/gestao").WithTags("Gestão");
if (!app.Environment.IsDevelopment())
    gestao.RequireAuthorization("Administrador");

gestao.MapPost("/sessao", async (
    [FromBody] AutenticarAlunoRequest request,
    HttpContext contexto,
    IConfiguration configuracao,
    GestaoArmazenamento armazenamento,
    IHostEnvironment ambiente,
    CancellationToken ct) =>
{
    var origens = configuracao.GetSection("Cors:AllowedOrigins").Get<string[]>()
        ?? ["https://frontend-ezequiel-reginos-projects.vercel.app"];
    var origem = contexto.Request.Headers.Origin.ToString();
    if (!ambiente.IsDevelopment() && !string.IsNullOrWhiteSpace(origem) &&
        !origens.Contains(origem, StringComparer.OrdinalIgnoreCase))
        return Results.Forbid();

    var emailAdmin = configuracao["Gestao:Admin:Email"] ?? "admin@sesindustria.com.br";
    var senhaAdmin = configuracao["Gestao:Admin:Senha"];
    if (string.IsNullOrWhiteSpace(senhaAdmin))
        return Results.Problem(
            "A autenticação administrativa não foi configurada no servidor.",
            statusCode: StatusCodes.Status503ServiceUnavailable);
    if (!ResendEmailSender.EmailValido(request.Email) ||
        request.Email.Length > 254 ||
        string.IsNullOrEmpty(request.Senha) ||
        request.Senha.Length > 128)
        return Results.BadRequest(new { erro = "Informe um e-mail e uma senha válidos." });

    var senhaInformadaHash = SHA256.HashData(Encoding.UTF8.GetBytes(request.Senha));
    var senhaConfiguradaHash = SHA256.HashData(Encoding.UTF8.GetBytes(senhaAdmin));
    if (!request.Email.Equals(emailAdmin, StringComparison.OrdinalIgnoreCase) ||
        !CryptographicOperations.FixedTimeEquals(senhaInformadaHash, senhaConfiguradaHash))
        return Results.Json(new { erro = "E-mail ou senha inválidos." }, statusCode: StatusCodes.Status401Unauthorized);

    var usuario = await armazenamento.ObterUsuarioPorEmailAsync(emailAdmin, ct);
    if (usuario is null || !usuario.Ativo || usuario.Papel != "Administrador")
        return Results.Json(new { erro = "A conta administrativa está inativa ou não está cadastrada." }, statusCode: StatusCodes.Status403Forbidden);

    var identidade = new ClaimsIdentity(
    [
        new Claim(ClaimTypes.NameIdentifier, usuario.Id),
        new Claim(ClaimTypes.Name, usuario.Nome),
        new Claim(ClaimTypes.Email, usuario.Email),
        new Claim(ClaimTypes.Role, usuario.Papel),
    ], CookieAuthenticationDefaults.AuthenticationScheme);
    await contexto.SignInAsync(
        CookieAuthenticationDefaults.AuthenticationScheme,
        new ClaimsPrincipal(identidade),
        new AuthenticationProperties { IsPersistent = false });
    return Results.Ok(usuario);
})
.AllowAnonymous()
.WithName("AutenticarAdministrador")
.WithSummary("Inicia uma sessão administrativa segura por cookie HttpOnly")
.Produces<UsuarioGestaoDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status401Unauthorized)
.Produces(StatusCodes.Status503ServiceUnavailable);

gestao.MapDelete("/sessao", async (HttpContext contexto) =>
{
    await contexto.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.NoContent();
})
.WithName("EncerrarSessaoAdministrador");

gestao.MapGet("/cursos", async (ICatalogoRepositorio repo, CancellationToken ct) =>
        Results.Ok(await repo.ListarCursosAdministracaoAsync(ct)))
    .WithName("ListarCursosAdministracao")
    .WithSummary("Lista cursos ativos em qualquer etapa de desenvolvimento para o admin local")
    .Produces<IReadOnlyList<CursoResumoDto>>(StatusCodes.Status200OK);

    gestao.MapPost("/usuarios/registro", async (
        [FromBody] RegistrarAlunoRequest request,
        GestaoArmazenamento armazenamento,
        CancellationToken ct) =>
    {
        if (string.IsNullOrWhiteSpace(request.Nome) || request.Nome.Length > 120)
            return Results.BadRequest(new { erro = "Informe um nome válido, com até 120 caracteres." });
        if (!ResendEmailSender.EmailValido(request.Email) || request.Email.Length > 254)
            return Results.BadRequest(new { erro = "Informe um e-mail válido." });
        if (!request.Email.Equals("admin@sesindustria.com.br", StringComparison.OrdinalIgnoreCase) &&
            !request.Email.Equals("aluno@teste.com", StringComparison.OrdinalIgnoreCase))
            return Results.BadRequest(new { erro = "O cadastro sem senha está reservado às contas de demonstração." });

        var usuario = await armazenamento.RegistrarAlunoAsync(request.Nome, request.Email, ct);
        return Results.Ok(usuario);
    })
    .WithName("RegistrarAlunoGestao")
    .WithSummary("Registra um aluno sem permitir que o cliente escolha o papel")
    .Produces<UsuarioGestaoDto>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status400BadRequest);

    gestao.MapPost("/usuarios/registro-com-senha", async (
        [FromBody] CriarContaAlunoRequest request,
        GestaoArmazenamento armazenamento,
        CancellationToken ct) =>
    {
        if (string.IsNullOrWhiteSpace(request.Nome) || request.Nome.Length > 120)
            return Results.BadRequest(new { erro = "Informe um nome válido, com até 120 caracteres." });
        if (!ResendEmailSender.EmailValido(request.Email) || request.Email.Length > 254)
            return Results.BadRequest(new { erro = "Informe um e-mail válido." });
        if (request.Senha.Length is < 8 or > 128)
            return Results.BadRequest(new { erro = "A senha deve ter entre 8 e 128 caracteres." });
        if (request.Email.Equals("admin@sesindustria.com.br", StringComparison.OrdinalIgnoreCase) ||
            request.Email.Equals("aluno@teste.com", StringComparison.OrdinalIgnoreCase))
            return Results.BadRequest(new { erro = "As contas de demonstração continuam sem senha." });

        try
        {
            var usuario = await armazenamento.CriarContaAlunoAsync(request.Nome, request.Email, request.Senha, ct);
            return Results.Ok(usuario);
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { erro = ex.Message });
        }
    })
    .WithName("CriarContaAlunoComSenha")
    .WithSummary("Cria uma conta de aluno com senha armazenada em hash")
    .Produces<UsuarioGestaoDto>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status400BadRequest)
    .Produces(StatusCodes.Status409Conflict)
    .AllowAnonymous();

    gestao.MapPost("/usuarios/autenticar", async (
        [FromBody] AutenticarAlunoRequest request,
        GestaoArmazenamento armazenamento,
        CancellationToken ct) =>
    {
        if (!ResendEmailSender.EmailValido(request.Email) || request.Email.Length > 254 ||
            string.IsNullOrEmpty(request.Senha) || request.Senha.Length > 128)
            return Results.BadRequest(new { erro = "Informe um e-mail e uma senha válidos." });

        var usuario = await armazenamento.AutenticarAlunoAsync(request.Email, request.Senha, ct);
        return usuario is null
            ? Results.Json(new { erro = "E-mail ou senha inválidos." }, statusCode: StatusCodes.Status401Unauthorized)
            : Results.Ok(usuario);
    })
    .WithName("AutenticarAluno")
    .WithSummary("Valida a senha de uma conta de aluno local")
    .Produces<UsuarioGestaoDto>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status400BadRequest)
    .Produces(StatusCodes.Status401Unauthorized)
    .AllowAnonymous();

    gestao.MapGet("/usuarios/perfil", async (
        [FromQuery] string email,
        GestaoArmazenamento armazenamento,
        CancellationToken ct) =>
    {
        if (!ResendEmailSender.EmailValido(email))
            return Results.BadRequest(new { erro = "Informe um e-mail válido." });
        var usuario = await armazenamento.ObterUsuarioPorEmailAsync(email, ct);
        return usuario is null ? Results.NotFound() : Results.Ok(usuario);
    })
    .WithName("ObterUsuarioGestaoPorEmail");

    gestao.MapGet("/usuarios", async (GestaoArmazenamento armazenamento, CancellationToken ct) =>
        Results.Ok(await armazenamento.ListarUsuariosAsync(ct)))
        .WithName("ListarUsuariosGestao");

    gestao.MapPost("/usuarios", async (
        [FromBody] SalvarUsuarioGestaoRequest request,
        GestaoArmazenamento armazenamento,
        CancellationToken ct) =>
    {
        if (string.IsNullOrWhiteSpace(request.Nome) || request.Nome.Length > 120)
            return Results.BadRequest(new { erro = "Informe um nome válido, com até 120 caracteres." });
        if (!ResendEmailSender.EmailValido(request.Email) || request.Email.Length > 254)
            return Results.BadRequest(new { erro = "Informe um e-mail válido." });
        if (!GestaoArmazenamento.Papeis.Contains(request.Papel, StringComparer.Ordinal))
            return Results.BadRequest(new { erro = "Selecione um papel válido." });

        try
        {
            return Results.Created("/api/v1/gestao/usuarios", await armazenamento.SalvarUsuarioAsync(request, null, ct));
        }
        catch (InvalidOperationException ex)
        {
            return ErroValidacao(ex);
        }
    })
    .WithName("CriarUsuarioGestao");

    gestao.MapPut("/usuarios/{id}", async (
        string id,
        [FromBody] SalvarUsuarioGestaoRequest request,
        GestaoArmazenamento armazenamento,
        IConfiguration configuracao,
        CancellationToken ct) =>
    {
        if (string.IsNullOrWhiteSpace(request.Nome) || request.Nome.Length > 120)
            return Results.BadRequest(new { erro = "Informe um nome válido, com até 120 caracteres." });
        if (!ResendEmailSender.EmailValido(request.Email) || request.Email.Length > 254)
            return Results.BadRequest(new { erro = "Informe um e-mail válido." });
        if (!GestaoArmazenamento.Papeis.Contains(request.Papel, StringComparer.Ordinal))
            return Results.BadRequest(new { erro = "Selecione um papel válido." });
        var adminEmail = configuracao["Gestao:Admin:Email"] ?? "admin@sesindustria.com.br";
        var contaAdmin = await armazenamento.ObterUsuarioPorEmailAsync(adminEmail, ct);
        if (contaAdmin?.Id == id &&
            (!request.Email.Equals(adminEmail, StringComparison.OrdinalIgnoreCase) ||
             request.Papel != "Administrador" ||
             !request.Ativo))
            return Results.BadRequest(new { erro = "A conta administrativa configurada não pode ser desativada, removida ou rebaixada." });

        try
        {
            return Results.Ok(await armazenamento.SalvarUsuarioAsync(request, id, ct));
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return ErroValidacao(ex);
        }
    })
    .WithName("AtualizarUsuarioGestao");

    gestao.MapDelete("/usuarios/{id}", async (
        string id,
        GestaoArmazenamento armazenamento,
        IConfiguration configuracao,
        CancellationToken ct) =>
    {
        var adminEmail = configuracao["Gestao:Admin:Email"] ?? "admin@sesindustria.com.br";
        var contaAdmin = await armazenamento.ObterUsuarioPorEmailAsync(adminEmail, ct);
        if (contaAdmin?.Id == id)
            return Results.BadRequest(new { erro = "A conta administrativa configurada não pode ser desativada, removida ou rebaixada." });

        try
        {
            return await armazenamento.ExcluirUsuarioAsync(id, ct) ? Results.NoContent() : Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return ErroValidacao(ex);
        }
    })
    .WithName("ExcluirUsuarioGestao");

    gestao.MapGet("/permissoes", async (GestaoArmazenamento armazenamento, CancellationToken ct) =>
        Results.Ok(await armazenamento.ObterPermissoesAsync(ct)))
        .WithName("ObterPermissoesGestao");

    gestao.MapPut("/permissoes", async (
        [FromBody] IReadOnlyList<PermissaoPapelDto>? permissoes,
        GestaoArmazenamento armazenamento,
        CancellationToken ct) =>
    {
        if (permissoes is null ||
            permissoes.Count != GestaoArmazenamento.Papeis.Length ||
            permissoes.Select(p => p.Papel).Distinct(StringComparer.Ordinal).Count() != GestaoArmazenamento.Papeis.Length ||
            !GestaoArmazenamento.Papeis.All(papel => permissoes.Any(p => p.Papel == papel)))
            return Results.BadRequest(new { erro = "Envie uma permissão para cada um dos oito papéis." });

        var convidado = permissoes.Single(p => p.Papel == "Convidado");
        if (convidado.Criar || convidado.Editar || convidado.Excluir)
            return Results.BadRequest(new { erro = "O papel Convidado só pode visualizar conteúdo público." });

        await armazenamento.SalvarPermissoesAsync(permissoes, ct);
        return Results.Ok(permissoes);
    })
    .WithName("SalvarPermissoesGestao");

    gestao.MapGet("/chamados", async (GestaoArmazenamento armazenamento, CancellationToken ct) =>
        Results.Ok(await armazenamento.ListarChamadosAsync(null, ct)))
        .WithName("ListarChamadosGestao");

    gestao.MapPut("/chamados/{id}", async (
        string id,
        [FromBody] AtualizarChamadoRequest request,
        GestaoArmazenamento armazenamento,
        CancellationToken ct) =>
    {
        if (request.Status is not ("Aberto" or "Em atendimento" or "Resolvido"))
            return Results.BadRequest(new { erro = "Selecione um status válido para o chamado." });
        var atualizado = await armazenamento.AtualizarChamadoAsync(id, request, ct);
        return atualizado is null ? Results.NotFound() : Results.Ok(atualizado);
    })
    .WithName("AtualizarChamadoGestao");

    gestao.MapGet("/marcos", async (
        [FromQuery] string usuarioId,
        GestaoArmazenamento armazenamento,
        CancellationToken ct) =>
    {
        if (string.IsNullOrWhiteSpace(usuarioId))
            return Results.BadRequest(new { erro = "usuarioId é obrigatório." });
        return Results.Ok(await armazenamento.ObterMarcosCursoAsync(usuarioId, ct));
    })
    .WithName("ListarMarcosCurso");

    gestao.MapPost("/marcos", async (
        [FromBody] AtualizarMarcoCursoRequest request,
        ICatalogoRepositorio repo,
        GestaoArmazenamento armazenamento,
        ScormArmazenamento scorm,
        CancellationToken ct) =>
    {
        if (string.IsNullOrWhiteSpace(request.CursoSlug) || string.IsNullOrWhiteSpace(request.UsuarioId))
            return Results.BadRequest(new { erro = "Curso e usuário são obrigatórios para registrar um marco." });
        if (request.Marco is not ("inicio" or "conclusao"))
            return Results.BadRequest(new { erro = "Marco deve ser 'inicio' ou 'conclusao'." });
        if (request.Percentual is < 0 or > 100)
            return Results.BadRequest(new { erro = "O percentual do curso deve estar entre 0 e 100." });

        var curso = await repo.ObterCursoPorSlugAsync(request.CursoSlug, ct);
        if (curso is null) return Results.NotFound(new { erro = "Curso não encontrado." });
        if (request.Marco == "conclusao")
        {
            var pacote = await scorm.ObterPorCursoAsync(request.CursoSlug, ct);
            var progresso = pacote is null
                ? null
                : await scorm.ObterProgressoAsync(request.CursoSlug, request.UsuarioId, ct);
            var percentual = pacote is null ? request.Percentual : progresso?.Percentual ?? 0;
            var status = progresso?.LessonStatus?.ToLowerInvariant();
            var concluido = status is "completed" or "passed" or "complete" ||
                            (status != "failed" && percentual >= 100);
            if (!concluido)
                return Results.BadRequest(new { erro = "O conteúdo do curso ainda não foi concluído." });
        }

        return Results.Ok(await armazenamento.RegistrarMarcoCursoAsync(request, ct));
    })
    .WithName("RegistrarMarcoCurso");

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

var adminV1 = v1.MapGroup("");
if (!app.Environment.IsDevelopment())
    adminV1.RequireAuthorization("Administrador");

adminV1.MapPost("/cursos", async ([FromBody] CursoSalvarRequest request, ICatalogoRepositorio repo, CancellationToken ct) =>
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
.WithSummary("Cria um curso e define sua etapa de desenvolvimento e oferta")
.Produces<CursoDetalheDto>(StatusCodes.Status201Created)
.Produces(StatusCodes.Status400BadRequest);

adminV1.MapPut("/cursos/{slug}", async (string slug, [FromBody] CursoSalvarRequest request, ICatalogoRepositorio repo, CancellationToken ct) =>
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

adminV1.MapDelete("/cursos/{slug}", async (string slug, ICatalogoRepositorio repo, CancellationToken ct) =>
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
adminV1.MapGet("/scorm/configuracoes", async (ScormArmazenamento armazenamento, CancellationToken ct) =>
{
    var configuracao = await armazenamento.ObterConfiguracaoAsync(ct);
    return Results.Ok(configuracao);
})
.WithName("ObterConfiguracaoScorm")
.WithSummary("Obtém o limite configurado para pacotes SCORM")
.Produces<ScormConfiguracaoDto>(StatusCodes.Status200OK);

adminV1.MapPut("/scorm/configuracoes", async (
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
    return configuracao is null ? Results.NoContent() : Results.Ok(configuracao);
})
.WithName("ObterConfiguracaoPaginaScorm")
.WithSummary("Obtém a configuração persistida da página pública SCORM")
.Produces<ScormPaginaConfigDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status204NoContent);

adminV1.MapPut("/scorm/paginas/{cursoSlug}", async (
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

adminV1.MapPost("/scorm/pacotes", async (HttpRequest request, ScormArmazenamento armazenamento, CancellationToken ct) =>
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
    return pacote is null ? Results.NoContent() : Results.Ok(pacote);
})
.WithName("ObterPacoteScorm")
.WithSummary("Obtém o pacote SCORM publicado para um curso")
.Produces<ScormPacoteDto>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status204NoContent);

adminV1.MapGet("/scorm/pacotes", async (ScormArmazenamento armazenamento, CancellationToken ct) =>
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

adminV1.MapGet("/scorm/pacotes/{id}/download", async (
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

adminV1.MapDelete("/scorm/pacotes/{cursoSlug}", async (string cursoSlug, ScormArmazenamento armazenamento, CancellationToken ct) =>
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
