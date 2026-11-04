namespace Sesi.Catalogo.Domain.Dtos;

public record TutorRequest(
    string Mensagem,
    string? UsuarioId = null,
    string? NomeAluno = null,
    IReadOnlyList<TutorMensagemHistorico>? Historico = null,
    string? Contexto = null);

public record TutorMensagemHistorico(string Papel, string Texto);

public record TutorResponse(string Resposta);
