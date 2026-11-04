namespace Sesi.Catalogo.Domain.Dtos;

/// <summary>Nota lançada em uma matrícula.</summary>
public record NotaDto(
    int Id,
    int MatriculaId,
    string Titulo,
    string Tipo,
    decimal Peso,
    decimal Valor,
    decimal ValorMaximo,
    DateTime Data,
    string? Observacao);

/// <summary>Lançamento/edição de nota.</summary>
public record SalvarNotaRequest(
    string Titulo,
    string Tipo,
    decimal Peso,
    decimal Valor,
    decimal ValorMaximo,
    DateTime? Data = null,
    string? Observacao = null);

/// <summary>Turma na visão administrativa (inclui nome da modalidade).</summary>
public record TurmaAdminDto(
    int Id,
    int CursoId,
    string Codigo,
    int ModalidadeId,
    string ModalidadeNome,
    DateOnly DataInicio,
    DateOnly? DataFim,
    string DiasSemana,
    string HorarioInicio,
    string HorarioFim,
    int Vagas,
    int Inscritos,
    bool Ativa);

/// <summary>Criação/edição de turma pelo admin.</summary>
public record SalvarTurmaRequest(
    int CursoId,
    int ModalidadeId,
    string Codigo,
    DateOnly DataInicio,
    DateOnly? DataFim,
    string DiasSemana,
    string HorarioInicio,
    string HorarioFim,
    int Vagas = 30,
    bool Ativa = true);

/// <summary>Matrícula na visão administrativa.</summary>
public record MatriculaAdminDto(
    int Id,
    string UsuarioId,
    string? UsuarioNome,
    int CursoId,
    string CursoSlug,
    string CursoNome,
    int TurmaId,
    string TurmaCodigo,
    DateTime DataMatricula,
    string Status,
    int Progresso,
    bool Concluido);

/// <summary>Criação/edição de matrícula pelo admin.</summary>
public record SalvarMatriculaAdminRequest(
    string UsuarioId,
    int TurmaId,
    string? Status = null,
    int? Progresso = null,
    bool? Concluido = null);

/// <summary>Boletim de um curso do aluno.</summary>
public record BoletimCursoDto(
    int MatriculaId,
    int TurmaId,
    string CursoSlug,
    string CursoNome,
    string TurmaCodigo,
    string Status,
    int Progresso,
    bool Concluido,
    IReadOnlyList<NotaDto> Notas,
    decimal MediaFinal);

/// <summary>Boletim completo do aluno.</summary>
public record BoletimDto(
    string UsuarioId,
    IReadOnlyList<BoletimCursoDto> Cursos);
