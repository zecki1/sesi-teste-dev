using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace Sesi.Catalogo.Api.Gestao;

public sealed class OrigemAdminRequirement(IReadOnlyCollection<string> origens) : IAuthorizationRequirement
{
    public IReadOnlyCollection<string> Origens { get; } = origens;
}

public sealed class OrigemAdminAuthorizationHandler : AuthorizationHandler<OrigemAdminRequirement>
{
    private readonly GestaoArmazenamento _armazenamento;

    public OrigemAdminAuthorizationHandler(GestaoArmazenamento armazenamento)
    {
        _armazenamento = armazenamento;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        OrigemAdminRequirement requirement)
    {
        if (context.Resource is not HttpContext httpContext)
            return;

        var origem = httpContext.Request.Headers.Origin.ToString();
        if (!string.IsNullOrWhiteSpace(origem) &&
            !requirement.Origens.Contains(origem, StringComparer.OrdinalIgnoreCase))
            return;

        var email = context.User.FindFirstValue(ClaimTypes.Email);
        var usuarioId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(usuarioId))
            return;

        var usuario = await _armazenamento.ObterUsuarioPorEmailAsync(
            email,
            httpContext.RequestAborted);
        if (usuario is { Ativo: true, Papel: "Administrador" } && usuario.Id == usuarioId)
            context.Succeed(requirement);
    }
}
