namespace Sesi.Catalogo.Domain.Dtos;

/// <summary>Mensagem da comunidade de uma turma.</summary>
public record MensagemComunidadeDto(
    int Id,
    int TurmaId,
    string UsuarioId,
    string UsuarioNome,
    string Canal,
    string? Titulo,
    string Conteudo,
    int? ParentId,
    DateTime CriadoEm);

/// <summary>Envio de uma mensagem à comunidade.</summary>
public record EnviarMensagemComunidadeRequest(
    int TurmaId,
    string UsuarioId,
    string UsuarioNome,
    string Canal,
    string? Titulo,
    string Conteudo,
    int? ParentId = null);
