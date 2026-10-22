namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Situação de disponibilização do curso (Disponível, Em breve, Inscrições abertas).
/// </summary>
public class StatusCurso
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;

    public ICollection<Curso> Cursos { get; set; } = new List<Curso>();
}
