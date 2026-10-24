namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Pergunta frequente de um curso. O texto fica em <see cref="CursoPerguntaTraducao"/>,
/// uma linha por idioma (pt-BR, en-US, es-ES).
/// </summary>
public class CursoPergunta
{
    public int Id { get; set; }
    public int CursoId { get; set; }
    public Curso? Curso { get; set; }
    public int Ordem { get; set; }
    public bool Ativa { get; set; } = true;

    public ICollection<CursoPerguntaTraducao> Traducoes { get; set; } = new List<CursoPerguntaTraducao>();
}

/// <summary>Tradução de uma pergunta frequente do curso.</summary>
public class CursoPerguntaTraducao
{
    public int Id { get; set; }
    public int CursoPerguntaId { get; set; }
    public CursoPergunta? CursoPergunta { get; set; }
    public string Idioma { get; set; } = "pt-BR";
    public string Pergunta { get; set; } = string.Empty;
    public string Resposta { get; set; } = string.Empty;
}
