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

        var facetas = await ObterFacetasAsync(new CursoFiltro(Idioma: idioma), ct);

        return new PaginaDto<CursoResumoDto>(
            itens.Select(c => Mapeador.ParaResumoDto(
                c,
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

    public async Task<CursoDetalheDto?> ObterCursoPorSlugAsync(string slug, CancellationToken ct = default)
    {
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        var curso = await db.Cursos
            .AsNoTracking()
            .Include(c => c.Categoria)
            .Include(c => c.Modalidade)
            .Include(c => c.Status)
            .Include(c => c.Modulos).ThenInclude(m => m.Aulas)
            .FirstOrDefaultAsync(c =>
                c.Slug == slug &&
                c.Ativo &&
                c.EtapaDesenvolvimento == "Publicado" &&
                (c.DataPublicacao == null || c.DataPublicacao <= hoje), ct);

        return curso?.ParaDetalheDto();
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

    public async Task<FacetasDto> ObterFacetasAsync(CancellationToken ct = default)
    {
        var categorias = await db.Categorias.AsNoTracking()
            .OrderBy(c => c.Ordem)
            .Select(c => new CategoriaDto(c.Id, c.Nome, c.Slug, c.IconeUrl, c.Cor, c.Ordem))
            .ToListAsync(ct);

        var modalidades = await db.Modalidades.AsNoTracking()
            .OrderBy(m => m.Id)
            .Select(m => new ModalidadeDto(m.Id, m.Nome, m.Slug))
            .ToListAsync(ct);

        var status = await db.StatusCursos.AsNoTracking()
            .OrderBy(s => s.Id)
            .Select(s => new StatusCursoDto(s.Id, s.Nome, s.Slug))
            .ToListAsync(ct);

        return new FacetasDto(categorias, modalidades, status);
    }

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
