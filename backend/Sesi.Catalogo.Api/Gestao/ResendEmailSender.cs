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
            {LinhaCursoUsuario(chamado)}
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

    /// <summary>
    /// Avisa o aluno sobre a mudança de status e a resposta da equipe.
    /// Usado pelo admin de gestão ao responder um chamado.
    /// </summary>
    public async Task<ResultadoEnvioChamado> EnviarAtualizacaoChamadoAsync(ChamadoDto chamado, CancellationToken ct)
    {
        var chave = configuracao["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(chave))
            return new(false, false, "Resend:ApiKey não está configurada na API.");

        var remetente = configuracao["Resend:FromEmail"]
            ?? "SESI Indústria <noreply@zecki1.com.br>";

        var html = $"""
            <h2>Chamado {WebUtility.HtmlEncode(chamado.Protocolo)} atualizado</h2>
            <p>Olá, {WebUtility.HtmlEncode(chamado.Nome)}. Seu chamado agora está com o status <strong>{WebUtility.HtmlEncode(chamado.Status)}</strong>.</p>
            {LinhaCursoUsuario(chamado)}
            <p><strong>Sua mensagem:</strong></p>
            <p>{WebUtility.HtmlEncode(chamado.Descricao).Replace("\n", "<br>")}</p>
            {(string.IsNullOrWhiteSpace(chamado.Resposta) ? "" : $"<p><strong>Resposta da equipe:</strong></p><p>{WebUtility.HtmlEncode(chamado.Resposta).Replace("\n", "<br>")}</p>")}
            <p>Se precisar de algo mais, responda este e-mail.</p>
            """;

        var enviado = await EnviarAsync(
            chave, remetente, [chamado.Email],
            $"Chamado {chamado.Protocolo} atualizado: {chamado.Status}",
            html, null, null, ct);

        return new(false, enviado, enviado ? null : "Não foi possível enviar a atualização ao aluno.");
    }

    /// <summary>
    /// Envia e-mail de boas-vindas ao novo aluno cadastrado com senha.
    /// </summary>
    public async Task<bool> EnviarBoasVindasAlunoAsync(string nome, string email, CancellationToken ct)
    {
        var chave = configuracao["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(chave))
            return false;

        var remetente = configuracao["Resend:FromEmail"]
            ?? "SESI Indústria <noreply@zecki1.com.br>";

        var html = $"""
            <h2>Bem-vindo(a) ao Catálogo SESI Indústria!</h2>
            <p>Olá, {WebUtility.HtmlEncode(nome)}.</p>
            <p>Sua conta de aluno foi criada com sucesso com o e-mail <strong>{WebUtility.HtmlEncode(email)}</strong>.</p>
            <p>Agora você já pode se matricular nos cursos disponíveis, acompanhar suas aulas e acessar seus certificados.</p>
            <br>
            <p>Bons estudos!</p>
            <p><strong>Equipe SESI Indústria</strong></p>
            """;

        return await EnviarAsync(
            chave, remetente, [email],
            "Bem-vindo(a) ao SESI Indústria",
            html, null, null, ct);
    }

    private static string LinhaCursoUsuario(ChamadoDto chamado)
    {
        var partes = new List<string>();
        if (!string.IsNullOrWhiteSpace(chamado.CursoSlug))
            partes.Add($"<strong>Curso:</strong> {WebUtility.HtmlEncode(chamado.CursoSlug)}");
        if (!string.IsNullOrWhiteSpace(chamado.UsuarioId))
            partes.Add($"<strong>Usuário:</strong> {WebUtility.HtmlEncode(chamado.UsuarioId)}");
        return partes.Count == 0 ? string.Empty : $"<p>{string.Join("<br>", partes)}</p>";
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
