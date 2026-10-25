using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using Sesi.Catalogo.Domain.Dtos;

namespace Sesi.Catalogo.Api.Scorm;

/// <summary>
/// Armazena pacotes SCORM extraídos em disco e o progresso por aluno.
/// O conteúdo fica em uma pasta pública servida em <c>/scorm</c>; o índice e o
/// progresso ficam em uma pasta privada fora do diretório estático.
/// </summary>
public sealed class ScormArmazenamento
{
    private const int LimitePadraoUploadMb = 100;
    private const int LimiteMaximoExpandidoMb = 200;
    private static readonly int[] LimitesUploadMb = [20, 50, 80, 100, 200];

    private static readonly JsonSerializerOptions JsonOpcoes = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
    };

    private readonly string _raizPublica;
    private readonly string _raizPrivada;
    private readonly string _arquivoIndice;
    private readonly string _arquivoConfiguracao;
    private readonly string _arquivoPaginas;
    private readonly SemaphoreSlim _trava = new(1, 1);
    private readonly SemaphoreSlim _travaProgresso = new(1, 1);

    public ScormArmazenamento(IWebHostEnvironment ambiente, IConfiguration configuracao)
    {
        var raiz = configuracao["Scorm:Root"];
        if (string.IsNullOrWhiteSpace(raiz))
            raiz = Path.Combine(ambiente.ContentRootPath, "App_Data", "scorm");

        _raizPublica = Path.Combine(raiz, "pacotes");
        _raizPrivada = Path.Combine(raiz, "privado");
        _arquivoIndice = Path.Combine(_raizPrivada, "pacotes.json");
        _arquivoConfiguracao = Path.Combine(_raizPrivada, "configuracao.json");
        _arquivoPaginas = Path.Combine(_raizPrivada, "paginas-scorm.json");

        Directory.CreateDirectory(_raizPublica);
        Directory.CreateDirectory(_raizPrivada);
        Directory.CreateDirectory(Path.Combine(_raizPrivada, "progresso"));
    }

    public string RaizPublica => _raizPublica;

    public async Task<ScormConfiguracaoDto> ObterConfiguracaoAsync(CancellationToken ct)
    {
        await _trava.WaitAsync(ct);
        try
        {
            if (!File.Exists(_arquivoConfiguracao))
                return new ScormConfiguracaoDto(LimitePadraoUploadMb);

            await using var stream = File.OpenRead(_arquivoConfiguracao);
            var configuracao = await JsonSerializer.DeserializeAsync<ScormConfiguracaoDto>(stream, JsonOpcoes, ct);
            if (configuracao is null || !LimitesUploadMb.Contains(configuracao.LimiteUploadMb))
                throw new InvalidDataException("A configuração persistida do limite de upload SCORM é inválida.");
            return configuracao;
        }
        finally
        {
            _trava.Release();
        }
    }

    public async Task<ScormConfiguracaoDto> AtualizarConfiguracaoAsync(
        AtualizarLimiteScormRequest request,
        CancellationToken ct)
    {
        if (!LimitesUploadMb.Contains(request.LimiteUploadMb))
            throw new InvalidOperationException("Selecione um limite de upload entre 20, 50, 80, 100 ou 200 MB.");

        var configuracao = new ScormConfiguracaoDto(request.LimiteUploadMb);
        await _trava.WaitAsync(ct);
        try
        {
            await GravarJsonAsync(_arquivoConfiguracao, configuracao, ct);
            return configuracao;
        }
        finally
        {
            _trava.Release();
        }
    }

    public async Task<ScormPaginaConfigDto?> ObterConfiguracaoPaginaAsync(string cursoSlug, CancellationToken ct)
    {
        var slug = NormalizarSlug(cursoSlug);
        await _trava.WaitAsync(ct);
        try
        {
            var paginas = await LerPaginasAsync(ct);
            return paginas.GetValueOrDefault(slug);
        }
        finally
        {
            _trava.Release();
        }
    }

    public async Task<ScormPaginaConfigDto> SalvarConfiguracaoPaginaAsync(
        string cursoSlug,
        ScormPaginaConfigDto configuracao,
        CancellationToken ct)
    {
        var slug = NormalizarSlug(cursoSlug);
        if (string.IsNullOrWhiteSpace(slug))
            throw new InvalidOperationException("Informe o slug do curso.");
        var titulo = configuracao.Titulo?.Trim() ?? string.Empty;
        var subtitulo = configuracao.Subtitulo?.Trim() ?? string.Empty;
        var descricao = configuracao.Descricao?.Trim() ?? string.Empty;
        var bannerUrl = configuracao.BannerUrl?.Trim() ?? string.Empty;
        var imagemUrl = configuracao.ImagemUrl?.Trim() ?? string.Empty;
        var botaoTexto = configuracao.BotaoTexto?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(titulo) || titulo.Length > 200)
            throw new InvalidOperationException("O título da página é obrigatório e deve ter até 200 caracteres.");
        if (subtitulo.Length > 500 || descricao.Length > 2000)
            throw new InvalidOperationException("O subtítulo deve ter até 500 caracteres e a descrição até 2.000.");
        if (bannerUrl.Length > 2048 || imagemUrl.Length > 2048)
            throw new InvalidOperationException("As URLs das imagens devem ter até 2.048 caracteres.");
        if (configuracao.CargaHoraria <= 0)
            throw new InvalidOperationException("A carga horária deve ser maior que zero.");
        if (string.IsNullOrWhiteSpace(botaoTexto) || botaoTexto.Length > 50)
            throw new InvalidOperationException("O texto do botão é obrigatório e deve ter até 50 caracteres.");

        var idiomas = (configuracao.Idiomas ?? [])
            .Select(NormalizarIdioma)
            .Where(idioma => idioma is not null)
            .Select(idioma => idioma!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (idiomas.Count == 0)
            idiomas.Add("pt-BR");

        var idiomaPadrao = NormalizarIdioma(configuracao.IdiomaPadrao) ?? idiomas[0];
        if (!idiomas.Contains(idiomaPadrao, StringComparer.OrdinalIgnoreCase))
            idiomas.Add(idiomaPadrao);

        configuracao = configuracao with
        {
            Titulo = titulo,
            Subtitulo = subtitulo,
            Descricao = descricao,
            BannerUrl = bannerUrl,
            ImagemUrl = imagemUrl,
            BotaoTexto = botaoTexto,
            Idiomas = idiomas,
            IdiomaPadrao = idiomaPadrao,
        };

        await _trava.WaitAsync(ct);
        try
        {
            var paginas = await LerPaginasAsync(ct);
            paginas[slug] = configuracao;
            await GravarJsonAsync(_arquivoPaginas, paginas, ct);
            return configuracao;
        }
        finally
        {
            _trava.Release();
        }
    }

    public async Task<string?> ObterCaminhoDownloadAsync(string id, CancellationToken ct)
    {
        var pacote = await ObterPorIdAsync(id, ct);
        if (pacote is null) return null;

        var caminho = Path.Combine(_raizPrivada, $"{pacote.Id}.zip");
        return File.Exists(caminho) ? caminho : null;
    }

    public async Task<ScormPacoteDto> SalvarAsync(
        string cursoSlug,
        string nomeArquivo,
        long tamanho,
        Stream conteudo,
        string? versaoSolicitada,
        CancellationToken ct)
    {
        var slug = NormalizarSlug(cursoSlug);
        if (string.IsNullOrWhiteSpace(slug))
            throw new InvalidOperationException("Informe o slug do curso para o pacote SCORM.");

        if (!string.Equals(Path.GetExtension(nomeArquivo), ".zip", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Envie o pacote SCORM no formato .zip.");
        var nomeArquivoSeguro = Path.GetFileName(nomeArquivo.Replace('\\', '/'));

        var configuracao = await ObterConfiguracaoAsync(ct);
        var tamanhoMaximoUpload = (long)configuracao.LimiteUploadMb * 1024 * 1024;
        if (tamanho > tamanhoMaximoUpload)
            throw new InvalidOperationException($"O pacote excede o limite configurado de {configuracao.LimiteUploadMb} MB.");

        var temporario = Path.Combine(_raizPublica, $".tmp-{Guid.NewGuid():N}");
        var zipTemporario = Path.Combine(_raizPrivada, $".tmp-{Guid.NewGuid():N}.zip");
        Directory.CreateDirectory(temporario);

        var id = Guid.NewGuid().ToString("N")[..12];
        var destino = Path.Combine(_raizPublica, id);
        var caminhoZip = Path.Combine(_raizPrivada, $"{id}.zip");
        var indiceAtualizado = false;

        try
        {
            await using (var arquivoZip = new FileStream(zipTemporario, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                await conteudo.CopyToAsync(arquivoZip, ct);
                await arquivoZip.FlushAsync(ct);
            }

            var tamanhoRecebido = new FileInfo(zipTemporario).Length;
            if (tamanhoRecebido > tamanhoMaximoUpload)
                throw new InvalidOperationException($"O pacote excede o limite configurado de {configuracao.LimiteUploadMb} MB.");
            if (tamanhoRecebido == 0)
                throw new InvalidOperationException("O arquivo .zip enviado está vazio.");

            using (var arquivoZip = File.OpenRead(zipTemporario))
            using (var zip = new ZipArchive(arquivoZip, ZipArchiveMode.Read))
            {
                var tamanhoExpandido = zip.Entries.Sum(entrada => entrada.Length);
                if (tamanhoExpandido > (long)LimiteMaximoExpandidoMb * 1024 * 1024)
                    throw new InvalidOperationException("O conteúdo extraído do pacote excede o limite técnico de 200 MB.");

                ExtrairComSeguranca(zip, temporario);
            }

            var manifesto = Directory
                .EnumerateFiles(temporario, "imsmanifest.xml", SearchOption.AllDirectories)
                .OrderBy(caminho => caminho.Length)
                .FirstOrDefault()
                ?? throw new InvalidOperationException("O pacote não contém um imsmanifest.xml válido.");

            var (entryFile, versao) = LerManifesto(manifesto, versaoSolicitada);
            var raizpacote = Path.GetDirectoryName(manifesto) ?? temporario;

            if (Directory.Exists(destino))
                Directory.Delete(destino, recursive: true);
            Directory.Move(raizpacote, destino);
            if (Directory.Exists(temporario))
                Directory.Delete(temporario, recursive: true);
            File.Move(zipTemporario, caminhoZip);

            entryFile = AjustarEntryFile(destino, entryFile);
            ReescreverCaminhosAbsolutos(destino, entryFile);

            var pacote = new ScormPacoteDto(
                id,
                slug,
                nomeArquivoSeguro,
                tamanho,
                versao,
                entryFile,
                DateTime.UtcNow,
                $"/scorm/{id}/{entryFile}",
                $"/api/v1/scorm/pacotes/{id}/launch");

            await _trava.WaitAsync(ct);
            try
            {
                var pacotes = await LerIndiceAsync(ct);
                var anterior = pacotes.FirstOrDefault(p => p.CursoSlug == slug);
                pacotes.RemoveAll(p => p.CursoSlug == slug);
                pacotes.Add(pacote);
                await GravarIndiceAsync(pacotes, ct);
                indiceAtualizado = true;

                if (anterior is not null)
                {
                    var pastaAnterior = Path.Combine(_raizPublica, anterior.Id);
                    if (Directory.Exists(pastaAnterior))
                        Directory.Delete(pastaAnterior, recursive: true);
                    var zipAnterior = Path.Combine(_raizPrivada, $"{anterior.Id}.zip");
                    if (File.Exists(zipAnterior))
                        File.Delete(zipAnterior);
                }
            }
            finally
            {
                _trava.Release();
            }

            return pacote;
        }
        catch
        {
            if (Directory.Exists(temporario))
                Directory.Delete(temporario, recursive: true);
            if (File.Exists(zipTemporario))
                File.Delete(zipTemporario);
            if (!indiceAtualizado && Directory.Exists(destino))
                Directory.Delete(destino, recursive: true);
            if (!indiceAtualizado && File.Exists(caminhoZip))
                File.Delete(caminhoZip);
            throw;
        }
    }

    public async Task<ScormPacoteDto?> ObterPorCursoAsync(string cursoSlug, CancellationToken ct)
    {
        var slug = NormalizarSlug(cursoSlug);
        await _trava.WaitAsync(ct);
        try
        {
            var pacotes = await LerIndiceAsync(ct);
            return pacotes.FirstOrDefault(p => p.CursoSlug == slug);
        }
        finally
        {
            _trava.Release();
        }
    }

    public async Task<IReadOnlyList<ScormPacoteDto>> ListarPacotesAsync(CancellationToken ct)
    {
        await _trava.WaitAsync(ct);
        try
        {
            return await LerIndiceAsync(ct);
        }
        finally
        {
            _trava.Release();
        }
    }

    public async Task<ScormPacoteDto?> ObterPorIdAsync(string id, CancellationToken ct)
    {
        await _trava.WaitAsync(ct);
        try
        {
            var pacotes = await LerIndiceAsync(ct);
            return pacotes.FirstOrDefault(p => p.Id == id);
        }
        finally
        {
            _trava.Release();
        }
    }

    public async Task<bool> ExcluirAsync(string cursoSlug, CancellationToken ct)
    {
        var slug = NormalizarSlug(cursoSlug);
        await _trava.WaitAsync(ct);
        try
        {
            var pacotes = await LerIndiceAsync(ct);
            var pacote = pacotes.FirstOrDefault(p => p.CursoSlug == slug);
            if (pacote is null) return false;

            pacotes.Remove(pacote);
            await GravarIndiceAsync(pacotes, ct);

            var pasta = Path.Combine(_raizPublica, pacote.Id);
            if (Directory.Exists(pasta))
                Directory.Delete(pasta, recursive: true);
            var zip = Path.Combine(_raizPrivada, $"{pacote.Id}.zip");
            if (File.Exists(zip))
                File.Delete(zip);

            return true;
        }
        finally
        {
            _trava.Release();
        }
    }

    public async Task<ProgressoScormDto?> ObterProgressoAsync(
        string cursoSlug,
        string usuarioId,
        CancellationToken ct,
        int totalAulas = 0)
    {
        var caminho = CaminhoProgresso(cursoSlug, usuarioId);
        await _travaProgresso.WaitAsync(ct);
        try
        {
            if (!File.Exists(caminho)) return null;

            await using var stream = File.OpenRead(caminho);
            var progresso = await JsonSerializer.DeserializeAsync<ProgressoScormDto>(stream, JsonOpcoes, ct);
            if (progresso is null || totalAulas <= 0 || string.IsNullOrWhiteSpace(progresso.SuspendData))
                return progresso;

            try
            {
                using var documento = JsonDocument.Parse(progresso.SuspendData);
                if (documento.RootElement.ValueKind != JsonValueKind.Object
                    || !documento.RootElement.TryGetProperty("aulasLidas", out var aulas)
                    || aulas.ValueKind != JsonValueKind.Array)
                    return progresso;

                var aulasConcluidas = aulas.EnumerateArray()
                    .Where(aula => aula.ValueKind == JsonValueKind.String)
                    .Select(aula => aula.GetString())
                    .Where(aula => !string.IsNullOrWhiteSpace(aula))
                    .Distinct(StringComparer.Ordinal)
                    .Count();
                var percentual = Math.Clamp(
                    (decimal)Math.Round(aulasConcluidas * 100d / totalAulas),
                    0,
                    100);
                return progresso with { Percentual = Math.Max(progresso.Percentual, percentual) };
            }
            catch (JsonException)
            {
                return progresso;
            }
        }
        finally
        {
            _travaProgresso.Release();
        }
    }

    public async Task<ProgressoScormDto> SalvarProgressoAsync(
        SalvarProgressoScormRequest request,
        CancellationToken ct)
    {
        var cursoSlug = NormalizarSlug(request.CursoSlug);
        var usuarioId = request.UsuarioId?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(cursoSlug))
            throw new InvalidOperationException("cursoSlug é obrigatório.");
        if (string.IsNullOrWhiteSpace(usuarioId))
            throw new InvalidOperationException("usuarioId é obrigatório.");

        var caminho = CaminhoProgresso(cursoSlug, usuarioId);
        await _travaProgresso.WaitAsync(ct);
        try
        {
            var anterior = await LerProgressoAsync(caminho, ct);

            // O percentual nunca regride: revisitar um conteúdo já visto não pode
            // diminuir o progresso registrado.
            var percentual = Math.Clamp(
                Math.Max(anterior?.Percentual ?? 0, request.Percentual ?? 0),
                0,
                100);

            var progresso = new ProgressoScormDto(
                cursoSlug,
                usuarioId,
                request.SuspendData ?? anterior?.SuspendData,
                request.LessonStatus ?? anterior?.LessonStatus,
                request.LessonLocation ?? anterior?.LessonLocation,
                request.Score ?? anterior?.Score,
                percentual,
                request.CmiDataJson ?? anterior?.CmiDataJson,
                DateTime.UtcNow);

            await GravarProgressoAsync(caminho, progresso, ct);
            return progresso;
        }
        finally
        {
            _travaProgresso.Release();
        }
    }

    public async Task<ProgressoScormDto?> ReiniciarProgressoAsync(
        string cursoSlug,
        string usuarioId,
        CancellationToken ct)
    {
        var caminho = CaminhoProgresso(cursoSlug, usuarioId);
        await _travaProgresso.WaitAsync(ct);
        try
        {
            var progresso = await LerProgressoAsync(caminho, ct);
            if (progresso is null) return null;

            var reiniciado = progresso with
            {
                SuspendData = null,
                LessonStatus = null,
                LessonLocation = null,
                Score = null,
                Percentual = 0,
                CmiDataJson = null,
                AtualizadoEm = DateTime.UtcNow,
            };
            await GravarProgressoAsync(caminho, reiniciado, ct);
            return reiniciado;
        }
        finally
        {
            _travaProgresso.Release();
        }
    }

    public async Task<int> ObterQuantidadeAulasAsync(ScormPacoteDto pacote, CancellationToken ct)
    {
        var raizPacote = Path.Combine(_raizPublica, pacote.Id);
        var manifesto = Directory
            .EnumerateFiles(raizPacote, "imsmanifest.xml", SearchOption.AllDirectories)
            .OrderBy(caminho => caminho.Length)
            .FirstOrDefault()
            ?? throw new InvalidDataException("O pacote SCORM ativo não contém imsmanifest.xml.");

        await using var stream = File.OpenRead(manifesto);
        var documento = await XDocument.LoadAsync(stream, LoadOptions.None, ct);
        return documento
            .Descendants()
            .Where(elemento => elemento.Name.LocalName == "item")
            .Where(elemento => !elemento.Elements().Any(filho => filho.Name.LocalName == "item"))
            .Count(elemento =>
            {
                var titulo = elemento.Elements().FirstOrDefault(filho => filho.Name.LocalName == "title")?.Value ?? "";
                return !titulo.Contains("quiz", StringComparison.OrdinalIgnoreCase)
                    && !titulo.Contains("avalia", StringComparison.OrdinalIgnoreCase)
                    && !titulo.Contains("prova", StringComparison.OrdinalIgnoreCase);
            });
    }

    private static async Task<ProgressoScormDto?> LerProgressoAsync(string caminho, CancellationToken ct)
    {
        if (!File.Exists(caminho)) return null;

        await using var stream = File.OpenRead(caminho);
        return await JsonSerializer.DeserializeAsync<ProgressoScormDto>(stream, JsonOpcoes, ct);
    }

    private static async Task GravarProgressoAsync(
        string caminho,
        ProgressoScormDto progresso,
        CancellationToken ct)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(caminho)!);
        var temporario = $"{caminho}.{Guid.NewGuid():N}.tmp";
        try
        {
            await using (var stream = File.Create(temporario))
                await JsonSerializer.SerializeAsync(stream, progresso, JsonOpcoes, ct);
            File.Move(temporario, caminho, overwrite: true);
        }
        finally
        {
            if (File.Exists(temporario))
                File.Delete(temporario);
        }
    }

    private string CaminhoProgresso(string cursoSlug, string usuarioId)
    {
        var chave = $"{NormalizarSlug(cursoSlug)}|{usuarioId.Trim().ToLowerInvariant()}";
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(chave))).ToLowerInvariant();
        return Path.Combine(_raizPrivada, "progresso", $"{hash}.json");
    }

    private async Task<List<ScormPacoteDto>> LerIndiceAsync(CancellationToken ct)
    {
        if (!File.Exists(_arquivoIndice)) return [];

        await using var stream = File.OpenRead(_arquivoIndice);
        return await JsonSerializer.DeserializeAsync<List<ScormPacoteDto>>(stream, JsonOpcoes, ct) ?? [];
    }

    private async Task GravarIndiceAsync(List<ScormPacoteDto> pacotes, CancellationToken ct)
    {
        await GravarJsonAsync(_arquivoIndice, pacotes, ct);
    }

    private async Task<Dictionary<string, ScormPaginaConfigDto>> LerPaginasAsync(CancellationToken ct)
    {
        if (!File.Exists(_arquivoPaginas))
            return new Dictionary<string, ScormPaginaConfigDto>(StringComparer.OrdinalIgnoreCase);

        await using var stream = File.OpenRead(_arquivoPaginas);
        return await JsonSerializer.DeserializeAsync<Dictionary<string, ScormPaginaConfigDto>>(stream, JsonOpcoes, ct)
            ?? new Dictionary<string, ScormPaginaConfigDto>(StringComparer.OrdinalIgnoreCase);
    }

    private static async Task GravarJsonAsync<T>(string caminho, T dados, CancellationToken ct)
    {
        var temporario = $"{caminho}.tmp";
        await using (var stream = File.Create(temporario))
            await JsonSerializer.SerializeAsync(stream, dados, JsonOpcoes, ct);
        File.Move(temporario, caminho, overwrite: true);
    }

    private static void ExtrairComSeguranca(ZipArchive zip, string destino)
    {
        var raiz = Path.GetFullPath(destino) + Path.DirectorySeparatorChar;

        foreach (var entrada in zip.Entries)
        {
            if (string.IsNullOrEmpty(entrada.Name)) continue;

            var caminho = Path.GetFullPath(Path.Combine(destino, entrada.FullName));
            if (!caminho.StartsWith(raiz, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("O pacote contém caminhos inválidos.");

            Directory.CreateDirectory(Path.GetDirectoryName(caminho)!);
            entrada.ExtractToFile(caminho, overwrite: true);
        }
    }

    private static (string EntryFile, string Versao) LerManifesto(string caminho, string? versaoSolicitada)
    {
        var documento = XDocument.Load(caminho);
        var versaoManifesto = documento
            .Descendants()
            .FirstOrDefault(elemento => elemento.Name.LocalName == "schemaversion")
            ?.Value;

        var versao = versaoManifesto?.Contains("2004", StringComparison.OrdinalIgnoreCase) == true
            ? "2004"
            : versaoManifesto?.Contains("1.2", StringComparison.OrdinalIgnoreCase) == true
                ? "1.2"
                : versaoSolicitada == "2004" ? "2004" : "1.2";

        var recursos = documento
            .Descendants()
            .Where(elemento => elemento.Name.LocalName == "resource")
            .ToList();

        var recurso = recursos.FirstOrDefault(elemento =>
                elemento.Attribute("href") is not null &&
                elemento.Attributes().Any(atributo =>
                    atributo.Name.LocalName == "scormtype" &&
                    atributo.Value.Equals("sco", StringComparison.OrdinalIgnoreCase)))
            ?? recursos.FirstOrDefault(elemento => elemento.Attribute("href") is not null);

        var href = recurso?.Attribute("href")?.Value;
        if (string.IsNullOrWhiteSpace(href))
            href = "index.html";

        href = href.Split('?', '#')[0].TrimStart('/', '\\').Replace('\\', '/');
        return (href, versao);
    }

    private static string AjustarEntryFile(string raiz, string entryFile)
    {
        var caminho = Path.Combine(raiz, entryFile.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(caminho)) return entryFile;

        var index = Path.Combine(raiz, "index.html");
        if (File.Exists(index)) return "index.html";

        var primeiroHtml = Directory
            .EnumerateFiles(raiz, "*.html", SearchOption.AllDirectories)
            .OrderBy(caminhoHtml => caminhoHtml.Length)
            .FirstOrDefault();

        return primeiroHtml is null
            ? entryFile
            : Path.GetRelativePath(raiz, primeiroHtml).Replace(Path.DirectorySeparatorChar, '/');
    }

    /// <summary>
    /// Reescreve referências absolutas (/assets/..., /vite.svg) para relativas (./assets/...),
    /// evitando 404 quando o pacote é servido sob /scorm/{id}/.
    /// </summary>
    private static void ReescreverCaminhosAbsolutos(string raiz, string entryFile)
    {
        var caminho = Path.Combine(raiz, entryFile.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(caminho)) return;

        string html;
        try { html = File.ReadAllText(caminho); }
        catch { return; }

        if (!html.Contains("src=\"/") && !html.Contains("href=\"/")) return;

        var reescrito = html
            .Replace("src=\"/", "src=\"./")
            .Replace("href=\"/", "href=\"./");

        try { File.WriteAllText(caminho, reescrito); }
        catch { /* ignora falhas de escrita */ }
    }

    private static string NormalizarSlug(string? slug) =>
        (slug ?? string.Empty).Trim().ToLowerInvariant();

    /// <summary>Reduz o idioma recebido a um dos três suportados pela aplicação.</summary>
    private static string? NormalizarIdioma(string? idioma)
    {
        if (string.IsNullOrWhiteSpace(idioma)) return null;
        var valor = idioma.Trim().Replace('_', '-').ToLowerInvariant();
        if (valor.StartsWith("pt")) return "pt-BR";
        if (valor.StartsWith("en")) return "en-US";
        if (valor.StartsWith("es")) return "es-ES";
        return null;
    }
}
