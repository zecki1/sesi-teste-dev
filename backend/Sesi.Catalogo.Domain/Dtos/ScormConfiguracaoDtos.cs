namespace Sesi.Catalogo.Domain.Dtos;

public record ScormConfiguracaoDto(int LimiteUploadMb);

public record AtualizarLimiteScormRequest(int LimiteUploadMb);

public record ScormPaginaConfigDto(
    string Titulo,
    string Subtitulo,
    string Descricao,
    string BannerUrl,
    string ImagemUrl,
    int CargaHoraria,
    string BotaoTexto);
