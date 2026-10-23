using System.ComponentModel;
using System.Diagnostics;

namespace Sesi.Catalogo.Api.Dev;

public sealed class FrontendDevServer(
    IWebHostEnvironment environment,
    IHttpClientFactory httpClientFactory,
    ILogger<FrontendDevServer> logger) : IHostedService
{
    private Process? _process;
    private bool _stopping;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var frontendRoot = Path.GetFullPath(Path.Combine(environment.ContentRootPath, "..", "..", "frontend"));
        var viteEntrypoint = Path.Combine(frontendRoot, "node_modules", "vite", "bin", "vite.js");
        if (!File.Exists(viteEntrypoint))
        {
            logger.LogError("Não encontrei o Vite em {VitePath}. Execute npm install na pasta frontend.", viteEntrypoint);
            return;
        }

        var portaVite = await vitePortaAtivaAsync(cancellationToken);
        if (portaVite is not null)
        {
            logger.LogInformation("Vite já está respondendo em localhost:{Porta}.", portaVite);
            return;
        }

        var inicio = new ProcessStartInfo
        {
            FileName = "node",
            WorkingDirectory = frontendRoot,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        inicio.ArgumentList.Add(viteEntrypoint);

        var processo = new Process { StartInfo = inicio, EnableRaisingEvents = true };
        processo.OutputDataReceived += (_, evento) =>
        {
            if (evento.Data is not null) logger.LogInformation("[Vite] {Mensagem}", evento.Data);
        };
        processo.ErrorDataReceived += (_, evento) =>
        {
            if (evento.Data is not null) logger.LogError("[Vite] {Mensagem}", evento.Data);
        };
        processo.Exited += (_, _) =>
        {
            if (!_stopping)
                logger.LogError("O servidor Vite encerrou com código {ExitCode}.", processo.ExitCode);
        };

        try
        {
            if (!processo.Start())
            {
                logger.LogError("Não foi possível iniciar o Vite.");
                processo.Dispose();
                return;
            }
        }
        catch (Win32Exception ex)
        {
            logger.LogError(ex, "Não foi possível encontrar o Node.js no PATH para iniciar o Vite.");
            processo.Dispose();
            return;
        }

        _process = processo;
        processo.BeginOutputReadLine();
        processo.BeginErrorReadLine();
        logger.LogInformation("Iniciando o Vite em {FrontendRoot}.", frontendRoot);
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        _stopping = true;
        if (_process is null) return;

        try
        {
            if (!_process.HasExited) _process.Kill(entireProcessTree: true);
            await _process.WaitForExitAsync(cancellationToken);
        }
        catch (InvalidOperationException)
        {
            // O processo terminou entre a verificação e o encerramento.
        }
        finally
        {
            _process.Dispose();
            _process = null;
        }
    }

    private async Task<int?> vitePortaAtivaAsync(CancellationToken cancellationToken)
    {
        var cliente = httpClientFactory.CreateClient();
        for (var porta = 5173; porta <= 5174; porta++)
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromMilliseconds(500));
            try
            {
                using var resposta = await cliente.GetAsync($"http://localhost:{porta}/@vite/client", timeout.Token);
                if (resposta.IsSuccessStatusCode) return porta;
            }
            catch (HttpRequestException)
            {
                logger.LogDebug("Nenhum servidor Vite respondeu em localhost:{Porta}.", porta);
            }
            catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                logger.LogDebug("A verificação do Vite expirou em localhost:{Porta}.", porta);
            }
        }
        return null;
    }
}
