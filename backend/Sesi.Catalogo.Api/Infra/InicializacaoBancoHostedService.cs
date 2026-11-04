using Sesi.Catalogo.Api.Gestao;
using Sesi.Catalogo.Domain.Abstractions;
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

            // Semeia uma turma interativa compartilhada pelos alunos demo, para que
            // possam interagir (fórum, chat, plantão de dúvidas) e ter notas.
            try
            {
                using var scope2 = _servicos.CreateScope();
                var repo = scope2.ServiceProvider.GetRequiredService<ICatalogoRepositorio>();
                var armaz = scope2.ServiceProvider.GetRequiredService<GestaoArmazenamento>();
                await SemearAcademicoDemoAsync(repo, armaz, cancellationToken);
                _logger.LogInformation("[BOOT] Turma interativa demo semeada (idempotente).");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[BOOT] Falha ao semear turma interativa (não bloqueia a subida).");
            }
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

    private static async Task SemearAcademicoDemoAsync(
        ICatalogoRepositorio repo, GestaoArmazenamento armaz, CancellationToken ct)
    {
        var cursos = await repo.ListarCursosAdministracaoAsync(ct);
        var curso = cursos.FirstOrDefault(c => c.Slug.Contains("desenvolvimento", StringComparison.OrdinalIgnoreCase))
                    ?? cursos.FirstOrDefault();
        if (curso is null) return;

        var turmas = await repo.ListarTurmasAdminAsync(ct);
        var turma = turmas.FirstOrDefault(t => t.Codigo == "TURMA-INTERATIVA-2026");
        if (turma is null)
        {
            turma = await repo.SalvarTurmaAdminAsync(null, new Sesi.Catalogo.Domain.Dtos.SalvarTurmaRequest(
                CursoId: curso.Id,
                ModalidadeId: 2, // EAD
                Codigo: "TURMA-INTERATIVA-2026",
                DataInicio: DateOnly.FromDateTime(DateTime.UtcNow),
                DataFim: DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(3)),
                DiasSemana: "Seg,Qua,Sex",
                HorarioInicio: "19:00",
                HorarioFim: "21:00",
                Vagas: 60,
                Ativa: true), ct);
        }
        if (turma is null) return;

        var usuarios = await armaz.ListarUsuariosAsync(ct);
        var demoEmails = new[]
        {
            "ana.souza@exemplo.com","bruno.lima@exemplo.com","carla.mendes@exemplo.com",
            "diego.rocha@exemplo.com","eduarda.silva@exemplo.com","felipe.costa@exemplo.com",
            "gabriela.alves@exemplo.com","henrique.dias@exemplo.com","isabela.martins@exemplo.com",
            "joao.pedro@exemplo.com",
        };

        var matriculas = await repo.ListarMatriculasAdminAsync(null, null, ct);
        foreach (var email in demoEmails)
        {
            var jaMatriculado = matriculas.Any(m => m.TurmaId == turma.Id &&
                m.UsuarioId.Equals(email, StringComparison.OrdinalIgnoreCase));
            if (jaMatriculado) continue;

            await repo.SalvarMatriculaAdminAsync(null, new Sesi.Catalogo.Domain.Dtos.SalvarMatriculaAdminRequest(
                UsuarioId: email,
                TurmaId: turma.Id,
                Status: "ativa",
                Progresso: 0,
                Concluido: false), ct);
        }

        // Semeia uma aula ao vivo de exemplo para a turma interativa.
        var aulasExistentes = await repo.ListarAulasAoVivoAsync(turma.Id, ct);
        if (aulasExistentes.Count == 0)
        {
            await repo.CriarAulaAoVivoAsync(new Sesi.Catalogo.Domain.Dtos.SalvarAulaAoVivoRequest(
                TurmaId: turma.Id,
                Titulo: "Aula ao vivo de boas-vindas",
                Descricao: "Apresentação da turma, ferramentas e combinados.",
                DataHora: DateTime.UtcNow.AddDays(1),
                DuracaoMinutos: 60), ct);
        }

        // Notas de exemplo para a Ana (para o boletim não ficar vazio).
        var matriculasAtualizadas = await repo.ListarMatriculasAdminAsync(null, null, ct);
        var matriculaAna = matriculasAtualizadas.FirstOrDefault(m =>
            m.TurmaId == turma.Id && m.UsuarioId.Equals("ana.souza@exemplo.com", StringComparison.OrdinalIgnoreCase));
        if (matriculaAna is not null)
        {
            var notasExistentes = await repo.ListarNotasAsync(matriculaAna.Id, ct);
            if (notasExistentes.Count == 0)
            {
                await repo.SalvarNotaAsync(matriculaAna.Id, null, new Sesi.Catalogo.Domain.Dtos.SalvarNotaRequest(
                    Titulo: "Prova 1", Tipo: "Prova", Peso: 2, Valor: 8.5m, ValorMaximo: 10m,
                    Data: DateTime.UtcNow, Observacao: "Bom desempenho"), ct);
                await repo.SalvarNotaAsync(matriculaAna.Id, null, new Sesi.Catalogo.Domain.Dtos.SalvarNotaRequest(
                    Titulo: "Trabalho em grupo", Tipo: "Trabalho", Peso: 1, Valor: 9m, ValorMaximo: 10m,
                    Data: DateTime.UtcNow, Observacao: null), ct);
            }
        }
    }
}
