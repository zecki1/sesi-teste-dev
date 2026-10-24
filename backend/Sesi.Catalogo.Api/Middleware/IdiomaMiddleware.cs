namespace Sesi.Catalogo.Api.Middleware;

/// <summary>
/// Resolve o idioma da requisição e disponibiliza em <see cref="HttpContext.Items"/>.
/// Precedência: query `lang`, cabeçalho `X-Language` e `Accept-Language`.
/// </summary>
public sealed class IdiomaMiddleware(RequestDelegate next)
{
    public const string Chave = "Idioma";

    public async Task InvokeAsync(HttpContext contexto)
    {
        contexto.Items[Chave] = Normalizar(ObterIdiomaBruto(contexto));
        await next(contexto);
    }

    private static string? ObterIdiomaBruto(HttpContext contexto)
    {
        var porQuery = contexto.Request.Query["lang"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(porQuery)) return porQuery;

        var porCabecalho = contexto.Request.Headers["X-Language"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(porCabecalho)) return porCabecalho;

        return contexto.Request.Headers.AcceptLanguage.FirstOrDefault();
    }

    private static string Normalizar(string? valor)
    {
        if (string.IsNullOrWhiteSpace(valor)) return "pt-BR";

        // Accept-Language pode vir como "en-US,en;q=0.9"; usa o primeiro item.
        var idioma = valor.Split(',')[0].Split(';')[0].Trim().Replace('_', '-');

        if (idioma.StartsWith("en", StringComparison.OrdinalIgnoreCase)) return "en-US";
        if (idioma.StartsWith("es", StringComparison.OrdinalIgnoreCase)) return "es-ES";
        return "pt-BR";
    }
}
