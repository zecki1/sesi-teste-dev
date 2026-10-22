namespace Sesi.Catalogo.Domain.Dtos;

/// <summary>
/// DTO de curso na listagem do catálogo (sem módulos).
/// </summary>
public record CursoResumoDto(
    int Id,
    string NomeCompleto,
    string NomeBreve,
    string Slug,
    string Descricao,
    int CargaHoraria,
    string PublicoAlvo,
    string ImagemUrl,
    DateOnly? DataDisponibilizacao,
    bool Destaque,
    CategoriaDto Categoria,
    ModalidadeDto Modalidade,
    StatusCursoDto Status);

/// <summary>
/// DTO de curso no detalhe (com módulos e aulas).
/// </summary>
public record CursoDetalheDto(
    int Id,
    string NomeCompleto,
    string NomeBreve,
    string Slug,
    string Descricao,
    int CargaHoraria,
    string PublicoAlvo,
    string ImagemUrl,
    DateOnly? DataDisponibilizacao,
    bool Destaque,
    CategoriaDto Categoria,
    ModalidadeDto Modalidade,
    StatusCursoDto Status,
    IReadOnlyList<ModuloDto> Modulos);
