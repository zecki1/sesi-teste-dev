namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Traduções localizadas das categorias.
/// </summary>
public class CategoriaTraducao
{
    public int Id { get; set; }
    public int CategoriaId { get; set; }
    public Categoria? Categoria { get; set; }
    public string Idioma { get; set; } = "pt-BR";
    public string Nome { get; set; } = string.Empty;
}
