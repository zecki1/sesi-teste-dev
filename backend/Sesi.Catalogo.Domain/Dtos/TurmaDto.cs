namespace Sesi.Catalogo.Domain.Dtos;

/// <summary>Turma/oferta de um curso.</summary>
public record TurmaDto(
    int Id,
    int CursoId,
    string Codigo,
    ModalidadeDto Modalidade,
    DateOnly DataInicio,
    DateOnly? DataFim,
    string DiasSemana,
    string HorarioInicio,
    string HorarioFim,
    int Vagas,
    int Inscritos,
    bool Ativa);

/// <summary>Matrícula do aluno em uma turma.</summary>
public record MatriculaDto(
    int Id,
    string UsuarioId,
    DateTime DataMatricula,
    string Status,
    int Progresso,
    bool Concluido,
    CursoResumoDto Curso,
    TurmaDto Turma);

/// <summary>Pedido de matrícula.</summary>
public record CriarMatriculaRequest(
    string CursoSlug,
    int TurmaId,
    string UsuarioId);

/// <summary>Módulo enviado pelo admin ao criar/editar um curso.</summary>
public record ModuloSalvarDto(
    string Titulo,
    string? Descricao,
    IReadOnlyList<string> Aulas);

/// <summary>Metadados de curso enviados pelo admin.</summary>
public record CursoSalvarRequest(
    string NomeCompleto,
    string NomeBreve,
    string Slug,
    string Descricao,
    int CargaHoraria,
    string PublicoAlvo,
    string ImagemUrl,
    DateOnly? DataDisponibilizacao,
    bool Destaque,
    string CategoriaSlug,
    string ModalidadeSlug,
    string StatusSlug,
    IReadOnlyList<ModuloSalvarDto>? Modulos = null);
