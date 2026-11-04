namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Mensagem do histórico do tutor virtual (Super Sesinho) por usuário, retida por 7 dias.
/// </summary>
public class HistoricoTutor
{
    public int Id { get; set; }

    public string UsuarioId { get; set; } = string.Empty;
    public string Papel { get; set; } = "user"; // user | assistant
    public string Texto { get; set; } = string.Empty;

    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
