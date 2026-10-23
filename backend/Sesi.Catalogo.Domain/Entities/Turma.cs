namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Oferta concreta de um curso: data, dias da semana, horário e modalidade.
/// </summary>
public class Turma
{
    public int Id { get; set; }

    public int CursoId { get; set; }
    public Curso? Curso { get; set; }

    public int ModalidadeId { get; set; }
    public Modalidade? Modalidade { get; set; }

    public string Codigo { get; set; } = string.Empty;
    public DateOnly DataInicio { get; set; }
    public DateOnly? DataFim { get; set; }

    /// <summary>Dias no formato "Seg,Ter,Qua,Qui,Sex,Sáb,Dom".</summary>
    public string DiasSemana { get; set; } = string.Empty;

    public TimeOnly HorarioInicio { get; set; }
    public TimeOnly HorarioFim { get; set; }
    public int Vagas { get; set; } = 30;
    public bool Ativa { get; set; } = true;

    public ICollection<Matricula> Matriculas { get; set; } = new List<Matricula>();
}
