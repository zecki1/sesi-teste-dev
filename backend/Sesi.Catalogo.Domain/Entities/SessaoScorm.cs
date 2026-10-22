namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Status agregado de uma sessão SCORM (por aluno/aula).
/// </summary>
public enum StatusSessao
{
    NaoIniciado = 0,
    EmAndamento = 1,
    Concluido = 2
}

/// <summary>
/// Sessão de um aluno em uma aula SCORM (estado agregado, alimenta a sidebar do AVA).
/// </summary>
public class SessaoScorm
{
    public int Id { get; set; }

    public string? UsuarioId { get; set; }
    public string SessaoId { get; set; } = string.Empty;

    public int AulaScormId { get; set; }
    public AulaScorm? AulaScorm { get; set; }

    public StatusSessao Status { get; set; } = StatusSessao.NaoIniciado;
    public decimal Percentual { get; set; }
    public decimal? Score { get; set; }
    public int? UltimaAulaId { get; set; }

    public ICollection<TentativaScorm> Tentativas { get; set; } = new List<TentativaScorm>();
}
