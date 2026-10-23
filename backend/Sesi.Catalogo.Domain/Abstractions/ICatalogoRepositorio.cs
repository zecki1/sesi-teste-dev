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

    /// <summary>Lista as turmas ativas de um curso pelo slug.</summary>
    Task<IReadOnlyList<TurmaDto>> ListarTurmasAsync(string slug, CancellationToken ct = default);

    /// <summary>Cria (ou devolve existente) a matrícula do aluno em uma turma.</summary>
    Task<MatriculaDto> CriarMatriculaAsync(CriarMatriculaRequest request, CancellationToken ct = default);

    /// <summary>Lista as matrículas de um aluno.</summary>
    Task<IReadOnlyList<MatriculaDto>> ListarMatriculasAsync(string usuarioId, CancellationToken ct = default);

    /// <summary>Cria um curso e devolve o detalhe persistido.</summary>
    Task<CursoDetalheDto> CriarCursoAsync(CursoSalvarRequest request, CancellationToken ct = default);

    /// <summary>Atualiza os metadados de um curso existente.</summary>
    Task<CursoDetalheDto?> AtualizarCursoAsync(string slug, CursoSalvarRequest request, CancellationToken ct = default);

    /// <summary>Desativa um curso (exclusão lógica).</summary>
    Task<bool> ExcluirCursoAsync(string slug, CancellationToken ct = default);

    /// <summary>Persiste um commit SCORM e devolve o estado agregado da sessão.</summary>
    Task<SessaoScormDto> SalvarCommitScormAsync(CommitScormRequest request, CancellationToken ct = default);

    /// <summary>Recupera o estado atual de uma sessão SCORM.</summary>
    Task<SessaoScormDto?> ObterSessaoScormAsync(string sessaoId, CancellationToken ct = default);
}
