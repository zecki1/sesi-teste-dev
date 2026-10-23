using System.Net;
using System.Net.Mail;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace Sesi.Catalogo.Api.Gestao;

public sealed record ResultadoEnvioChamado(bool SuporteEnviado, bool AlunoEnviado, string? Erro);

public sealed class ResendEmailSender(HttpClient httpClient, IConfiguration configuracao)
{
    public async Task<ResultadoEnvioChamado> EnviarChamadoAsync(ChamadoDto chamado, CancellationToken ct)
    {
        var chave = configuracao["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(chave))
            return new(false, false, "Resend:ApiKey não está configurada na API.");

        var remetente = configuracao["Resend:FromEmail"]
            ?? "SESI Indústria <noreply@zecki1.com.br>";
        var destinatarioSuporte = configuracao["Support:Email"]
            ?? "zecki1@hotmail.com";

        var html = $"""
            <h2>Novo chamado de suporte {WebUtility.HtmlEncode(chamado.Protocolo)}</h2>
            <p><strong>Aluno:</strong> {WebUtility.HtmlEncode(chamado.Nome)} ({WebUtility.HtmlEncode(chamado.Email)})</p>
            <p><strong>Categoria:</strong> {WebUtility.HtmlEncode(chamado.Categoria)}</p>
            <p><strong>Página:</strong> {WebUtility.HtmlEncode(chamado.Pagina)}</p>
            <p><strong>Descrição:</strong></p>
            <p>{WebUtility.HtmlEncode(chamado.Descricao).Replace("\n", "<br>")}</p>
            """;
        var confirmacao = $"""
            <h2>Recebemos seu chamado {WebUtility.HtmlEncode(chamado.Protocolo)}</h2>
            <p>Olá, {WebUtility.HtmlEncode(chamado.Nome)}. A equipe SESI recebeu sua solicitação.</p>
            <p><strong>Categoria:</strong> {WebUtility.HtmlEncode(chamado.Categoria)}</p>
            <p>{WebUtility.HtmlEncode(chamado.Descricao).Replace("\n", "<br>")}</p>
            <p>Responderemos neste endereço de e-mail.</p>
            """;

        var envioSuporte = EnviarAsync(
            chave, remetente, [destinatarioSuporte], $"Chamado {chamado.Protocolo}: {chamado.Categoria}",
            html, chamado.Email, chamado.CapturaTela, ct);
        var envioAluno = EnviarAsync(
            chave, remetente, [chamado.Email], $"Recebemos seu chamado {chamado.Protocolo}",
            confirmacao, null, null, ct);
        await Task.WhenAll(envioSuporte, envioAluno);
        var suporteEnviado = await envioSuporte;
        var alunoEnviado = await envioAluno;

        var erros = new List<string>();
        if (!suporteEnviado) erros.Add("Não foi possível enviar a notificação à equipe de suporte.");
        if (!alunoEnviado) erros.Add("Não foi possível enviar a confirmação ao aluno.");
        return new(suporteEnviado, alunoEnviado, erros.Count == 0 ? null : string.Join(" ", erros));
    }

    private async Task<bool> EnviarAsync(
        string chave,
        string remetente,
        string[] destinatarios,
        string assunto,
        string html,
        string? replyTo,
        string? capturaTela,
        CancellationToken ct)
    {
        using var mensagem = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
        mensagem.Headers.Authorization = new AuthenticationHeaderValue("Bearer", chave);
        var conteudo = new Dictionary<string, object>
        {
            ["from"] = remetente,
            ["to"] = destinatarios,
            ["subject"] = assunto,
            ["html"] = html
        };
        if (!string.IsNullOrWhiteSpace(replyTo)) conteudo["reply_to"] = replyTo;
        if (!string.IsNullOrWhiteSpace(capturaTela))
        {
            var base64 = capturaTela[(capturaTela.IndexOf(',') + 1)..];
            conteudo["attachments"] = new[]
            {
                new { filename = "captura-da-tela.jpg", content = base64 }
            };
        }
        mensagem.Content = JsonContent.Create(conteudo);

        try
        {
            using var resposta = await httpClient.SendAsync(mensagem, ct);
            return resposta.IsSuccessStatusCode;
        }
        catch (HttpRequestException)
        {
            return false;
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            return false;
        }
    }

    public static bool EmailValido(string? email) =>
        !string.IsNullOrWhiteSpace(email) && MailAddress.TryCreate(email.Trim(), out _);
}
