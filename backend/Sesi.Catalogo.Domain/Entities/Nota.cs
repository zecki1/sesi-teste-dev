namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Lançamento de nota de um aluno em uma matrícula (prova, trabalho, atividade etc.).
/// </summary>
public class Nota
{
    public int Id { get; set; }

    public int MatriculaId { get; set; }
    public Matricula? Matricula { get; set; }

    public string Titulo { get; set; } = string.Empty;

    /// <summary>Prova, Trabalho, Atividade ou Participação.</summary>
    public string Tipo { get; set; } = "Prova";

    public decimal Peso { get; set; } = 1;
    public decimal Valor { get; set; }
    public decimal ValorMaximo { get; set; } = 10;

    public DateTime Data { get; set; } = DateTime.UtcNow;
    public string? Observacao { get; set; }
}
