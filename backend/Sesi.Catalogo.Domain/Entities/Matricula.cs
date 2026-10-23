namespace Sesi.Catalogo.Domain.Entities;

/// <summary>
/// Matrícula de um aluno em uma turma do catálogo.
/// </summary>
public class Matricula
{
    public int Id { get; set; }

    public int CursoId { get; set; }
    public Curso? Curso { get; set; }

    public int TurmaId { get; set; }
    public Turma? Turma { get; set; }

    /// <summary>Identificador do aluno. No demo, é o e-mail do perfil.</summary>
    public string UsuarioId { get; set; } = string.Empty;

    public DateTime DataMatricula { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "ativa";
    public int Progresso { get; set; }
    public bool Concluido { get; set; }
}
