namespace Sesi.Catalogo.Domain.Dtos;

/// <summary>
/// Progresso agregado de um aluno em um curso (alimenta a sidebar do AVA).
/// </summary>
public record ProgressoCursoDto(
    string CursoSlug,
    int TotalAulas,
    int AulasConcluidas,
    decimal Percentual,
    IReadOnlyList<ProgressoAulaDto> Aulas);

/// <summary>
/// Progresso por aula dentro do curso.
/// </summary>
public record ProgressoAulaDto(
    int AulaId,
    int ModuloId,
    string Titulo,
    string Status,
    decimal Percentual);
