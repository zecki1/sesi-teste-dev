namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Traduções localizadas das modalidades.
/// </summary>
public class ModalidadeTraducao
{
    public int Id { get; set; }
    public int ModalidadeId { get; set; }
    public Modalidade? Modalidade { get; set; }
    public string Idioma { get; set; } = "pt-BR";
    public string Nome { get; set; } = string.Empty;
}
