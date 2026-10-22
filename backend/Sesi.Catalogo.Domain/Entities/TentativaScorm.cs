namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Tentativa SCORM — snapshot do CMI (dados de rastreio enviados pelo pacote).
/// </summary>
public class TentativaScorm
{
    public int Id { get; set; }

    public int SessaoScormId { get; set; }
    public SessaoScorm? SessaoScorm { get; set; }

    public string? SuspendData { get; set; }
    public string? CmiStatus { get; set; }
    public string? CmiEntry { get; set; }
    public string? CmiExit { get; set; }
    public string? LessonLocation { get; set; }
    public string? SessionTime { get; set; }
    public string? TotalTime { get; set; }
    public decimal? ScoreRaw { get; set; }
    public decimal? ProgressMeasure { get; set; }

    public string? Interacoes { get; set; }
    public string? Objetivos { get; set; }

    public DateTime Inicio { get; set; } = DateTime.UtcNow;
    public DateTime? Fim { get; set; }
}
