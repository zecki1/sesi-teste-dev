namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Associação de um pacote SCORM a uma aula (1 SCO por aula).
/// </summary>
public class AulaScorm
{
    public int Id { get; set; }

    public int AulaId { get; set; }
    public Aula? Aula { get; set; }

    /// <summary>Versão SCORM: "1.2" ou "2004".</summary>
    public string Versao { get; set; } = "1.2";

    /// <summary>URL do pacote SCORM (launch).</summary>
    public string LaunchUrl { get; set; } = string.Empty;

    /// <summary>Identificador do item no manifesto (imsmainfest).</summary>
    public string ItemId { get; set; } = string.Empty;
}
