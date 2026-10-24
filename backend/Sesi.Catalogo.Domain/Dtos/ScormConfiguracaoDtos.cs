namespace Sesi.Catalogo.Domain.Dtos;

public record ScormConfiguracaoDto(int LimiteUploadMb);

public record AtualizarLimiteScormRequest(int LimiteUploadMb);

/// <summary>
/// Configuração da página pública de um curso SCORM.
/// <c>Idiomas</c> lista os idiomas em que o pacote foi disponibilizado
/// (pt-BR, en-US, es-ES) e <c>IdiomaPadrao</c> indica o idioma exibido
/// quando o visitante escolhe um idioma ainda não traduzido.
/// </summary>
public record ScormPaginaConfigDto(
    string Titulo,
    string Subtitulo,
    string Descricao,
    string BannerUrl,
    string ImagemUrl,
    int CargaHoraria,
    string BotaoTexto,
    IReadOnlyList<string>? Idiomas = null,
    string? IdiomaPadrao = null);
