using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;
using Sesi.Catalogo.Domain.Abstractions;
using Sesi.Catalogo.Domain.Dtos;
using Sesi.Catalogo.Domain.Entities;
using Sesi.Catalogo.Infrastructure.Data;
using Sesi.Catalogo.Infrastructure.Mapeamento;

namespace Sesi.Catalogo.Infrastructure.Repositorios;

/// <summary>
/// Implementação EF Core do repositório do catálogo.
/// </summary>
public sealed class CatalogoRepositorio(CatalogoDbContext db) : ICatalogoRepositorio
{
    private static string NormalizarIdioma(string? idioma)
    {
        if (string.IsNullOrWhiteSpace(idioma)) return "pt-BR";
        var i = idioma.Trim().Replace('_', '-');
        if (i.StartsWith("en", StringComparison.OrdinalIgnoreCase)) return "en-US";
        if (i.StartsWith("es", StringComparison.OrdinalIgnoreCase)) return "es-ES";
        return "pt-BR";
    }

    public async Task<PaginaDto<CursoResumoDto>> ListarCursosAsync(CursoFiltro filtro, CancellationToken ct = default)
    {
        var idioma = NormalizarIdioma(filtro.Idioma);
        var pagina = filtro.Pagina < 1 ? 1 : filtro.Pagina;
        var tamanho = filtro.Tamanho switch
        {
            < 1 => 12,
            > 48 => 48,
            _ => filtro.Tamanho
        };
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);

        var query = db.Cursos
            .AsNoTracking()
            .Include(c => c.Categoria)
            .Include(c => c.Modalidade)
            .Include(c => c.Status)
            .Where(c => c.Ativo &&
                c.EtapaDesenvolvimento == "Publicado" &&
                (c.DataPublicacao == null || c.DataPublicacao <= hoje));

        if (!string.IsNullOrWhiteSpace(filtro.Busca))
        {
            var termo = NormalizarTermoBusca(filtro.Busca);
            query = query.Where(c =>
                (c.NomeCompleto + " " + c.NomeBreve + " " + c.Descricao)
                    .Replace("Á", "a").Replace("á", "a")
                    .Replace("À", "a").Replace("à", "a")
                    .Replace("Â", "a").Replace("â", "a")
                    .Replace("Ã", "a").Replace("ã", "a")
                    .Replace("Ä", "a").Replace("ä", "a")
                    .Replace("É", "e").Replace("é", "e")
                    .Replace("È", "e").Replace("è", "e")
                    .Replace("Ê", "e").Replace("ê", "e")
                    .Replace("Ë", "e").Replace("ë", "e")
                    .Replace("Í", "i").Replace("í", "i")
                    .Replace("Ì", "i").Replace("ì", "i")
                    .Replace("Î", "i").Replace("î", "i")
                    .Replace("Ï", "i").Replace("ï", "i")
                    .Replace("Ó", "o").Replace("ó", "o")
                    .Replace("Ò", "o").Replace("ò", "o")
                    .Replace("Ô", "o").Replace("ô", "o")
                    .Replace("Õ", "o").Replace("õ", "o")
                    .Replace("Ö", "o").Replace("ö", "o")
                    .Replace("Ú", "u").Replace("ú", "u")
                    .Replace("Ù", "u").Replace("ù", "u")
                    .Replace("Û", "u").Replace("û", "u")
                    .Replace("Ü", "u").Replace("ü", "u")
                    .Replace("Ç", "c").Replace("ç", "c")
                    .ToLower()
                    .Contains(termo) ||
                db.CursosTraducoes.Any(t => t.CursoId == c.Id && t.Idioma == idioma &&
                    (t.NomeCompleto + " " + t.NomeBreve + " " + t.Descricao)
                        .Replace("Á","a").Replace("á","a").Replace("À","a").Replace("à","a").Replace("Â","a").Replace("â","a").Replace("Ã","a").Replace("ã","a").Replace("Ä","a").Replace("ä","a")
                        .Replace("É","e").Replace("é","e").Replace("È","e").Replace("è","e").Replace("Ê","e").Replace("ê","e").Replace("Ë","e").Replace("ë","e")
                        .Replace("Í","i").Replace("í","i").Replace("Ì","i").Replace("ì","i").Replace("Î","i").Replace("î","i").Replace("Ï","i").Replace("ï","i")
                        .Replace("Ó","o").Replace("ó","o").Replace("Ò","o").Replace("ò","o").Replace("Ô","o").Replace("ô","o").Replace("Õ","o").Replace("õ","o").Replace("Ö","o").Replace("ö","o")
                        .Replace("Ú","u").Replace("ú","u").Replace("Ù","u").Replace("ù","u").Replace("Û","u").Replace("û","u").Replace("Ü","u").Replace("ü","u")
                        .Replace("Ç","c").Replace("ç","c")
                        .ToLower()
                        .Contains(termo)));
        }

        if (!string.IsNullOrWhiteSpace(filtro.Categoria))
            query = query.Where(c => c.Categoria!.Slug == filtro.Categoria);

        if (!string.IsNullOrWhiteSpace(filtro.Modalidade))
            query = query.Where(c => c.Modalidade!.Slug == filtro.Modalidade);

        if (!string.IsNullOrWhiteSpace(filtro.Status))
        {
            var statusFiltro = filtro.Status;
            query = query.Where(c =>
                c.DataLiberacaoMatricula == null
                    ? c.Status!.Slug == statusFiltro
                    : statusFiltro == "em-breve"
                        ? c.DataLiberacaoMatricula > hoje
                        : statusFiltro == "inscricoes-abertas"
                            ? c.DataLiberacaoMatricula <= hoje &&
                              (c.DataDisponibilizacao == null || c.DataDisponibilizacao > hoje)
                            : statusFiltro == "disponivel"
                                ? c.DataLiberacaoMatricula <= hoje &&
                                  c.DataDisponibilizacao != null &&
                                  c.DataDisponibilizacao <= hoje
                                : c.Status!.Slug == statusFiltro);
        }

        if (filtro.Destaque is true)
            query = query.Where(c => c.Destaque);

        query = filtro.Ordenar switch
        {
            "nome" or "nome-asc" => query.OrderBy(c => c.NomeCompleto),
            "nome-desc" => query.OrderByDescending(c => c.NomeCompleto),
            "carga" or "carga-asc" => query.OrderBy(c => c.CargaHoraria),
            "carga-desc" => query.OrderByDescending(c => c.CargaHoraria),
            "recentes" => query.OrderByDescending(c => c.Id),
            _ => query.OrderByDescending(c => c.Destaque)
                .ThenBy(c => c.Categoria!.Ordem)
                .ThenBy(c => c.NomeBreve)
        };

        var total = await query.CountAsync(ct);

        var itens = await query
            .Skip((pagina - 1) * tamanho)
            .Take(tamanho)
            .ToListAsync(ct);

        var cursoIds = itens.Select(c => c.Id).ToList();
        var traducoesCursos = await db.CursosTraducoes
            .AsNoTracking()
            .Where(t => t.Idioma == idioma && cursoIds.Contains(t.CursoId))
            .ToDictionaryAsync(t => t.CursoId, ct);
        var traducoesCategorias = await db.CategoriasTraducoes
            .AsNoTracking()
            .Where(t => t.Idioma == idioma && itens.Select(c => c.CategoriaId).Distinct().Contains(t.CategoriaId))
            .ToDictionaryAsync(t => t.CategoriaId, ct);
        var traducoesModalidades = await db.ModalidadesTraducoes
            .AsNoTracking()
            .Where(t => t.Idioma == idioma && itens.Select(c => c.ModalidadeId).Distinct().Contains(t.ModalidadeId))
            .ToDictionaryAsync(t => t.ModalidadeId, ct);

        var facetas = await ObterFacetasAsync(idioma, ct);

        return new PaginaDto<CursoResumoDto>(
            itens.Select(c => Mapeador.ParaResumoDto(
                c,
                idioma,
                traducoesCursos.TryGetValue(c.Id, out var tc) ? tc : null,
                traducoesCategorias.TryGetValue(c.CategoriaId, out var tcat) ? tcat : null,
                traducoesModalidades.TryGetValue(c.ModalidadeId, out var tmod) ? tmod : null)).ToList(),
            total, pagina, tamanho, facetas);
    }

    private static string NormalizarTermoBusca(string texto) =>
        string.Concat(texto.Trim().Normalize(NormalizationForm.FormD)
            .Where(caractere => CharUnicodeInfo.GetUnicodeCategory(caractere) != UnicodeCategory.NonSpacingMark))
            .ToLowerInvariant();

    public async Task<IReadOnlyList<CursoResumoDto>> ListarCursosAdministracaoAsync(CancellationToken ct = default)
    {
        var cursos = await db.Cursos
            .AsNoTracking()
            .Include(c => c.Categoria)
            .Include(c => c.Modalidade)
            .Include(c => c.Status)
            .Where(c => c.Ativo)
            .OrderBy(c => c.NomeBreve)
            .ToListAsync(ct);

        return cursos.Select(c => Mapeador.ParaResumoDto(c)).ToList();
    }

    public async Task<CursoDetalheDto?> ObterCursoPorSlugAsync(string slug, string? idioma = null, CancellationToken ct = default)
    {
        var lang = NormalizarIdioma(idioma);
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        var curso = await db.Cursos
            .AsNoTracking()
            .Include(c => c.Categoria)
            .Include(c => c.Modalidade)
            .Include(c => c.Status)
            .Include(c => c.Modulos).ThenInclude(m => m.Aulas)
            .Include(c => c.Perguntas).ThenInclude(p => p.Traducoes)
            .FirstOrDefaultAsync(c =>
                c.Slug == slug &&
                c.Ativo &&
                c.EtapaDesenvolvimento == "Publicado" &&
                (c.DataPublicacao == null || c.DataPublicacao <= hoje), ct);

        if (curso is null) return null;

        var traducao = await db.CursosTraducoes.AsNoTracking()
            .FirstOrDefaultAsync(t => t.CursoId == curso.Id && t.Idioma == lang, ct);
        var traducaoCat = await db.CategoriasTraducoes.AsNoTracking()
            .FirstOrDefaultAsync(t => t.CategoriaId == curso.CategoriaId && t.Idioma == lang, ct);
        var traducaoMod = await db.ModalidadesTraducoes.AsNoTracking()
            .FirstOrDefaultAsync(t => t.ModalidadeId == curso.ModalidadeId && t.Idioma == lang, ct);

        var perguntas = curso.Perguntas
            .Where(p => p.Ativa)
            .OrderBy(p => p.Ordem)
            .Select(p => p.ParaDto(lang))
            .ToList();

        var notas = await db.Avaliacoes.AsNoTracking()
            .Where(a => a.CursoId == curso.Id && a.Publicada)
            .Select(a => a.Nota)
            .ToListAsync(ct);
        var resumoAvaliacoes = new AvaliacaoResumoDto(
            notas.Count == 0 ? 0 : Math.Round(notas.Average(), 1),
            notas.Count);

        return curso.ParaDetalheDto(lang, traducao, traducaoCat, traducaoMod, perguntas, resumoAvaliacoes);
    }

    private async Task<CursoDetalheDto?> ObterCursoSemFiltroDePublicacaoAsync(string slug, CancellationToken ct)
    {
        var curso = await db.Cursos
            .AsNoTracking()
            .Include(c => c.Categoria)
            .Include(c => c.Modalidade)
            .Include(c => c.Status)
            .Include(c => c.Modulos).ThenInclude(m => m.Aulas)
            .FirstOrDefaultAsync(c => c.Slug == slug && c.Ativo, ct);

        return curso?.ParaDetalheDto();
    }

    public async Task<FacetasDto> ObterFacetasAsync(string? idioma = null, CancellationToken ct = default)
    {
        var lang = NormalizarIdioma(idioma);

        var categorias = await db.Categorias.AsNoTracking()
            .OrderBy(c => c.Ordem)
            .ToListAsync(ct);

        var modalidades = await db.Modalidades.AsNoTracking()
            .OrderBy(m => m.Id)
            .ToListAsync(ct);

        var catTrad = await db.CategoriasTraducoes.AsNoTracking()
            .Where(t => t.Idioma == lang && categorias.Select(c => c.Id).Contains(t.CategoriaId))
            .ToDictionaryAsync(t => t.CategoriaId, ct);

        var modTrad = await db.ModalidadesTraducoes.AsNoTracking()
            .Where(t => t.Idioma == lang && modalidades.Select(m => m.Id).Contains(t.ModalidadeId))
            .ToDictionaryAsync(t => t.ModalidadeId, ct);

        var catDtos = categorias
            .Select(c => new CategoriaDto(c.Id, catTrad.TryGetValue(c.Id, out var ct2) ? ct2.Nome : c.Nome, c.Slug, c.IconeUrl, c.Cor, c.Ordem))
            .ToList();

        var modDtos = modalidades
            .Select(m => new ModalidadeDto(m.Id, modTrad.TryGetValue(m.Id, out var mt2) ? mt2.Nome : m.Nome, m.Slug))
            .ToList();

        var status = await db.StatusCursos.AsNoTracking()
            .OrderBy(s => s.Id)
            .ToListAsync(ct);

        var statusDtos = status
            .Select(s => new StatusCursoDto(s.Id, Mapeador.TraduzirStatus(s.Nome, s.Slug, lang), s.Slug))
            .ToList();

        return new FacetasDto(catDtos, modDtos, statusDtos);
    }

    public Task<FacetasDto> ObterFacetasAsync(CancellationToken ct = default)
        => ObterFacetasAsync((string?)null, ct);

    public Task<FacetasDto> ObterFacetasAsync(CursoFiltro? filtro, CancellationToken ct = default)
        => ObterFacetasAsync(filtro?.Idioma, ct);

    public async Task<ProgressoCursoDto?> ObterProgressoAsync(string slug, string? usuarioId, CancellationToken ct = default)
    {
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        var curso = await db.Cursos
            .AsNoTracking()
            .Include(c => c.Modulos).ThenInclude(m => m.Aulas)
            .FirstOrDefaultAsync(c =>
                c.Slug == slug &&
                c.Ativo &&
                c.EtapaDesenvolvimento == "Publicado" &&
                (c.DataPublicacao == null || c.DataPublicacao <= hoje), ct);

        if (curso is null)
            return null;

        var aulaIds = curso.Modulos.SelectMany(m => m.Aulas).Select(a => a.Id).ToList();

        var aulasScorm = await db.AulasScorm.AsNoTracking()
            .Where(a => aulaIds.Contains(a.AulaId))
            .ToListAsync(ct);

        var scormPorAula = aulasScorm.ToDictionary(a => a.AulaId, a => a.Id);

        var sessoes = string.IsNullOrWhiteSpace(usuarioId)
            ? new List<SessaoScorm>()
            : await db.SessoesScorm.AsNoTracking()
                .Where(s => s.UsuarioId == usuarioId && aulasScorm.Select(a => a.Id).Contains(s.AulaScormId))
                .ToListAsync(ct);

        var sesaoPorAulaScorm = sessoes.ToDictionary(s => s.AulaScormId);

        var progressoAulas = new List<ProgressoAulaDto>();
        foreach (var modulo in curso.Modulos.OrderBy(m => m.Ordem))
        {
            foreach (var aula in modulo.Aulas.OrderBy(a => a.Ordem))
            {
                var status = "nao-iniciado";
                decimal percentual = 0;

                if (scormPorAula.TryGetValue(aula.Id, out var aulaScormId) &&
                    sesaoPorAulaScorm.TryGetValue(aulaScormId, out var sessao))
                {
                    status = sessao.Status.ParaStatusNome();
                    percentual = sessao.Percentual;
                }

                progressoAulas.Add(new ProgressoAulaDto(aula.Id, modulo.Id, aula.Titulo, status, percentual));
            }
        }

        var totalAulas = progressoAulas.Count;
        var concluidas = progressoAulas.Count(a => a.Status == "concluido");
        var percentualCurso = totalAulas == 0
            ? 0
            : Math.Round(concluidas * 100m / totalAulas, 2);

        return new ProgressoCursoDto(curso.Slug, totalAulas, concluidas, percentualCurso, progressoAulas);
    }

    public async Task<IReadOnlyList<TurmaDto>> ListarTurmasAsync(string slug, CancellationToken ct = default)
    {
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        var turmas = await db.Turmas
            .AsNoTracking()
            .Include(t => t.Modalidade)
            .Include(t => t.Matriculas)
            .Where(t => t.Curso!.Slug == slug &&
                        t.Curso.Ativo &&
                        t.Curso.EtapaDesenvolvimento == "Publicado" &&
                        (t.Curso.DataPublicacao == null || t.Curso.DataPublicacao <= hoje) &&
                        t.Ativa &&
                        (t.DataFim == null || t.DataFim >= hoje))
            .OrderBy(t => t.DataInicio)
            .ThenBy(t => t.HorarioInicio)
            .ToListAsync(ct);

        return turmas.Select(Mapeador.ParaDto).ToList();
    }

    public async Task<MatriculaDto> CriarMatriculaAsync(CriarMatriculaRequest request, CancellationToken ct = default)
    {
        var usuarioId = request.UsuarioId?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(usuarioId))
            throw new InvalidOperationException("UsuarioId é obrigatório.");
        if (string.IsNullOrWhiteSpace(request.CursoSlug))
            throw new InvalidOperationException("CursoSlug é obrigatório.");
        if (request.TurmaId <= 0)
            throw new InvalidOperationException("TurmaId inválido.");

        var curso = await db.Cursos
            .Include(c => c.Categoria)
            .Include(c => c.Modalidade)
            .Include(c => c.Status)
            .FirstOrDefaultAsync(c => c.Slug == request.CursoSlug && c.Ativo, ct)
            ?? throw new InvalidOperationException("Curso não encontrado.");

        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        if (curso.EtapaDesenvolvimento != "Publicado" ||
            curso.DataPublicacao is { } publicacao && publicacao > hoje)
            throw new InvalidOperationException("Este curso ainda não está publicado.");
        if (curso.DataLiberacaoMatricula is { } liberacao && liberacao > hoje)
            throw new InvalidOperationException("As matrículas deste curso ainda não foram liberadas.");
        if (curso.Status!.Slug == "em-breve")
            throw new InvalidOperationException("As matrículas deste curso ainda não foram liberadas.");

        var turma = await db.Turmas
            .Include(t => t.Modalidade)
            .Include(t => t.Matriculas)
            .FirstOrDefaultAsync(t => t.Id == request.TurmaId && t.CursoId == curso.Id && t.Ativa, ct)
            ?? throw new InvalidOperationException("Turma não encontrada para este curso.");

        if (turma.DataFim is not null && turma.DataFim < hoje)
            throw new InvalidOperationException("Esta turma já foi encerrada.");

        var existente = await db.Matriculas
            .Include(m => m.Curso!).ThenInclude(c => c.Categoria)
            .Include(m => m.Curso!).ThenInclude(c => c.Modalidade)
            .Include(m => m.Curso!).ThenInclude(c => c.Status)
            .Include(m => m.Turma!).ThenInclude(t => t.Modalidade)
            .FirstOrDefaultAsync(m => m.UsuarioId == usuarioId && m.TurmaId == turma.Id, ct);

        if (existente is not null)
            return Mapeador.ParaDto(existente);

        if (turma.Matriculas.Count >= turma.Vagas)
            throw new InvalidOperationException("Não há vagas disponíveis nesta turma.");

        var matricula = new Matricula
        {
            CursoId = curso.Id,
            TurmaId = turma.Id,
            UsuarioId = usuarioId,
            DataMatricula = DateTime.UtcNow,
            Status = "ativa",
            Progresso = 0,
            Concluido = false
        };

        db.Matriculas.Add(matricula);
        await db.SaveChangesAsync(ct);

        var criada = await db.Matriculas
            .AsNoTracking()
            .Include(m => m.Curso!).ThenInclude(c => c.Categoria)
            .Include(m => m.Curso!).ThenInclude(c => c.Modalidade)
            .Include(m => m.Curso!).ThenInclude(c => c.Status)
            .Include(m => m.Turma!).ThenInclude(t => t.Modalidade)
            .FirstAsync(m => m.Id == matricula.Id, ct);

        return Mapeador.ParaDto(criada);
    }

    public async Task<IReadOnlyList<MatriculaDto>> ListarMatriculasAsync(string usuarioId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(usuarioId))
            return [];

        var matriculas = await db.Matriculas
            .AsNoTracking()
            .Include(m => m.Curso!).ThenInclude(c => c.Categoria)
            .Include(m => m.Curso!).ThenInclude(c => c.Modalidade)
            .Include(m => m.Curso!).ThenInclude(c => c.Status)
            .Include(m => m.Turma!).ThenInclude(t => t.Modalidade)
            .Where(m => m.UsuarioId == usuarioId.Trim())
            .OrderByDescending(m => m.DataMatricula)
            .ToListAsync(ct);

        return matriculas.Select(Mapeador.ParaDto).ToList();
    }

    public async Task<CursoDetalheDto> CriarCursoAsync(CursoSalvarRequest request, CancellationToken ct = default)
    {
        var normalizado = NormalizarCurso(request) with
        {
            EtapaDesenvolvimento = request.EtapaDesenvolvimento ?? "Rascunho"
        };
        var (categoria, modalidade, status) = await ValidarCursoAsync(normalizado, null, ct);

        var curso = new Curso
        {
            NomeCompleto = normalizado.NomeCompleto.Trim(),
            NomeBreve = normalizado.NomeBreve.Trim(),
            Slug = normalizado.Slug,
            Descricao = normalizado.Descricao.Trim(),
            CargaHoraria = normalizado.CargaHoraria,
            PublicoAlvo = normalizado.PublicoAlvo?.Trim() ?? string.Empty,
            ImagemUrl = normalizado.ImagemUrl?.Trim() ?? string.Empty,
            DataDisponibilizacao = normalizado.DataDisponibilizacao,
            DataPublicacao = normalizado.DataPublicacao,
            DataLiberacaoMatricula = normalizado.DataLiberacaoMatricula,
            EtapaDesenvolvimento = normalizado.EtapaDesenvolvimento,
            Destaque = normalizado.Destaque,
            Ativo = true,
            Categoria = categoria,
            Modalidade = modalidade,
            Status = status
        };

        if (normalizado.Modulos is { Count: > 0 })
            AdicionarModulos(curso, normalizado.Modulos);

        db.Cursos.Add(curso);
        await db.SaveChangesAsync(ct);

        await CriarTurmasPadraoAsync(curso, modalidade, ct);
        await db.SaveChangesAsync(ct);

        return await ObterCursoSemFiltroDePublicacaoAsync(curso.Slug, ct)
            ?? throw new InvalidOperationException("Curso criado, mas não foi possível carregá-lo.");
    }

    public async Task<CursoDetalheDto?> AtualizarCursoAsync(string slug, CursoSalvarRequest request, CancellationToken ct = default)
    {
        var curso = await db.Cursos
            .Include(c => c.Modulos).ThenInclude(m => m.Aulas)
            .FirstOrDefaultAsync(c => c.Slug == slug && c.Ativo, ct);

        if (curso is null)
            return null;

        var normalizado = NormalizarCurso(request) with
        {
            EtapaDesenvolvimento = request.EtapaDesenvolvimento ?? curso.EtapaDesenvolvimento
        };
        var (categoria, modalidade, status) = await ValidarCursoAsync(normalizado, curso.Id, ct);

        curso.NomeCompleto = normalizado.NomeCompleto.Trim();
        curso.NomeBreve = normalizado.NomeBreve.Trim();
        curso.Slug = normalizado.Slug;
        curso.Descricao = normalizado.Descricao.Trim();
        curso.CargaHoraria = normalizado.CargaHoraria;
        curso.PublicoAlvo = normalizado.PublicoAlvo?.Trim() ?? string.Empty;
        curso.ImagemUrl = normalizado.ImagemUrl?.Trim() ?? string.Empty;
        curso.DataDisponibilizacao = normalizado.DataDisponibilizacao;
        curso.DataPublicacao = normalizado.DataPublicacao;
        curso.DataLiberacaoMatricula = normalizado.DataLiberacaoMatricula;
        curso.EtapaDesenvolvimento = normalizado.EtapaDesenvolvimento;
        curso.Destaque = normalizado.Destaque;
        curso.Categoria = categoria;
        curso.Modalidade = modalidade;
        curso.Status = status;

        if (normalizado.Modulos is not null)
        {
            db.Modulos.RemoveRange(curso.Modulos);
            curso.Modulos.Clear();
            AdicionarModulos(curso, normalizado.Modulos);
        }

        await db.SaveChangesAsync(ct);
        return await ObterCursoSemFiltroDePublicacaoAsync(curso.Slug, ct);
    }

    public async Task<bool> ExcluirCursoAsync(string slug, CancellationToken ct = default)
    {
        var curso = await db.Cursos
            .Include(c => c.Turmas)
            .FirstOrDefaultAsync(c => c.Slug == slug && c.Ativo, ct);

        if (curso is null)
            return false;

        curso.Ativo = false;
        // Libera o slug para que o mesmo endereço possa ser reutilizado em um novo curso.
        curso.Slug = $"{curso.Slug}-{curso.Id}-desativado";
        foreach (var turma in curso.Turmas)
            turma.Ativa = false;

        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<CategoriaAdminDto>> ListarCategoriasAdminAsync(CancellationToken ct = default)
    {
        var categorias = await db.Categorias.AsNoTracking()
            .OrderBy(c => c.Ordem)
            .ThenBy(c => c.Nome)
            .Select(c => new
            {
                c.Id,
                c.Nome,
                c.Slug,
                c.IconeUrl,
                c.Cor,
                c.Ordem,
                Cursos = c.Cursos.Count(curso => curso.Ativo)
            })
            .ToListAsync(ct);

        var traducoes = await db.CategoriasTraducoes.AsNoTracking().ToListAsync(ct);

        return categorias
            .Select(c => new CategoriaAdminDto(
                c.Id,
                c.Nome,
                c.Slug,
                c.IconeUrl,
                c.Cor,
                c.Ordem,
                c.Cursos,
                traducoes.FirstOrDefault(t => t.CategoriaId == c.Id && t.Idioma == "en-US")?.Nome ?? string.Empty,
                traducoes.FirstOrDefault(t => t.CategoriaId == c.Id && t.Idioma == "es-ES")?.Nome ?? string.Empty))
            .ToList();
    }

    public async Task<CategoriaAdminDto?> SalvarCategoriaAsync(
        int? id, CategoriaSalvarRequest request, CancellationToken ct = default)
    {
        var nome = (request.Nome ?? string.Empty).Trim();
        if (nome.Length < 2 || nome.Length > 120)
            throw new InvalidOperationException("Informe o nome da categoria com 2 a 120 caracteres.");

        var slug = GerarSlug(string.IsNullOrWhiteSpace(request.Slug) ? nome : request.Slug);
        if (slug.Length == 0)
            throw new InvalidOperationException("Não foi possível gerar o endereço (slug) da categoria.");

        var categorias = await db.Categorias.ToListAsync(ct);
        var alvo = id is null ? null : categorias.FirstOrDefault(c => c.Id == id);
        if (id is not null && alvo is null)
            return null;

        var ignorarId = id ?? 0;
        if (categorias.Any(c => c.Id != ignorarId && NormalizarTexto(c.Nome) == NormalizarTexto(nome)))
            throw new InvalidOperationException("Já existe uma categoria com esse nome. Edite a existente para evitar duplicidade.");
        if (categorias.Any(c => c.Id != ignorarId && c.Slug == slug))
            throw new InvalidOperationException("Já existe uma categoria com esse endereço (slug).");

        var ordem = request.Ordem ?? alvo?.Ordem ?? (categorias.Count == 0 ? 1 : categorias.Max(c => c.Ordem) + 1);

        var categoria = alvo ?? new Categoria();
        if (alvo is null)
            db.Categorias.Add(categoria);

        categoria.Nome = nome;
        categoria.Slug = slug;
        categoria.Cor = NormalizarCor(request.Cor);
        categoria.IconeUrl = string.IsNullOrWhiteSpace(request.IconeUrl) ? string.Empty : request.IconeUrl.Trim();
        categoria.Ordem = Math.Max(1, ordem);

        await db.SaveChangesAsync(ct);

        await DefinirTraducaoCategoriaAsync(categoria.Id, "en-US", request.NomeEn, ct);
        await DefinirTraducaoCategoriaAsync(categoria.Id, "es-ES", request.NomeEs, ct);
        await db.SaveChangesAsync(ct);

        return (await ListarCategoriasAdminAsync(ct)).FirstOrDefault(c => c.Id == categoria.Id);
    }

    public async Task<string?> ExcluirCategoriaAsync(int id, CancellationToken ct = default)
    {
        var categoria = await db.Categorias
            .Include(c => c.Cursos)
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        if (categoria is null)
            return "Categoria não encontrada.";

        if (categoria.Cursos.Count > 0)
            return $"A categoria \"{categoria.Nome}\" está vinculada a {categoria.Cursos.Count} curso(s) e não pode ser excluída. Mova os cursos para outra categoria antes.";

        db.Categorias.Remove(categoria);
        await db.SaveChangesAsync(ct);
        return null;
    }

    public async Task<IReadOnlyList<CategoriaSimilarDto>> BuscarCategoriasSimilaresAsync(
        string nome, int? ignorarId = null, CancellationToken ct = default)
    {
        var consulta = NormalizarTexto(nome ?? string.Empty);
        if (consulta.Length < 2)
            return Array.Empty<CategoriaSimilarDto>();

        var categorias = await db.Categorias.AsNoTracking().ToListAsync(ct);
        var ignorar = ignorarId ?? 0;

        return categorias
            .Where(c => c.Id != ignorar)
            .Select(c => new { Categoria = c, Score = Similaridade(consulta, NormalizarTexto(c.Nome)) })
            .Where(item => item.Score >= 45)
            .OrderByDescending(item => item.Score)
            .ThenBy(item => item.Categoria.Nome)
            .Take(5)
            .Select(item => new CategoriaSimilarDto(
                item.Categoria.Id,
                item.Categoria.Nome,
                item.Categoria.Slug,
                item.Categoria.Cor,
                item.Score))
            .ToList();
    }

    private async Task DefinirTraducaoCategoriaAsync(
        int categoriaId, string idioma, string? nome, CancellationToken ct)
    {
        var traducao = await db.CategoriasTraducoes
            .FirstOrDefaultAsync(t => t.CategoriaId == categoriaId && t.Idioma == idioma, ct);
        var valor = nome?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(valor))
        {
            if (traducao is not null)
                db.CategoriasTraducoes.Remove(traducao);
            return;
        }

        if (traducao is null)
        {
            db.CategoriasTraducoes.Add(new CategoriaTraducao
            {
                CategoriaId = categoriaId,
                Idioma = idioma,
                Nome = valor
            });
        }
        else
        {
            traducao.Nome = valor;
        }
    }

    private static string NormalizarTexto(string valor)
    {
        var decomposto = valor.Trim().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposto.Length);
        foreach (var caractere in decomposto)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(caractere) == UnicodeCategory.NonSpacingMark)
                continue;
            builder.Append(char.ToLowerInvariant(caractere));
        }
        return builder.ToString();
    }

    private static string GerarSlug(string valor)
    {
        var decomposto = valor.Trim().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposto.Length);
        foreach (var caractere in decomposto)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(caractere) == UnicodeCategory.NonSpacingMark)
                continue;
            builder.Append(char.IsLetterOrDigit(caractere) ? char.ToLowerInvariant(caractere) : '-');
        }

        return System.Text.RegularExpressions.Regex
            .Replace(builder.ToString(), "-+", "-")
            .Trim('-');
    }

    private static string NormalizarCor(string? cor)
    {
        if (string.IsNullOrWhiteSpace(cor))
            return "#6B7280";

        var valor = cor.Trim();
        if (!valor.StartsWith('#'))
            valor = $"#{valor}";

        if (!System.Text.RegularExpressions.Regex.IsMatch(valor, "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"))
            throw new InvalidOperationException("Informe a cor no formato hexadecimal, por exemplo #DEC8F8.");

        return valor.ToUpperInvariant();
    }

    private static int Similaridade(string a, string b)
    {
        if (a == b)
            return 100;

        var maior = Math.Max(a.Length, b.Length);
        if (maior == 0)
            return 100;

        var score = (int)Math.Round((1 - (double)DistanciaLevenshtein(a, b) / maior) * 100);
        if (a.Contains(b, StringComparison.Ordinal) || b.Contains(a, StringComparison.Ordinal))
            score = Math.Max(score, 85);

        return score;
    }

    private static int DistanciaLevenshtein(string a, string b)
    {
        var anterior = new int[b.Length + 1];
        var atual = new int[b.Length + 1];

        for (var j = 0; j <= b.Length; j++)
            anterior[j] = j;

        for (var i = 1; i <= a.Length; i++)
        {
            atual[0] = i;
            for (var j = 1; j <= b.Length; j++)
            {
                var custo = a[i - 1] == b[j - 1] ? 0 : 1;
                atual[j] = Math.Min(
                    Math.Min(atual[j - 1] + 1, anterior[j] + 1),
                    anterior[j - 1] + custo);
            }

            (anterior, atual) = (atual, anterior);
        }

        return anterior[b.Length];
    }

    public async Task<IReadOnlyList<PerguntaAdminDto>> ListarPerguntasAsync(string slug, CancellationToken ct = default)
    {
        var cursoId = await db.Cursos.AsNoTracking()
            .Where(c => c.Slug == slug && c.Ativo)
            .Select(c => (int?)c.Id)
            .FirstOrDefaultAsync(ct);

        if (cursoId is null)
            return Array.Empty<PerguntaAdminDto>();

        var perguntas = await db.CursosPerguntas.AsNoTracking()
            .Include(p => p.Traducoes)
            .Where(p => p.CursoId == cursoId)
            .OrderBy(p => p.Ordem)
            .ToListAsync(ct);

        return perguntas.Select(ParaPerguntaAdminDto).ToList();
    }

    public async Task<IReadOnlyList<PerguntaAdminDto>?> SalvarPerguntasAsync(
        string slug, IReadOnlyList<PerguntaAdminDto> perguntas, CancellationToken ct = default)
    {
        var curso = await db.Cursos
            .Include(c => c.Perguntas).ThenInclude(p => p.Traducoes)
            .FirstOrDefaultAsync(c => c.Slug == slug && c.Ativo, ct);

        if (curso is null)
            return null;

        // Substitui a lista inteira: o editor envia o conjunto completo (até 10 perguntas).
        db.CursosPerguntas.RemoveRange(curso.Perguntas);

        var ordem = 0;
        foreach (var item in perguntas
            .Where(p => !string.IsNullOrWhiteSpace(p.PerguntaPt) || !string.IsNullOrWhiteSpace(p.RespostaPt))
            .Take(10))
        {
            var pergunta = new CursoPergunta
            {
                CursoId = curso.Id,
                Ordem = ordem++,
                Ativa = item.Ativa
            };

            AdicionarTraducao(pergunta, "pt-BR", item.PerguntaPt, item.RespostaPt);
            AdicionarTraducao(pergunta, "en-US", item.PerguntaEn, item.RespostaEn);
            AdicionarTraducao(pergunta, "es-ES", item.PerguntaEs, item.RespostaEs);

            db.CursosPerguntas.Add(pergunta);
        }

        await db.SaveChangesAsync(ct);
        return await ListarPerguntasAsync(slug, ct);
    }

    private static void AdicionarTraducao(CursoPergunta pergunta, string idioma, string? texto, string? resposta)
    {
        if (string.IsNullOrWhiteSpace(texto) && string.IsNullOrWhiteSpace(resposta))
            return;

        pergunta.Traducoes.Add(new CursoPerguntaTraducao
        {
            Idioma = idioma,
            Pergunta = texto?.Trim() ?? string.Empty,
            Resposta = resposta?.Trim() ?? string.Empty
        });
    }

    private static PerguntaAdminDto ParaPerguntaAdminDto(CursoPergunta pergunta)
    {
        string Texto(string idioma) =>
            pergunta.Traducoes.FirstOrDefault(t => t.Idioma == idioma)?.Pergunta ?? string.Empty;
        string Resposta(string idioma) =>
            pergunta.Traducoes.FirstOrDefault(t => t.Idioma == idioma)?.Resposta ?? string.Empty;

        return new PerguntaAdminDto(
            pergunta.Id,
            pergunta.Ordem,
            pergunta.Ativa,
            Texto("pt-BR"), Resposta("pt-BR"),
            Texto("en-US"), Resposta("en-US"),
            Texto("es-ES"), Resposta("es-ES"));
    }

    public async Task<AvaliacaoDto?> SalvarAvaliacaoAsync(CriarAvaliacaoRequest request, CancellationToken ct = default)
    {
        var curso = await db.Cursos
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Slug == request.CursoSlug && c.Ativo, ct);

        if (curso is null)
            return null;

        var usuarioId = request.UsuarioId.Trim();
        var avaliacao = await db.Avaliacoes
            .FirstOrDefaultAsync(a => a.CursoId == curso.Id && a.UsuarioId == usuarioId, ct);

        if (avaliacao is null)
        {
            avaliacao = new AvaliacaoCurso { CursoId = curso.Id, UsuarioId = usuarioId };
            db.Avaliacoes.Add(avaliacao);
        }

        // Reenvio do mesmo aluno atualiza a avaliação em vez de duplicar.
        avaliacao.Nome = request.Nome.Trim();
        avaliacao.Nota = request.Nota;
        avaliacao.Depoimento = request.Depoimento?.Trim() ?? string.Empty;
        avaliacao.NotaPlataforma = request.NotaPlataforma;
        avaliacao.NotaCurso = request.NotaCurso;
        avaliacao.NotaAvaliacao = request.NotaAvaliacao;
        avaliacao.NotaAcessibilidade = request.NotaAcessibilidade;
        avaliacao.Sugestao = request.Sugestao?.Trim() ?? string.Empty;
        avaliacao.Idioma = NormalizarIdioma(request.Idioma);
        avaliacao.Publicada = true;
        avaliacao.AtualizadoEm = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        var nome = await NomeTraduzidoDoCursoAsync(curso.Id, curso.NomeBreve, avaliacao.Idioma, ct);
        return ParaAvaliacaoDto(avaliacao, curso.Slug, nome);
    }

    public async Task<IReadOnlyList<AvaliacaoDto>> ListarAvaliacoesAsync(
        string? cursoSlug = null, int limite = 20, string? idioma = null, CancellationToken ct = default)
    {
        var lang = NormalizarIdioma(idioma);
        var limiteNormalizado = Math.Clamp(limite, 1, 50);

        var consulta = db.Avaliacoes.AsNoTracking()
            .Include(a => a.Curso)
            .Where(a => a.Publicada && a.Curso!.Ativo);

        if (!string.IsNullOrWhiteSpace(cursoSlug))
            consulta = consulta.Where(a => a.Curso!.Slug == cursoSlug);

        var avaliacoes = await consulta
            .OrderByDescending(a => a.AtualizadoEm ?? a.CriadoEm)
            .Take(limiteNormalizado)
            .ToListAsync(ct);

        if (avaliacoes.Count == 0)
            return Array.Empty<AvaliacaoDto>();

        var cursoIds = avaliacoes.Select(a => a.CursoId).Distinct().ToList();
        var traducoes = await db.CursosTraducoes.AsNoTracking()
            .Where(t => t.Idioma == lang && cursoIds.Contains(t.CursoId))
            .ToDictionaryAsync(t => t.CursoId, t => t.NomeBreve, ct);

        return avaliacoes
            .Select(a => ParaAvaliacaoDto(
                a,
                a.Curso!.Slug,
                traducoes.TryGetValue(a.CursoId, out var nome) ? nome : a.Curso.NomeBreve))
            .ToList();
    }

    private async Task<string> NomeTraduzidoDoCursoAsync(
        int cursoId, string nomePadrao, string idioma, CancellationToken ct)
    {
        if (idioma == "pt-BR")
            return nomePadrao;

        var nome = await db.CursosTraducoes.AsNoTracking()
            .Where(t => t.CursoId == cursoId && t.Idioma == idioma)
            .Select(t => t.NomeBreve)
            .FirstOrDefaultAsync(ct);

        return string.IsNullOrWhiteSpace(nome) ? nomePadrao : nome;
    }

    private static AvaliacaoDto ParaAvaliacaoDto(AvaliacaoCurso avaliacao, string cursoSlug, string cursoNome) =>
        new(
            avaliacao.Id,
            cursoSlug,
            cursoNome,
            avaliacao.Nome,
            avaliacao.Nota,
            avaliacao.Depoimento,
            avaliacao.NotaPlataforma,
            avaliacao.NotaCurso,
            avaliacao.NotaAvaliacao,
            avaliacao.NotaAcessibilidade,
            avaliacao.Sugestao,
            avaliacao.CriadoEm);

    public async Task<SessaoScormDto> SalvarCommitScormAsync(CommitScormRequest request, CancellationToken ct = default)
    {
        var sessao = await db.SessoesScorm
            .FirstOrDefaultAsync(s => s.SessaoId == request.SessaoId, ct);

        if (sessao is null)
        {
            sessao = new SessaoScorm
            {
                SessaoId = request.SessaoId,
                AulaScormId = request.AulaScormId,
                UsuarioId = request.UsuarioId
            };
            db.SessoesScorm.Add(sessao);
        }

        var statusNormalizado = NormalizarStatus(request.LessonStatus);
        sessao.Status = statusNormalizado;
        sessao.Percentual = statusNormalizado == StatusSessao.Concluido
            ? 100
            : request.ProgressMeasure ?? sessao.Percentual;
        sessao.Score = request.Score ?? sessao.Score;

        var tentativa = new TentativaScorm
        {
            SessaoScorm = sessao,
            SuspendData = request.SuspendData,
            CmiStatus = request.LessonStatus,
            CmiEntry = request.Entry,
            CmiExit = request.Exit,
            LessonLocation = request.LessonLocation,
            SessionTime = request.SessionTime,
            ScoreRaw = request.Score,
            ProgressMeasure = request.ProgressMeasure,
            Interacoes = request.Interacoes,
            Objetivos = request.Objetivos,
            Fim = statusNormalizado == StatusSessao.Concluido ? DateTime.UtcNow : null
        };

        if (statusNormalizado == StatusSessao.Concluido)
            tentativa.TotalTime = request.SessionTime;

        db.TentativasScorm.Add(tentativa);

        await db.SaveChangesAsync(ct);

        return sessao.ParaDto(tentativa);
    }

    public async Task<SessaoScormDto?> ObterSessaoScormAsync(string sessaoId, CancellationToken ct = default)
    {
        var sessao = await db.SessoesScorm
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SessaoId == sessaoId, ct);

        if (sessao is null)
            return null;

        var ultima = await db.TentativasScorm
            .AsNoTracking()
            .Where(t => t.SessaoScormId == sessao.Id)
            .OrderByDescending(t => t.Id)
            .FirstOrDefaultAsync(ct);

        return sessao.ParaDto(ultima);
    }

    private static CursoSalvarRequest NormalizarCurso(CursoSalvarRequest request) =>
        request with
        {
            NomeCompleto = request.NomeCompleto?.Trim() ?? string.Empty,
            NomeBreve = request.NomeBreve?.Trim() ?? string.Empty,
            Slug = NormalizarSlug(request.Slug),
            Descricao = request.Descricao?.Trim() ?? string.Empty,
            PublicoAlvo = request.PublicoAlvo?.Trim() ?? string.Empty,
            ImagemUrl = request.ImagemUrl?.Trim() ?? string.Empty
        };

    private static string NormalizarSlug(string? valor) =>
        (valor ?? string.Empty).Trim().ToLowerInvariant();

    private async Task<(Categoria Categoria, Modalidade Modalidade, StatusCurso Status)> ValidarCursoAsync(
        CursoSalvarRequest request, int? ignorarCursoId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.NomeCompleto) ||
            string.IsNullOrWhiteSpace(request.NomeBreve) ||
            string.IsNullOrWhiteSpace(request.Slug))
            throw new InvalidOperationException("Nome completo, nome breve e slug são obrigatórios.");
        if (string.IsNullOrWhiteSpace(request.Descricao))
            throw new InvalidOperationException("Descrição é obrigatória.");
        if (request.CargaHoraria <= 0)
            throw new InvalidOperationException("Carga horária deve ser maior que zero.");
        if (request.EtapaDesenvolvimento is not ("Rascunho" or "Homologado" or "Publicado"))
            throw new InvalidOperationException("Etapa de desenvolvimento inválida.");
        if (request.DataLiberacaoMatricula is not null &&
            request.DataPublicacao is not null &&
            request.DataLiberacaoMatricula < request.DataPublicacao)
            throw new InvalidOperationException("A liberação de matrícula não pode anteceder a data de publicação.");

        var slugEmUso = await db.Cursos.AnyAsync(
            c => c.Slug == request.Slug && c.Ativo && c.Id != (ignorarCursoId ?? 0), ct);
        if (slugEmUso)
            throw new InvalidOperationException("Já existe um curso com este slug.");

        var categoria = await db.Categorias.FirstOrDefaultAsync(c => c.Slug == request.CategoriaSlug, ct)
            ?? throw new InvalidOperationException("Categoria inválida.");
        var modalidade = await db.Modalidades.FirstOrDefaultAsync(m => m.Slug == request.ModalidadeSlug, ct)
            ?? throw new InvalidOperationException("Modalidade inválida.");
        var status = await db.StatusCursos.FirstOrDefaultAsync(s => s.Slug == request.StatusSlug, ct)
            ?? throw new InvalidOperationException("Status inválido.");

        return (categoria, modalidade, status);
    }

    private static void AdicionarModulos(Curso curso, IReadOnlyList<ModuloSalvarDto> modulos)
    {
        var ordemModulo = 1;
        foreach (var moduloDto in modulos.Where(m => !string.IsNullOrWhiteSpace(m.Titulo)))
        {
            var titulo = moduloDto.Titulo.Trim();
            var modulo = new Modulo
            {
                Ordem = ordemModulo++,
                Titulo = titulo,
                Descricao = string.IsNullOrWhiteSpace(moduloDto.Descricao)
                    ? $"Módulo \"{titulo}\" do curso {curso.NomeBreve}."
                    : moduloDto.Descricao.Trim()
            };

            var ordemAula = 1;
            foreach (var tituloAula in (moduloDto.Aulas ?? []).Where(a => !string.IsNullOrWhiteSpace(a)))
            {
                modulo.Aulas.Add(new Aula
                {
                    Ordem = ordemAula++,
                    Titulo = tituloAula.Trim(),
                    Descricao = $"{tituloAula.Trim()} — conteúdo do módulo {titulo}.",
                    DuracaoMinutos = 30
                });
            }

            curso.Modulos.Add(modulo);
        }
    }

    private async Task CriarTurmasPadraoAsync(Curso curso, Modalidade modalidade, CancellationToken ct)
    {
        var semi = await db.Modalidades.FirstOrDefaultAsync(m => m.Slug == "semi-presencial", ct)
            ?? modalidade;
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);

        db.Turmas.AddRange(
            new Turma
            {
                CursoId = curso.Id,
                ModalidadeId = modalidade.Id,
                Codigo = $"{curso.Slug}-T1",
                DataInicio = hoje.AddDays(14),
                DataFim = hoje.AddDays(70),
                DiasSemana = "Ter,Qui",
                HorarioInicio = new TimeOnly(19, 0),
                HorarioFim = new TimeOnly(21, 0),
                Vagas = 30,
                Ativa = true
            },
            new Turma
            {
                CursoId = curso.Id,
                ModalidadeId = semi.Id,
                Codigo = $"{curso.Slug}-T2",
                DataInicio = hoje.AddDays(28),
                DataFim = hoje.AddDays(84),
                DiasSemana = "Sáb",
                HorarioInicio = new TimeOnly(8, 0),
                HorarioFim = new TimeOnly(12, 0),
                Vagas = 24,
                Ativa = true
            });
    }

    private static StatusSessao NormalizarStatus(string? lessonStatus) => lessonStatus?.Trim().ToLowerInvariant() switch
    {
        "completed" or "passed" or "concluido" => StatusSessao.Concluido,
        "incomplete" or "browsed" or "failed" or "em-andamento" => StatusSessao.EmAndamento,
        _ => StatusSessao.NaoIniciado
    };
}
