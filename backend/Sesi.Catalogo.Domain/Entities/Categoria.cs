namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Categoria de um curso (ex.: Ciências e Natureza, Linguagens, Matemática, Sustentabilidade).
/// </summary>
public class Categoria
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string IconeUrl { get; set; } = string.Empty;
    public string Cor { get; set; } = string.Empty;
    public int Ordem { get; set; }

    public ICollection<Curso> Cursos { get; set; } = new List<Curso>();
}
