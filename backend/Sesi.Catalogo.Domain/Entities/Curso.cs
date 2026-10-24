namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Curso do catálogo SESI Indústria.
/// </summary>
public class Curso
{
    public int Id { get; set; }
    public string NomeCompleto { get; set; } = string.Empty;
    public string NomeBreve { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public int CargaHoraria { get; set; }
    public string PublicoAlvo { get; set; } = string.Empty;
    public string ImagemUrl { get; set; } = string.Empty;
    public DateOnly? DataDisponibilizacao { get; set; }
    public DateOnly? DataPublicacao { get; set; }
    public DateOnly? DataLiberacaoMatricula { get; set; }
    public string EtapaDesenvolvimento { get; set; } = "Publicado";
    public bool Destaque { get; set; }
    public bool Ativo { get; set; } = true;

    public int CategoriaId { get; set; }
    public Categoria? Categoria { get; set; }

    public int ModalidadeId { get; set; }
    public Modalidade? Modalidade { get; set; }

    public int StatusId { get; set; }
    public StatusCurso? Status { get; set; }

    public ICollection<Modulo> Modulos { get; set; } = new List<Modulo>();
    public ICollection<CursoPergunta> Perguntas { get; set; } = new List<CursoPergunta>();
    public ICollection<AvaliacaoCurso> Avaliacoes { get; set; } = new List<AvaliacaoCurso>();
    public ICollection<Turma> Turmas { get; set; } = new List<Turma>();
    public ICollection<Matricula> Matriculas { get; set; } = new List<Matricula>();
}
