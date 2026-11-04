namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Mensagem publicada na comunidade de uma turma (fórum, chat ou plantão de dúvidas).
/// </summary>
public class MensagemComunidade
{
    public int Id { get; set; }

    public int TurmaId { get; set; }
    public Turma? Turma { get; set; }

    public string UsuarioId { get; set; } = string.Empty;
    public string UsuarioNome { get; set; } = string.Empty;

    /// <summary>forum, chat ou plantao.</summary>
    public string Canal { get; set; } = "forum";

    public string? Titulo { get; set; }
    public string Conteudo { get; set; } = string.Empty;

    public int? ParentId { get; set; }
    public MensagemComunidade? Parent { get; set; }

    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
