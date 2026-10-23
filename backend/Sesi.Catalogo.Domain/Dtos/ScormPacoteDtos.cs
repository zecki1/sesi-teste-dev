namespace Sesi.Catalogo.Domain.Dtos;

/// <summary>
/// Pacote SCORM enviado pelo admin e armazenado no backend.
/// </summary>
public record ScormPacoteDto(
    string Id,
    string CursoSlug,
    string NomeArquivo,
    long Tamanho,
    string Versao,
    string EntryFile,
    DateTime CriadoEm,
    string ConteudoUrl,
    string LancamentoUrl);

/// <summary>
/// Progresso de um aluno dentro de um pacote SCORM.
/// </summary>
public record ProgressoScormDto(
    string CursoSlug,
    string UsuarioId,
    string? SuspendData,
    string? LessonStatus,
    string? LessonLocation,
    decimal? Score,
    decimal Percentual,
    string? CmiDataJson,
    DateTime AtualizadoEm);

/// <summary>
/// Commit de progresso enviado pelo player SCORM.
/// </summary>
public record SalvarProgressoScormRequest(
    string CursoSlug,
    string UsuarioId,
    string? SuspendData,
    string? LessonStatus,
    string? LessonLocation,
    decimal? Score,
    decimal? Percentual,
    string? CmiDataJson);
