namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Avaliação de um curso feita por um aluno. Guarda a nota geral, o depoimento
/// e as respostas da pesquisa de satisfação (plataforma, curso, avaliação e acessibilidade).
/// </summary>
public class AvaliacaoCurso
{
    public int Id { get; set; }
    public int CursoId { get; set; }
    public Curso? Curso { get; set; }

    /// <summary>Identificador do aluno (e-mail), para impedir avaliações duplicadas do mesmo curso.</summary>
    public string UsuarioId { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;

    public int Nota { get; set; }
    public string Depoimento { get; set; } = string.Empty;

    public int NotaPlataforma { get; set; }
    public int NotaCurso { get; set; }
    public int NotaAvaliacao { get; set; }
    public int NotaAcessibilidade { get; set; }
    public string Sugestao { get; set; } = string.Empty;

    public string Idioma { get; set; } = "pt-BR";
    public bool Publicada { get; set; } = true;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public DateTime? AtualizadoEm { get; set; }
}
