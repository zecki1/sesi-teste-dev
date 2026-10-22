namespace Sesi.Catalogo.Domain.Dtos;

/// <summary>
/// Payload de commit SCORM enviado pelo pacote/AVA.
/// </summary>
public record CommitScormRequest(
    string SessaoId,
    int AulaScormId,
    string? UsuarioId,
    string? SuspendData,
    string? LessonStatus,
    decimal? Score,
    string? SessionTime,
    string? Exit,
    string? Entry,
    decimal? ProgressMeasure,
    string? LessonLocation,
    string? Interacoes,
    string? Objetivos);

/// <summary>
/// Estado recuperado de uma tentativa SCORM (retomada).
/// </summary>
public record SessaoScormDto(
    int Id,
    string SessaoId,
    int AulaScormId,
    string Status,
    decimal Percentual,
    decimal? Score,
    string? SuspendData,
    string? LessonLocation,
    string? CmiStatus,
    string? TotalTime);
