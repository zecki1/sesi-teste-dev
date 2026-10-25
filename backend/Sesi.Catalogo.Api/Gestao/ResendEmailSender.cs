using System.Net;
using System.Net.Mail;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace Sesi.Catalogo.Api.Gestao;

public sealed record ResultadoEnvioChamado(bool SuporteEnviado, bool AlunoEnviado, string? Erro);

public sealed class ResendEmailSender(HttpClient httpClient, IConfiguration configuracao)
{
    // Chave lida apenas de configuracao (Resend:ApiKey). Nunca embutir no codigo.
    private const string BaseUrlPlataforma = "https://frontend-ezequiel-reginos-projects.vercel.app";

    public async Task<ResultadoEnvioChamado> EnviarChamadoAsync(ChamadoDto chamado, CancellationToken ct)
    {
        var chave = configuracao["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(chave))
            return new(false, false, "Resend:ApiKey não está configurada na API.");

        var remetente = configuracao["Resend:FromEmail"]
            ?? "SESI Indústria <noreply@zecki1.com.br>";
        var destinatarioSuporte = configuracao["Support:Email"]
            ?? "zecki1@hotmail.com";

        var htmlSuporte = ConstruirEmailSesi(
            "Central de Ajuda · Suporte Técnico",
            $"Novo Chamado {chamado.Protocolo}",
            $"""
            <p style="margin: 0 0 16px 0;">Um aluno abriu um novo chamado de suporte na plataforma:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 0 0 20px 0;">
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #64748b; width: 120px;">Protocolo:</td><td style="padding: 6px 0; font-weight: 700; color: #d42731;">{WebUtility.HtmlEncode(chamado.Protocolo)}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Aluno:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{WebUtility.HtmlEncode(chamado.Nome)} ({WebUtility.HtmlEncode(chamado.Email)})</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Categoria:</td><td style="padding: 6px 0; font-weight: 600;">{WebUtility.HtmlEncode(chamado.Categoria)}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Página de origem:</td><td style="padding: 6px 0;"><code>{WebUtility.HtmlEncode(chamado.Pagina)}</code></td></tr>
                {(string.IsNullOrWhiteSpace(chamado.CursoSlug) ? "" : $"<tr><td style=\"padding: 6px 0; color: #64748b;\">Curso:</td><td style=\"padding: 6px 0;\">{WebUtility.HtmlEncode(chamado.CursoSlug)}</td></tr>")}
              </table>
            </div>
            <p style="font-weight: 600; color: #111827; margin: 0 0 8px 0;">Descrição do chamado:</p>
            <div style="background-color: #ffffff; border-left: 4px solid #d42731; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 0 0 20px 0; font-size: 14px; color: #374151;">
              {WebUtility.HtmlEncode(chamado.Descricao).Replace("\n", "<br>")}
            </div>
            """,
            "Acessar Painel de Gestão",
            $"{BaseUrlPlataforma}/admin/cursos");

        var htmlAluno = ConstruirEmailSesi(
            "SESI Indústria · Confirmação",
            $"Recebemos seu chamado {chamado.Protocolo}",
            $"""
            <p style="font-size: 17px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">Olá, {WebUtility.HtmlEncode(chamado.Nome)}!</p>
            <p style="margin: 0 0 16px 0;">Confirmamos o recebimento da sua solicitação na nossa Central de Ajuda. Nossa equipe já está analisando seu relato.</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 0 0 20px 0;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;">Número de Protocolo:</p>
              <p style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #d42731; font-family: monospace;">{WebUtility.HtmlEncode(chamado.Protocolo)}</p>
              <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>Categoria:</strong> {WebUtility.HtmlEncode(chamado.Categoria)}</p>
            </div>
            <p style="margin: 0; color: #4b5563;">Assim que houver uma atualização, você receberá uma notificação neste mesmo e-mail.</p>
            """,
            "Ir para a Plataforma",
            BaseUrlPlataforma);

        var envioSuporte = EnviarAsync(
            chave, remetente, [destinatarioSuporte], $"Chamado {chamado.Protocolo}: {chamado.Categoria}",
            htmlSuporte, chamado.Email, chamado.CapturaTela, ct);
        var envioAluno = EnviarAsync(
            chave, remetente, [chamado.Email], $"Recebemos seu chamado {chamado.Protocolo}",
            htmlAluno, null, null, ct);
        await Task.WhenAll(envioSuporte, envioAluno);
        var suporteEnviado = await envioSuporte;
        var alunoEnviado = await envioAluno;

        var erros = new List<string>();
        if (!suporteEnviado) erros.Add("Não foi possível enviar a notificação à equipe de suporte.");
        if (!alunoEnviado) erros.Add("Não foi possível enviar a confirmação ao aluno.");
        return new(suporteEnviado, alunoEnviado, erros.Count == 0 ? null : string.Join(" ", erros));
    }

    public async Task<ResultadoEnvioChamado> EnviarAtualizacaoChamadoAsync(ChamadoDto chamado, CancellationToken ct)
    {
        var chave = configuracao["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(chave))
            return new(false, false, "Resend:ApiKey não está configurada na API.");

        var remetente = configuracao["Resend:FromEmail"]
            ?? "SESI Indústria <noreply@zecki1.com.br>";

        var html = ConstruirEmailSesi(
            "Central de Ajuda · Atualização",
            $"Chamado {chamado.Protocolo} Atualizado",
            $"""
            <p style="font-size: 17px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">Olá, {WebUtility.HtmlEncode(chamado.Nome)}!</p>
            <p style="margin: 0 0 16px 0;">Seu chamado de protocolo <strong>{WebUtility.HtmlEncode(chamado.Protocolo)}</strong> foi atualizado pela equipe de atendimento.</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 0 0 20px 0;">
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">Novo Status:</p>
              <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 800; color: #d42731;">{WebUtility.HtmlEncode(chamado.Status)}</p>
              {(string.IsNullOrWhiteSpace(chamado.Resposta) ? "" : $"""
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #1e293b;">Resposta da Equipe:</p>
              <div style="background-color: #ffffff; border-radius: 8px; padding: 14px; border: 1px solid #cbd5e1; font-size: 14px; color: #334155;">
                {WebUtility.HtmlEncode(chamado.Resposta).Replace("\n", "<br>")}
              </div>
              """)}
            </div>
            <p style="margin: 0; color: #4b5563;">Caso ainda tenha dúvidas ou precise de esclarecimentos adicionais, você pode responder diretamente a este e-mail.</p>
            """,
            "Ir para a Plataforma",
            BaseUrlPlataforma);

        var enviado = await EnviarAsync(
            chave, remetente, [chamado.Email],
            $"Chamado {chamado.Protocolo} atualizado: {chamado.Status}",
            html, null, null, ct);

        return new(false, enviado, enviado ? null : "Não foi possível enviar a atualização ao aluno.");
    }

    public async Task<bool> EnviarBoasVindasAlunoAsync(string nome, string email, CancellationToken ct)
    {
        var chave = configuracao["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(chave))
            return false;

        var remetente = configuracao["Resend:FromEmail"]
            ?? "SESI Indústria <noreply@zecki1.com.br>";

        var html = ConstruirEmailSesi(
            "Bem-vindo(a) à Formação Profissional",
            "Sua conta SESI está pronta!",
            $"""
            <p style="font-size: 17px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">Olá, {WebUtility.HtmlEncode(nome)}! 👋</p>
            <p style="margin: 0 0 16px 0;">É com enorme satisfação que damos as boas-vindas ao <strong>Catálogo de Cursos do SESI Indústria</strong>.</p>
            <p style="margin: 0 0 20px 0;">Sua conta de aluno foi cadastrada com sucesso utilizando o e-mail <strong>{WebUtility.HtmlEncode(email)}</strong>. Agora você tem acesso livre a uma das maiores redes de capacitação do país:</p>
            <div style="background-color: #fdf2f2; border-left: 4px solid #d42731; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px 0;">
              <p style="margin: 0 0 8px 0; font-weight: 700; color: #980e08;">O que você pode fazer a partir de agora:</p>
              <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px;">
                <li style="margin-bottom: 6px;">Explorar cursos com filtros combinados em Tecnologia, Gestão, Segurança e Indústria;</li>
                <li style="margin-bottom: 6px;">Realizar matrículas imediatas nas turmas abertas;</li>
                <li style="margin-bottom: 6px;">Estudar no Ambiente Virtual de Aprendizagem (AVA) com suporte a módulos SCORM interativos;</li>
                <li>Emitir certificados digitais com código de autenticidade ao concluir seus estudos.</li>
              </ul>
            </div>
            <p style="margin: 0; color: #4b5563;">Desejamos que sua jornada conosco seja produtiva e transformadora!</p>
            """,
            "Explorar Catálogo de Cursos",
            $"{BaseUrlPlataforma}/area-do-aluno");

        return await EnviarAsync(
            chave, remetente, [email],
            "Bem-vindo(a) ao SESI Indústria!",
            html, null, null, ct);
    }

    public async Task<bool> EnviarConfirmacaoMatriculaAsync(
        string email,
        string nome,
        string cursoNome,
        string turmaCodigo,
        CancellationToken ct)
    {
        var chave = configuracao["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(chave))
            return false;

        var remetente = configuracao["Resend:FromEmail"]
            ?? "SESI Indústria <noreply@zecki1.com.br>";

        var html = ConstruirEmailSesi(
            "Confirmação de Matrícula",
            "Matrícula Confirmada!",
            $"""
            <p style="font-size: 17px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">Olá, {WebUtility.HtmlEncode(nome)}! 🎓</p>
            <p style="margin: 0 0 16px 0;">Sua inscrição no curso <strong>{WebUtility.HtmlEncode(cursoNome)}</strong> foi processada e confirmada com sucesso.</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; width: 120px;">Curso:</td>
                  <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">{WebUtility.HtmlEncode(cursoNome)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Turma:</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #d42731;">{WebUtility.HtmlEncode(turmaCodigo)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Situação:</td>
                  <td style="padding: 6px 0;"><span style="background-color: #dcfce7; color: #15803d; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 4px;">Matrícula Ativa</span></td>
                </tr>
              </table>
            </div>
            <p style="margin: 0 0 16px 0;">O conteúdo já está acessível no <strong>Ambiente Virtual de Aprendizagem (AVA)</strong>. Você pode acompanhar suas aulas, fazer os quizzes e interagir com o material a qualquer momento.</p>
            <p style="margin: 0; color: #4b5563;">Bons estudos e conte com nossa equipe em toda a sua jornada!</p>
            """,
            "Ir para a Sala de Aula (AVA)",
            $"{BaseUrlPlataforma}/area-do-aluno");

        return await EnviarAsync(
            chave, remetente, [email],
            $"Matrícula Confirmada: {cursoNome}",
            html, null, null, ct);
    }

    public async Task<bool> EnviarConclusaoCursoAsync(
        string email,
        string nome,
        string cursoNome,
        string cargaHoraria,
        string codigoCertificado,
        CancellationToken ct)
    {
        var chave = configuracao["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(chave))
            return false;

        var remetente = configuracao["Resend:FromEmail"]
            ?? "SESI Indústria <noreply@zecki1.com.br>";

        var html = ConstruirEmailSesi(
            "Conquista · Conclusão de Curso",
            "Parabéns pela sua Formação!",
            $"""
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 48px; line-height: 1;">🏆</span>
              <h2 style="font-size: 21px; font-weight: 800; color: #d42731; margin: 12px 0 4px 0;">Parabéns pelo seu empenho e dedicação!</h2>
              <p style="font-size: 14px; color: #6b7280; margin: 0;">Você concluiu com sucesso 100% da carga horária deste curso no SESI Indústria.</p>
            </div>
            <p style="font-size: 15px; color: #374151; margin: 0 0 20px 0;">Olá, <strong>{WebUtility.HtmlEncode(nome)}</strong>. É com imenso orgulho e gratidão pela sua participação que celebramos a conquista do seu certificado de capacitação profissional:</p>
            <!-- Card do Certificado -->
            <div style="background: linear-gradient(180deg, #ffffff 0%, #fffbf0 100%); border: 2px solid #fcd19c; border-radius: 14px; padding: 26px; margin: 0 0 24px 0; text-align: center; box-shadow: 0 4px 16px rgba(252, 209, 156, 0.28);">
              <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 2px;">Certificado Oficial SESI Indústria</p>
              <h3 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #0c0c0d;">{WebUtility.HtmlEncode(cursoNome)}</h3>
              <table style="margin: 0 auto; font-size: 13px; color: #4b5563; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 14px; text-align: right; color: #6b7280;">Carga Horária:</td>
                  <td style="padding: 5px 14px; text-align: left; font-weight: 700; color: #111827;">{WebUtility.HtmlEncode(cargaHoraria)}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 14px; text-align: right; color: #6b7280;">Data de Conclusão:</td>
                  <td style="padding: 5px 14px; text-align: left; font-weight: 700; color: #111827;">{DateTime.UtcNow:dd/MM/yyyy}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 14px; text-align: right; color: #6b7280;">Autenticidade:</td>
                  <td style="padding: 5px 14px; text-align: left; font-family: monospace; font-weight: 700; color: #d42731;">{WebUtility.HtmlEncode(codigoCertificado)}</td>
                </tr>
              </table>
            </div>
            <p style="font-size: 14px; color: #4b5563; margin: 0;">O comprovante já está disponível para visualização, impressão e download no seu painel da Área do Aluno.</p>
            """,
            "Visualizar Certificado no AVA",
            $"{BaseUrlPlataforma}/area-do-aluno");

        return await EnviarAsync(
            chave, remetente, [email],
            $"🏆 Certificado Emitido: {cursoNome} - SESI Indústria",
            html, null, null, ct);
    }

    private static string ConstruirEmailSesi(
        string tituloBadge,
        string tituloPrincipal,
        string conteudoHtml,
        string? botaoTexto = null,
        string? botaoUrl = null)
    {
        var botaoHtml = string.IsNullOrWhiteSpace(botaoTexto) || string.IsNullOrWhiteSpace(botaoUrl)
            ? string.Empty
            : $"""
              <tr>
                <td align="center" style="padding: 24px 0 8px 0;">
                  <a href="{botaoUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #d42731 0%, #980e08 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 34px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(212, 39, 49, 0.28); letter-spacing: 0.2px;">
                    {WebUtility.HtmlEncode(botaoTexto)}
                  </a>
                </td>
              </tr>
              """;

        return $"""
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>{WebUtility.HtmlEncode(tituloPrincipal)}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0c0c0d;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f5f7; padding: 40px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
                  <!-- Topo com gradiente SESI -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #d42731 0%, #980e08 100%); padding: 36px 32px; text-align: center;">
                      <span style="display: inline-block; background-color: rgba(255,255,255,0.18); color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 12px;">
                        {WebUtility.HtmlEncode(tituloBadge)}
                      </span>
                      <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px; line-height: 1.3;">
                        {WebUtility.HtmlEncode(tituloPrincipal)}
                      </h1>
                    </td>
                  </tr>
                  <!-- Conteúdo -->
                  <tr>
                    <td style="padding: 36px 32px; background-color: #ffffff;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="font-size: 15px; line-height: 1.65; color: #374151;">
                            {conteudoHtml}
                          </td>
                        </tr>
                        {botaoHtml}
                      </table>
                    </td>
                  </tr>
                  <!-- Rodapé Institucional -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #f3f4f6; font-size: 12px; color: #6b7280; line-height: 1.6;">
                      <p style="margin: 0 0 6px 0; font-weight: 600; color: #111827;">SESI Indústria · Educação e Formação Profissional</p>
                      <p style="margin: 0 0 8px 0;">Plataforma Oficial de Capacitação e Cursos Técnicos</p>
                      <p style="margin: 0; font-size: 11px; color: #9ca3af;">Você recebeu este e-mail transacional referente à sua atividade na plataforma.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;
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

    public async Task<bool> EnviarRedefinicaoSenhaAsync(string email, string nome, string link, CancellationToken ct)
    {
        var chave = configuracao["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(chave))
            return false;

        var remetente = configuracao["Resend:FromEmail"]
            ?? "SESI Indústria <noreply@zecki1.com.br>";

        var html = ConstruirEmailSesi(
            "Redefinição de Senha",
            "Redefina sua senha",
            $"""
            <p style="font-size: 17px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">Olá, {WebUtility.HtmlEncode(nome)}!</p>
            <p style="margin: 0 0 16px 0;">Recebemos uma solicitação para redefinir a senha da sua conta SESI. Clique no botão abaixo para criar uma nova senha. O link é válido por 1 hora.</p>
            <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 13px;">Se você não solicitou essa alteração, ignore este e-mail — sua senha permanece a mesma.</p>
            """,
            "Redefinir Senha",
            link);

        return await EnviarAsync(
            chave, remetente, [email],
            "Redefinição de Senha - SESI Indústria",
            html, null, null, ct);
    }

    public async Task<bool> EnviarCopiaCadastroAsync(string nome, string email, CancellationToken ct)
    {
        var chave = configuracao["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(chave))
            return false;

        var remetente = configuracao["Resend:FromEmail"]
            ?? "SESI Indústria <noreply@zecki1.com.br>";
        var destinatarioMonitor = configuracao["Monitor:Email"]
            ?? configuracao["Support:Email"]
            ?? "zecki1@hotmail.com";

        var html = ConstruirEmailSesi(
            "Monitoramento · Novo Cadastro",
            "Novo aluno cadastrado",
            $"""
            <p style="margin: 0 0 16px 0;">Um novo aluno criou conta na plataforma:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 0 0 20px 0;">
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #64748b; width: 120px;">Nome:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{WebUtility.HtmlEncode(nome)}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">E-mail:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{WebUtility.HtmlEncode(email)}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Data:</td><td style="padding: 6px 0;">{DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC</td></tr>
              </table>
            </div>
            """,
            "Acessar Painel Admin",
            $"{BaseUrlPlataforma}/admin/gestao");

        return await EnviarAsync(
            chave, remetente, [destinatarioMonitor],
            $"Novo Cadastro: {nome}",
            html, null, null, ct);
    }

    public async Task<bool> EnviarCopiaAcessoAsync(string nome, string email, CancellationToken ct)
    {
        var chave = configuracao["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(chave))
            return false;

        var remetente = configuracao["Resend:FromEmail"]
            ?? "SESI Indústria <noreply@zecki1.com.br>";
        var destinatarioMonitor = configuracao["Monitor:Email"]
            ?? configuracao["Support:Email"]
            ?? "zecki1@hotmail.com";

        var html = ConstruirEmailSesi(
            "Monitoramento · Novo Acesso",
            "Acesso à conta",
            $"""
            <p style="margin: 0 0 16px 0;">Um aluno acessou a plataforma:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 0 0 20px 0;">
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #64748b; width: 120px;">Nome:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{WebUtility.HtmlEncode(nome)}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">E-mail:</td><td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{WebUtility.HtmlEncode(email)}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Data:</td><td style="padding: 6px 0;">{DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC</td></tr>
              </table>
            </div>
            """,
            "Acessar Painel Admin",
            $"{BaseUrlPlataforma}/admin/gestao");

        return await EnviarAsync(
            chave, remetente, [destinatarioMonitor],
            $"Acesso: {nome}",
            html, null, null, ct);
    }

    public static bool EmailValido(string? email) =>
        !string.IsNullOrWhiteSpace(email) && MailAddress.TryCreate(email.Trim(), out _);
}
