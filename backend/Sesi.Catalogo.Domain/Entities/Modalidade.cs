namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Modalidade de oferta do curso (Presencial ou EAD).
/// </summary>
public class Modalidade
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;

    public ICollection<Curso> Cursos { get; set; } = new List<Curso>();
}
