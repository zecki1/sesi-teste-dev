namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Aula ao vivo vinculada a uma turma (semi-presencial / EAD).
/// </summary>
public class AulaAoVivo
{
    public int Id { get; set; }

    public int TurmaId { get; set; }
    public Turma? Turma { get; set; }

    public string Titulo { get; set; } = string.Empty;
    public string? Descricao { get; set; }

    public DateTime DataHora { get; set; }
    public int DuracaoMinutos { get; set; } = 60;

    /// <summary>Nome da sala (usado para montar a URL do Jitsi Meet).</summary>
    public string Sala { get; set; } = string.Empty;

    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    public ICollection<PresencaAula> Presencas { get; set; } = new List<PresencaAula>();
}

/// <summary>
/// Registro de presença de um aluno em uma aula ao vivo.
/// </summary>
public class PresencaAula
{
    public int Id { get; set; }

    public int AulaAoVivoId { get; set; }
    public AulaAoVivo? AulaAoVivo { get; set; }

    public string UsuarioId { get; set; } = string.Empty;
    public bool Presente { get; set; }
    public DateTime RegistradoEm { get; set; } = DateTime.UtcNow;
}
