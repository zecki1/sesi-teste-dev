using Sesi.Catalogo.Domain.Dtos;

namespace Sesi.Catalogo.Domain.Abstractions;

/// <summary>
/// Contrato de leitura/escrita do catálogo (implementado na Infrastructure).
/// </summary>
public interface ICatalogoRepositorio
{
    /// <summary>Lista cursos paginados com filtros, junto das facetas.</summary>
    Task<PaginaDto<CursoResumoDto>> ListarCursosAsync(CursoFiltro filtro, CancellationToken ct = default);

    /// <summary>Obtém o detalhe de um curso pelo slug (com módulos e aulas).</summary>
    Task<CursoDetalheDto?> ObterCursoPorSlugAsync(string slug, CancellationToken ct = default);

    /// <summary>Retorna as facetas (categorias, modalidades e status).</summary>
    Task<FacetasDto> ObterFacetasAsync(CancellationToken ct = default);

    /// <summary>Progresso agregado de um aluno em um curso.</summary>
    Task<ProgressoCursoDto?> ObterProgressoAsync(string slug, string? usuarioId, CancellationToken ct = default);

    /// <summary>Persiste um commit SCORM e devolve o estado agregado da sessão.</summary>
    Task<SessaoScormDto> SalvarCommitScormAsync(CommitScormRequest request, CancellationToken ct = default);

    /// <summary>Recupera o estado atual de uma sessão SCORM.</summary>
    Task<SessaoScormDto?> ObterSessaoScormAsync(string sessaoId, CancellationToken ct = default);
}
