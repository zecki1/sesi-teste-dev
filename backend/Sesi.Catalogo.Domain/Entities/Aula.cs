namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Aula de um módulo.
/// </summary>
public class Aula
{
    public int Id { get; set; }
    public int ModuloId { get; set; }
    public Modulo? Modulo { get; set; }

    public int Ordem { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public int DuracaoMinutos { get; set; }
    public string? VideoUrl { get; set; }
}
