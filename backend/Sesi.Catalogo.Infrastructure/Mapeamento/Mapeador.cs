using Sesi.Catalogo.Domain.Dtos;
using Sesi.Catalogo.Domain.Entities;

namespace Sesi.Catalogo.Infrastructure.Mapeamento;

/// <summary>
/// Conversões de entidades do domínio para DTOs da API.
/// </summary>
internal static class Mapeador
{
    private static string NormalizarIdioma(string? idioma)
    {
        if (string.IsNullOrWhiteSpace(idioma)) return "pt-BR";
        var i = idioma.Trim().Replace('_', '-');
        if (i.StartsWith("en", StringComparison.OrdinalIgnoreCase)) return "en-US";
        if (i.StartsWith("es", StringComparison.OrdinalIgnoreCase)) return "es-ES";
        return "pt-BR";
    }

    public static CategoriaDto ParaDto(this Categoria c, string? idioma = null) =>
        new(c.Id, c.Nome, c.Slug, c.IconeUrl, c.Cor, c.Ordem);

    public static ModalidadeDto ParaDto(this Modalidade m, string? idioma = null) =>
        new(m.Id, m.Nome, m.Slug);

    public static StatusCursoDto ParaDto(this StatusCurso s) =>
        new(s.Id, s.Nome, s.Slug);

    public static AulaDto ParaDto(this Aula a) =>
        new(a.Id, a.ModuloId, a.Ordem, a.Titulo, a.Descricao, a.DuracaoMinutos, a.VideoUrl);

    public static ModuloDto ParaDto(this Modulo m) =>
        new(m.Id, m.CursoId, m.Ordem, m.Titulo, m.Descricao,
            m.Aulas.OrderBy(a => a.Ordem).Select(ParaDto).ToList());

    public static CursoResumoDto ParaResumoDto(this Curso c, CursoTraducao? traducao = null, CategoriaTraducao? catTrad = null, ModalidadeTraducao? modTrad = null) =>
        new(c.Id,
            traducao?.NomeCompleto ?? c.NomeCompleto,
            traducao?.NomeBreve ?? c.NomeBreve,
            c.Slug,
            traducao?.Descricao ?? c.Descricao,
            c.CargaHoraria,
            traducao?.PublicoAlvo ?? c.PublicoAlvo,
            c.ImagemUrl,
            c.DataDisponibilizacao,
            c.DataPublicacao,
            c.DataLiberacaoMatricula,
            c.EtapaDesenvolvimento,
            c.Destaque,
            new CategoriaDto(c.Categoria!.Id, catTrad?.Nome ?? c.Categoria.Nome, c.Categoria.Slug, c.Categoria.IconeUrl, c.Categoria.Cor, c.Categoria.Ordem),
            new ModalidadeDto(c.Modalidade!.Id, modTrad?.Nome ?? c.Modalidade.Nome, c.Modalidade.Slug),
            StatusOferta(c));

    public static CursoDetalheDto ParaDetalheDto(this Curso c, CursoTraducao? traducao = null, CategoriaTraducao? catTrad = null, ModalidadeTraducao? modTrad = null) =>
        new(c.Id,
            traducao?.NomeCompleto ?? c.NomeCompleto,
            traducao?.NomeBreve ?? c.NomeBreve,
            c.Slug,
            traducao?.Descricao ?? c.Descricao,
            c.CargaHoraria,
            traducao?.PublicoAlvo ?? c.PublicoAlvo,
            c.ImagemUrl,
            c.DataDisponibilizacao,
            c.DataPublicacao,
            c.DataLiberacaoMatricula,
            c.EtapaDesenvolvimento,
            c.Destaque,
            new CategoriaDto(c.Categoria!.Id, catTrad?.Nome ?? c.Categoria.Nome, c.Categoria.Slug, c.Categoria.IconeUrl, c.Categoria.Cor, c.Categoria.Ordem),
            new ModalidadeDto(c.Modalidade!.Id, modTrad?.Nome ?? c.Modalidade.Nome, c.Modalidade.Slug),
            StatusOferta(c),
            c.Modulos.OrderBy(m => m.Ordem).Select(ParaDto).ToList());

    private static StatusCursoDto StatusOferta(Curso curso)
    {
        var status = curso.Status!.ParaDto();
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        if (curso.EtapaDesenvolvimento != "Publicado" ||
            curso.DataPublicacao is { } publicacao && publicacao > hoje ||
            curso.DataLiberacaoMatricula is not { } liberacao)
            return status;

        if (liberacao > hoje) return status with { Nome = "Em breve", Slug = "em-breve" };
        if (curso.DataDisponibilizacao is null || curso.DataDisponibilizacao > hoje)
            return status with { Nome = "Inscrições abertas", Slug = "inscricoes-abertas" };
        return status with { Nome = "Disponível", Slug = "disponivel" };
    }

    public static TurmaDto ParaDto(this Turma t) =>
        new(t.Id, t.CursoId, t.Codigo, t.Modalidade!.ParaDto(), t.DataInicio, t.DataFim,
            t.DiasSemana, t.HorarioInicio.ToString("HH:mm"), t.HorarioFim.ToString("HH:mm"),
            t.Vagas, t.Matriculas.Count, t.Ativa);

    public static MatriculaDto ParaDto(this Matricula m) =>
        new(m.Id, m.UsuarioId, m.DataMatricula, m.Status, m.Progresso, m.Concluido,
            m.Curso!.ParaResumoDto(), m.Turma!.ParaDto());

    public static string ParaStatusNome(this StatusSessao status) => status switch
    {
        StatusSessao.Concluido => "concluido",
        StatusSessao.EmAndamento => "em-andamento",
        _ => "nao-iniciado"
    };

    public static SessaoScormDto ParaDto(this SessaoScorm s, TentativaScorm? ultima) =>
        new(s.Id, s.SessaoId, s.AulaScormId, s.Status.ParaStatusNome(), s.Percentual, s.Score,
            ultima?.SuspendData, ultima?.LessonLocation, ultima?.CmiStatus, ultima?.TotalTime);
}
