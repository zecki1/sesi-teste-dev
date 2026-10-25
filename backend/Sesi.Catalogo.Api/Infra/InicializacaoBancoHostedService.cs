using Sesi.Catalogo.Api.Gestao;
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

            // Semeia alunos demo (idempotente) para que o ambiente de produção
            // já tenha contas de teste disponíveis.
            try
            {
                using var scope = _servicos.CreateScope();
                var armazenamento = scope.ServiceProvider.GetRequiredService<GestaoArmazenamento>();
                await armazenamento.SemearAlunosDemoAsync(cancellationToken);
                _logger.LogInformation("[BOOT] Alunos demo semeados (idempotente).");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[BOOT] Falha ao semear alunos demo (não bloqueia a subida).");
            }

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
