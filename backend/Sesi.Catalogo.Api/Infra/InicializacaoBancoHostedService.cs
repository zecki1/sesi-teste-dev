using Sesi.Catalogo.Infrastructure;

namespace Sesi.Catalogo.Api.Infra;

public class InicializacaoBancoHostedService : IHostedService
{
    private readonly IServiceProvider _servicos;
    private readonly ILogger<InicializacaoBancoHostedService> _logger;

    public InicializacaoBancoHostedService(IServiceProvider servicos, ILogger<InicializacaoBancoHostedService> logger)
    {
        _servicos = servicos;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("[BOOT] Inicializando banco em background...");
            var inicio = DateTime.UtcNow;
            await _servicos.InicializarBancoAsync(cancellationToken);
            var duracao = (DateTime.UtcNow - inicio).TotalSeconds;
            _logger.LogInformation("[BOOT] Banco inicializado com sucesso em {Duracao:0.00}s", duracao);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[BOOT] Falha ao inicializar banco em background. Algumas rotas podem falhar até a inicialização concluir.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
