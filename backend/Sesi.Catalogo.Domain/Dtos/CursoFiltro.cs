namespace Sesi.Catalogo.Domain.Dtos;

/// <summary>
/// Filtros de consulta do catálogo.
/// </summary>
public record CursoFiltro(
    string? Busca = null,
    string? Categoria = null,
    string? Modalidade = null,
    string? Status = null,
    string? Ordenar = null,
    bool? Destaque = null,
    int Pagina = 1,
    int Tamanho = 12);
