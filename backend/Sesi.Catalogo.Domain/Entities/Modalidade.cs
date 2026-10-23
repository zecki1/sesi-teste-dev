namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Modalidade de oferta do curso (Presencial, EAD ou Semi-presencial).
/// </summary>
public class Modalidade
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;

    public ICollection<Curso> Cursos { get; set; } = new List<Curso>();
    public ICollection<Turma> Turmas { get; set; } = new List<Turma>();
}
