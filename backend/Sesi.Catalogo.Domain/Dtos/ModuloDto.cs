namespace Sesi.Catalogo.Domain.Dtos;

/// <summary>
/// DTO de aula exibido no detalhe do curso e no AVA.
/// </summary>
public record AulaDto(
    int Id,
    int ModuloId,
    int Ordem,
    string Titulo,
    string Descricao,
    int DuracaoMinutos,
    string? VideoUrl);

/// <summary>
/// DTO de módulo com suas aulas ordenadas.
/// </summary>
public record ModuloDto(
    int Id,
    int CursoId,
    int Ordem,
    string Titulo,
    string Descricao,
    IReadOnlyList<AulaDto> Aulas);
