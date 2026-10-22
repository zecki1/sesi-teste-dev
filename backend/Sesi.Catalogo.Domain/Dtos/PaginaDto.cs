namespace Sesi.Catalogo.Domain.Dtos;

/// <summary>
/// Facetas disponíveis para os filtros do catálogo.
/// </summary>
public record FacetasDto(
    IReadOnlyList<CategoriaDto> Categorias,
    IReadOnlyList<ModalidadeDto> Modalidades,
    IReadOnlyList<StatusCursoDto> Status);

/// <summary>
/// Envelope paginado de listagem com facetas.
/// </summary>
public record PaginaDto<T>(
    IReadOnlyList<T> Itens,
    int Total,
    int Pagina,
    int Tamanho,
    FacetasDto Facetas);
