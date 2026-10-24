namespace Sesi.Catalogo.Domain.Dtos;

/// <summary>
/// DTO de curso na listagem do catálogo (sem módulos).
/// </summary>
public record CursoResumoDto(
    int Id,
    string NomeCompleto,
    string NomeBreve,
    string Slug,
    string Descricao,
    int CargaHoraria,
    string PublicoAlvo,
    string ImagemUrl,
    DateOnly? DataDisponibilizacao,
    DateOnly? DataPublicacao,
    DateOnly? DataLiberacaoMatricula,
    string EtapaDesenvolvimento,
    bool Destaque,
    CategoriaDto Categoria,
    ModalidadeDto Modalidade,
    StatusCursoDto Status);

/// <summary>
/// DTO de curso no detalhe (com módulos e aulas).
/// </summary>
public record CursoDetalheDto(
    int Id,
    string NomeCompleto,
    string NomeBreve,
    string Slug,
    string Descricao,
    int CargaHoraria,
    string PublicoAlvo,
    string ImagemUrl,
    DateOnly? DataDisponibilizacao,
    DateOnly? DataPublicacao,
    DateOnly? DataLiberacaoMatricula,
    string EtapaDesenvolvimento,
    bool Destaque,
    CategoriaDto Categoria,
    ModalidadeDto Modalidade,
    StatusCursoDto Status,
    IReadOnlyList<ModuloDto> Modulos,
    IReadOnlyList<PerguntaFrequenteDto> Perguntas,
    AvaliacaoResumoDto Avaliacao);

/// <summary>Média e quantidade de avaliações publicadas de um curso.</summary>
public record AvaliacaoResumoDto(double Media, int Total);

/// <summary>Pergunta frequente já traduzida para o idioma da requisição.</summary>
public record PerguntaFrequenteDto(int Id, string Pergunta, string Resposta);

/// <summary>Pergunta frequente na visão administrativa, com os três idiomas.</summary>
public record PerguntaAdminDto(
    int Id,
    int Ordem,
    bool Ativa,
    string PerguntaPt,
    string RespostaPt,
    string PerguntaEn,
    string RespostaEn,
    string PerguntaEs,
    string RespostaEs);

public record SalvarPerguntasRequest(IReadOnlyList<PerguntaAdminDto> Perguntas);

/// <summary>
/// Avaliação de um curso já publicada, usada nos depoimentos da home e do detalhe.
/// </summary>
public record AvaliacaoDto(
    int Id,
    string CursoSlug,
    string CursoNome,
    string Nome,
    int Nota,
    string Depoimento,
    int NotaPlataforma,
    int NotaCurso,
    int NotaAvaliacao,
    int NotaAcessibilidade,
    string Sugestao,
    DateTime CriadoEm);

/// <summary>Envio da avaliação e da pesquisa de satisfação (5 perguntas).</summary>
public record CriarAvaliacaoRequest(
    string CursoSlug,
    string UsuarioId,
    string Nome,
    int Nota,
    string? Depoimento,
    int NotaPlataforma,
    int NotaCurso,
    int NotaAvaliacao,
    int NotaAcessibilidade,
    string? Sugestao,
    string? Idioma);
