using Sesi.Catalogo.Domain.Dtos;

namespace Sesi.Catalogo.Domain.Abstractions;

/// <summary>
/// Contrato de leitura/escrita do catálogo (implementado na Infrastructure).
/// </summary>
public interface ICatalogoRepositorio
{
    /// <summary>Lista cursos paginados com filtros, junto das facetas.</summary>
    Task<PaginaDto<CursoResumoDto>> ListarCursosAsync(CursoFiltro filtro, CancellationToken ct = default);

    /// <summary>Lista cursos de qualquer etapa para a tela administrativa local.</summary>
    Task<IReadOnlyList<CursoResumoDto>> ListarCursosAdministracaoAsync(CancellationToken ct = default);

    /// <summary>Obtém o detalhe de um curso pelo slug (com módulos e aulas).</summary>
    Task<CursoDetalheDto?> ObterCursoPorSlugAsync(string slug, string? idioma = null, CancellationToken ct = default);

    /// <summary>Retorna as facetas (categorias, modalidades e status).</summary>
    Task<FacetasDto> ObterFacetasAsync(string? idioma = null, CancellationToken ct = default);
    Task<FacetasDto> ObterFacetasAsync(CancellationToken ct = default);
    Task<FacetasDto> ObterFacetasAsync(CursoFiltro? filtro, CancellationToken ct = default);

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

    /// <summary>Lista as categorias com traduções e quantidade de cursos ativos (gestão).</summary>
    Task<IReadOnlyList<CategoriaAdminDto>> ListarCategoriasAdminAsync(CancellationToken ct = default);

    /// <summary>Cria ou atualiza uma categoria. Retorna null quando o id informado não existe.</summary>
    Task<CategoriaAdminDto?> SalvarCategoriaAsync(
        int? id, CategoriaSalvarRequest request, CancellationToken ct = default);

    /// <summary>Exclui uma categoria sem cursos. Retorna a mensagem de erro ou null em caso de sucesso.</summary>
    Task<string?> ExcluirCategoriaAsync(int id, CancellationToken ct = default);

    /// <summary>Busca categorias com nome parecido, para evitar duplicidade no cadastro.</summary>
    Task<IReadOnlyList<CategoriaSimilarDto>> BuscarCategoriasSimilaresAsync(
        string nome, int? ignorarId = null, CancellationToken ct = default);

    /// <summary>Lista as perguntas frequentes do curso com os três idiomas (visão administrativa).</summary>
    Task<IReadOnlyList<PerguntaAdminDto>> ListarPerguntasAsync(string slug, CancellationToken ct = default);

    /// <summary>Substitui as perguntas frequentes do curso. Retorna null quando o curso não existe.</summary>
    Task<IReadOnlyList<PerguntaAdminDto>?> SalvarPerguntasAsync(
        string slug, IReadOnlyList<PerguntaAdminDto> perguntas, CancellationToken ct = default);

    /// <summary>Persiste a avaliação do aluno (uma por curso; reenvio atualiza a existente).</summary>
    Task<AvaliacaoDto?> SalvarAvaliacaoAsync(CriarAvaliacaoRequest request, CancellationToken ct = default);

    /// <summary>Lista avaliações publicadas, opcionalmente filtrando por curso.</summary>
    Task<IReadOnlyList<AvaliacaoDto>> ListarAvaliacoesAsync(
        string? cursoSlug = null, int limite = 20, string? idioma = null, CancellationToken ct = default);

    /// <summary>Persiste um commit SCORM e devolve o estado agregado da sessão.</summary>
    Task<SessaoScormDto> SalvarCommitScormAsync(CommitScormRequest request, CancellationToken ct = default);

    /// <summary>Recupera o estado atual de uma sessão SCORM.</summary>
    Task<SessaoScormDto?> ObterSessaoScormAsync(string sessaoId, CancellationToken ct = default);

    // ---------- Gestão acadêmica (turmas, matrículas e notas) ----------

    /// <summary>Lista todas as turmas para a gestão acadêmica.</summary>
    Task<IReadOnlyList<TurmaAdminDto>> ListarTurmasAdminAsync(CancellationToken ct = default);

    /// <summary>Cria ou atualiza uma turma. Retorna null quando o id informado não existe.</summary>
    Task<TurmaAdminDto?> SalvarTurmaAdminAsync(int? id, SalvarTurmaRequest request, CancellationToken ct = default);

    /// <summary>Exclui uma turma sem matrículas. Retorna a mensagem de erro ou null em caso de sucesso.</summary>
    Task<string?> ExcluirTurmaAdminAsync(int id, CancellationToken ct = default);

    /// <summary>Lista matrículas para a gestão, filtrando opcionalmente por turma ou curso.</summary>
    Task<IReadOnlyList<MatriculaAdminDto>> ListarMatriculasAdminAsync(int? turmaId = null, string? cursoSlug = null, CancellationToken ct = default);

    /// <summary>Cria/atualiza uma matrícula pelo admin. Retorna null quando a turma não existe.</summary>
    Task<MatriculaAdminDto?> SalvarMatriculaAdminAsync(int? id, SalvarMatriculaAdminRequest request, CancellationToken ct = default);

    /// <summary>Remove uma matrícula e suas notas.</summary>
    Task<bool> ExcluirMatriculaAdminAsync(int id, CancellationToken ct = default);

    /// <summary>Lista as notas de uma matrícula.</summary>
    Task<IReadOnlyList<NotaDto>> ListarNotasAsync(int matriculaId, CancellationToken ct = default);

    /// <summary>Lanca ou atualiza uma nota. Retorna null quando a matrícula não existe.</summary>
    Task<NotaDto?> SalvarNotaAsync(int matriculaId, int? id, SalvarNotaRequest request, CancellationToken ct = default);

    /// <summary>Remove uma nota.</summary>
    Task<bool> ExcluirNotaAsync(int id, CancellationToken ct = default);

    /// <summary>Monta o boletim completo do aluno.</summary>
    Task<BoletimDto> ObterBoletimAsync(string usuarioId, CancellationToken ct = default);

    // ---------- Comunidade da turma (fórum, chat, plantão) ----------

    /// <summary>Lista as mensagens de uma turma em um canal.</summary>
    Task<IReadOnlyList<MensagemComunidadeDto>> ListarMensagensComunidadeAsync(int turmaId, string canal, CancellationToken ct = default);

    /// <summary>Publica uma mensagem na comunidade da turma.</summary>
    Task<MensagemComunidadeDto> CriarMensagemComunidadeAsync(EnviarMensagemComunidadeRequest request, CancellationToken ct = default);

    // ---------- Aulas ao vivo (semi-presencial) ----------

    /// <summary>Lista as aulas ao vivo de uma turma.</summary>
    Task<IReadOnlyList<AulaAoVivoDto>> ListarAulasAoVivoAsync(int turmaId, CancellationToken ct = default);

    /// <summary>Cria uma aula ao vivo.</summary>
    Task<AulaAoVivoDto> CriarAulaAoVivoAsync(SalvarAulaAoVivoRequest request, CancellationToken ct = default);

    /// <summary>Registra a presença de um aluno em uma aula.</summary>
    Task<PresencaAulaDto> RegistrarPresencaAulaAsync(int aulaId, string usuarioId, bool presente, CancellationToken ct = default);

    /// <summary>Lista as presenças de uma aula.</summary>
    Task<IReadOnlyList<PresencaAulaDto>> ListarPresencasAulaAsync(int aulaId, CancellationToken ct = default);
}
