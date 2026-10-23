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
    private const long TamanhoMaximoPacote = 100 * 1024 * 1024;

    private static readonly JsonSerializerOptions JsonOpcoes = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
    };

    private readonly string _raizPublica;
    private readonly string _raizPrivada;
    private readonly string _arquivoIndice;
    private readonly SemaphoreSlim _trava = new(1, 1);

    public ScormArmazenamento(IWebHostEnvironment ambiente, IConfiguration configuracao)
    {
        var raiz = configuracao["Scorm:Root"];
        if (string.IsNullOrWhiteSpace(raiz))
            raiz = Path.Combine(ambiente.ContentRootPath, "App_Data", "scorm");

        _raizPublica = Path.Combine(raiz, "pacotes");
        _raizPrivada = Path.Combine(raiz, "privado");
        _arquivoIndice = Path.Combine(_raizPrivada, "pacotes.json");

        Directory.CreateDirectory(_raizPublica);
        Directory.CreateDirectory(_raizPrivada);
        Directory.CreateDirectory(Path.Combine(_raizPrivada, "progresso"));
    }

    public string RaizPublica => _raizPublica;

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

        var temporario = Path.Combine(_raizPublica, $".tmp-{Guid.NewGuid():N}");
        Directory.CreateDirectory(temporario);

        var id = Guid.NewGuid().ToString("N")[..12];
        var destino = Path.Combine(_raizPublica, id);

        try
        {
            using (var zip = new ZipArchive(conteudo, ZipArchiveMode.Read, leaveOpen: true))
            {
                if (zip.Entries.Sum(entrada => entrada.Length) > TamanhoMaximoPacote)
                    throw new InvalidOperationException("O pacote SCORM excede o limite de 100 MB.");

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

            entryFile = AjustarEntryFile(destino, entryFile);

            var pacote = new ScormPacoteDto(
                id,
                slug,
                Path.GetFileName(nomeArquivo),
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

                if (anterior is not null)
                {
                    var pastaAnterior = Path.Combine(_raizPublica, anterior.Id);
                    if (Directory.Exists(pastaAnterior))
                        Directory.Delete(pastaAnterior, recursive: true);
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
            if (Directory.Exists(destino))
                Directory.Delete(destino, recursive: true);
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
        CancellationToken ct)
    {
        var caminho = CaminhoProgresso(cursoSlug, usuarioId);
        if (!File.Exists(caminho)) return null;

        await using var stream = File.OpenRead(caminho);
        return await JsonSerializer.DeserializeAsync<ProgressoScormDto>(stream, JsonOpcoes, ct);
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
        var anterior = await ObterProgressoAsync(cursoSlug, usuarioId, ct);

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

        Directory.CreateDirectory(Path.GetDirectoryName(caminho)!);
        await using var stream = File.Create(caminho);
        await JsonSerializer.SerializeAsync(stream, progresso, JsonOpcoes, ct);

        return progresso;
    }

    public async Task<ProgressoScormDto?> ReiniciarProgressoAsync(
        string cursoSlug,
        string usuarioId,
        CancellationToken ct)
    {
        var progresso = await ObterProgressoAsync(cursoSlug, usuarioId, ct);
        if (progresso is null) return null;

        var reiniciado = progresso with
        {
            SuspendData = null,
            LessonStatus = null,
            LessonLocation = null,
            Score = null,
            CmiDataJson = null,
            AtualizadoEm = DateTime.UtcNow,
        };

        var caminho = CaminhoProgresso(cursoSlug, usuarioId);
        await using var stream = File.Create(caminho);
        await JsonSerializer.SerializeAsync(stream, reiniciado, JsonOpcoes, ct);
        return reiniciado;
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
        var temporario = $"{_arquivoIndice}.tmp";
        await using (var stream = File.Create(temporario))
            await JsonSerializer.SerializeAsync(stream, pacotes, JsonOpcoes, ct);
        File.Move(temporario, _arquivoIndice, overwrite: true);
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

    private static string NormalizarSlug(string? slug) =>
        (slug ?? string.Empty).Trim().ToLowerInvariant();
}
