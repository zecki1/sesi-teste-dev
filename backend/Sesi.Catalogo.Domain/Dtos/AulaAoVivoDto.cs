namespace Sesi.Catalogo.Domain.Dtos;

/// <summary>Aula ao vivo de uma turma.</summary>
public record AulaAoVivoDto(
    int Id,
    int TurmaId,
    string Titulo,
    string? Descricao,
    DateTime DataHora,
    int DuracaoMinutos,
    string Sala,
    string UrlSala,
    int Presentes);

/// <summary>Criação/edição de aula ao vivo.</summary>
public record SalvarAulaAoVivoRequest(
    int TurmaId,
    string Titulo,
    string? Descricao,
    DateTime DataHora,
    int DuracaoMinutos = 60);

/// <summary>Registro de presença.</summary>
public record RegistrarPresencaRequest(string UsuarioId, bool Presente = true);
public record PresencaAulaDto(
    int AulaAoVivoId,
    string UsuarioId,
    bool Presente,
    DateTime RegistradoEm);
