namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Traduções localizadas dos cursos para suporte multi-idioma.
/// </summary>
public class CursoTraducao
{
    public int Id { get; set; }
    public int CursoId { get; set; }
    public Curso? Curso { get; set; }
    public string Idioma { get; set; } = "pt-BR";
    public string NomeCompleto { get; set; } = string.Empty;
    public string NomeBreve { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string PublicoAlvo { get; set; } = string.Empty;
}
