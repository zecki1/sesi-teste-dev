namespace Sesi.Catalogo.Api.Gestao;

public sealed record UsuarioGestaoDto(
    string Id,
    string Nome,
    string Email,
    string Papel,
    bool Ativo,
    DateTime CriadoEm);

public sealed record SalvarUsuarioGestaoRequest(
    string Nome,
    string Email,
    string Papel,
    bool Ativo = true);

public sealed record RegistrarAlunoRequest(string Nome, string Email);

public sealed record CriarContaAlunoRequest(string Nome, string Email, string Senha);

public sealed record AutenticarAlunoRequest(string Email, string Senha);

public sealed record PermissaoPapelDto(
    string Papel,
    bool Criar,
    bool Editar,
    bool Excluir,
    bool Visualizar);

public sealed record ChamadoDto(
    string Id,
    string Protocolo,
    string Nome,
    string Email,
    string Categoria,
    string Descricao,
    string Pagina,
    string Status,
    string? Resposta,
    DateTime CriadoEm,
    DateTime? AtualizadoEm,
    string? CapturaTela = null);

public sealed record CriarChamadoRequest(
    string Nome,
    string Email,
    string Categoria,
    string Descricao,
    string Pagina,
    string? CapturaTela = null);

public sealed record AtualizarChamadoRequest(string Status, string? Resposta);

public sealed record MarcoCursoDto(
    string CursoSlug,
    string UsuarioId,
    DateTime? IniciadoEm,
    DateTime? ConcluidoEm);

public sealed record AtualizarMarcoCursoRequest(
    string CursoSlug,
    string UsuarioId,
    string Marco,
    int Percentual = 0);
