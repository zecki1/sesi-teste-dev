using Microsoft.EntityFrameworkCore;
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
    public async Task<PaginaDto<CursoResumoDto>> ListarCursosAsync(CursoFiltro filtro, CancellationToken ct = default)
    {
        var pagina = filtro.Pagina < 1 ? 1 : filtro.Pagina;
        var tamanho = filtro.Tamanho switch
        {
            < 1 => 12,
            > 48 => 48,
            _ => filtro.Tamanho
        };

        var query = db.Cursos
            .AsNoTracking()
            .Include(c => c.Categoria)
            .Include(c => c.Modalidade)
            .Include(c => c.Status)
            .Where(c => c.Ativo);

        if (!string.IsNullOrWhiteSpace(filtro.Busca))
        {
            var termo = filtro.Busca.Trim().ToLower();
            query = query.Where(c =>
                c.NomeCompleto.ToLower().Contains(termo) ||
                c.NomeBreve.ToLower().Contains(termo) ||
                c.Descricao.ToLower().Contains(termo));
        }

        if (!string.IsNullOrWhiteSpace(filtro.Categoria))
            query = query.Where(c => c.Categoria!.Slug == filtro.Categoria);

        if (!string.IsNullOrWhiteSpace(filtro.Modalidade))
            query = query.Where(c => c.Modalidade!.Slug == filtro.Modalidade);

        if (!string.IsNullOrWhiteSpace(filtro.Status))
            query = query.Where(c => c.Status!.Slug == filtro.Status);

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

        var facetas = await ObterFacetasAsync(ct);

        return new PaginaDto<CursoResumoDto>(
            itens.Select(Mapeador.ParaResumoDto).ToList(),
            total, pagina, tamanho, facetas);
    }

    public async Task<CursoDetalheDto?> ObterCursoPorSlugAsync(string slug, CancellationToken ct = default)
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
        var curso = await db.Cursos
            .AsNoTracking()
            .Include(c => c.Modulos).ThenInclude(m => m.Aulas)
            .FirstOrDefaultAsync(c => c.Slug == slug && c.Ativo, ct);

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

    private static StatusSessao NormalizarStatus(string? lessonStatus) => lessonStatus?.Trim().ToLowerInvariant() switch
    {
        "completed" or "passed" or "concluido" => StatusSessao.Concluido,
        "incomplete" or "browsed" or "failed" or "em-andamento" => StatusSessao.EmAndamento,
        _ => StatusSessao.NaoIniciado
    };
}
