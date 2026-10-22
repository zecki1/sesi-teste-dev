namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Módulo de um curso (agrupa aulas ordenadas).
/// </summary>
public class Modulo
{
    public int Id { get; set; }
    public int CursoId { get; set; }
    public Curso? Curso { get; set; }

    public int Ordem { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;

    public ICollection<Aula> Aulas { get; set; } = new List<Aula>();
}
