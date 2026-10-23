using System.Text.Json;
using Sesi.Catalogo.Domain.Dtos;

namespace Sesi.Catalogo.Api.Scorm;

/// <summary>
/// Gera o HTML do player SCORM. O wrapper roda na mesma origem do pacote
/// (backend), injeta <c>window.API</c>/<c>window.API_1484_11</c> e mantém o
/// conteúdo em um iframe interno. O progresso é salvo na API e também enviado
/// para a página React via <c>postMessage</c>.
/// </summary>
public static class ScormWrapper
{
    public static string GerarHtml(ScormPacoteDto pacote, string usuarioId, int totalAulas)
    {
        var config = JsonSerializer.Serialize(new
        {
            cursoSlug = pacote.CursoSlug,
            usuarioId,
            conteudoUrl = pacote.ConteudoUrl,
            versao = pacote.Versao,
            totalAulas,
        });

        return $$"""
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Player SCORM</title>
              <style>
                html, body { margin: 0; height: 100%; background: #fff; font-family: system-ui, sans-serif; }
                #sco { display: block; width: 100%; height: 100%; border: 0; }
                #aviso { position: fixed; inset: 0; display: grid; place-items: center; color: #4a4a4a; font-size: 14px; }
              </style>
            </head>
            <body>
              <div id="aviso">Carregando conteúdo SCORM...</div>
              <iframe id="sco" title="Conteúdo SCORM"></iframe>
              <script>
                (() => {
                  const config = {{config}};
                  const cmi = {
                    "cmi.core.lesson_status": "not attempted",
                    "cmi.core.score.raw": "",
                    "cmi.core.score.min": "0",
                    "cmi.core.score.max": "100",
                    "cmi.core.session_time": "0000:00:00",
                    "cmi.core.exit": "",
                    "cmi.core.lesson_location": "",
                    "cmi.suspend_data": "",
                    "cmi.launch_data": "",
                    "cmi.student_id": config.usuarioId,
                    "cmi.student_name": "",
                    "cmi.core.student_id": config.usuarioId,
                    "cmi.core.student_name": "",
                    "cmi.completion_status": "not attempted",
                    "cmi.location": "",
                    "cmi.score.raw": "",
                    "cmi.progress_measure": ""
                  };

                  let inicializado = false;
                  let finalizado = false;
                  let ultimoErro = "0";

                  const erros = {
                    "0": "No error",
                    "101": "General exception",
                    "201": "Invalid argument error",
                    "202": "Element cannot have children",
                    "203": "Element not an array",
                    "301": "Not initialized",
                    "401": "Not implemented error",
                    "402": "Invalid set value",
                    "403": "Element is read only",
                    "404": "Element is write only"
                  };

                  function notificar(tipo, extra) {
                    try {
                      window.parent.postMessage(
                        Object.assign({ type: tipo, cursoSlug: config.cursoSlug, usuarioId: config.usuarioId }, extra || {}),
                        "*"
                      );
                    } catch (_) {}
                  }

                  function percentual() {
                    const status2004 = String(cmi["cmi.completion_status"] || "").toLowerCase();
                    const status12 = String(cmi["cmi.core.lesson_status"] || "").toLowerCase();
                    const status = status2004 && status2004 !== "not attempted" ? status2004 : status12;
                    if (status === "completed" || status === "passed") return 100;

                    const medida = String(cmi["cmi.progress_measure"] || "").trim();
                    const progressoMedido = Number(medida.replace(",", "."));
                    if (medida && Number.isFinite(progressoMedido)) {
                      return Math.min(100, Math.max(0, Math.round(progressoMedido * 100)));
                    }

                    const bruto = cmi["cmi.score.raw"] || cmi["cmi.core.score.raw"];
                    const numero = Number(String(bruto).replace(",", "."));
                    if (Number.isFinite(numero) && numero > 0) {
                      return Math.min(100, Math.max(0, Math.round(numero)));
                    }

                    try {
                      const dados = JSON.parse(cmi["cmi.suspend_data"] || "{}");
                      const aulas = Array.isArray(dados.aulasLidas) ? new Set(dados.aulasLidas) : null;
                      if (aulas && config.totalAulas > 0) {
                        return Math.min(100, Math.max(0, Math.round(aulas.size * 100 / config.totalAulas)));
                      }
                    } catch (_) {}

                    return 0;
                  }

                  function estado() {
                    const score = Number(String(cmi["cmi.core.score.raw"] || cmi["cmi.score.raw"] || "").replace(",", "."));
                    const status2004 = String(cmi["cmi.completion_status"] || "");
                    const status12 = String(cmi["cmi.core.lesson_status"] || "");
                    const status = status2004 && status2004 !== "not attempted" ? status2004 : status12;
                    return {
                      percentual: percentual(),
                      lessonStatus: status,
                      lessonLocation: cmi["cmi.core.lesson_location"] || cmi["cmi.location"] || "",
                      score: Number.isFinite(score) && score > 0 ? score : null,
                      suspendData: cmi["cmi.suspend_data"] || "",
                      finalizado
                    };
                  }

                  function persistir() {
                    const corpo = {
                      cursoSlug: config.cursoSlug,
                      usuarioId: config.usuarioId,
                      suspendData: cmi["cmi.suspend_data"] || null,
                      lessonStatus: estado().lessonStatus || null,
                      lessonLocation: cmi["cmi.core.lesson_location"] || cmi["cmi.location"] || null,
                      score: estado().score,
                      percentual: percentual(),
                      cmiDataJson: JSON.stringify(cmi)
                    };

                    fetch("/api/v1/scorm/progresso", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(corpo),
                      keepalive: true
                    }).catch(() => {});

                    notificar("SCORM_DATA_SAVE", { dados: corpo });
                  }

                  function get(nome) {
                    return cmi[nome] !== undefined ? cmi[nome] : "";
                  }

                  function set(nome, valor) {
                    cmi[nome] = String(valor === undefined || valor === null ? "" : valor);
                    notificar("SCORM_VALUE_CHANGED", { nome, valor: cmi[nome] });
                    return "true";
                  }

                  window.API = {
                    LMSInitialize() { inicializado = true; return "true"; },
                    LMSFinish() {
                      if (inicializado) persistir();
                      inicializado = false;
                      finalizado = true;
                      notificar("SCORM_FINISHED", { dados: estado() });
                      return "true";
                    },
                    LMSGetValue(nome) { return get(nome); },
                    LMSSetValue(nome, valor) { return set(nome, valor); },
                    LMSCommit() { persistir(); return "true"; },
                    LMSGetLastError() { return ultimoErro; },
                    LMSGetErrorString(codigo) { return erros[String(codigo)] || "Unknown error"; },
                    LMSGetDiagnostic(codigo) { return erros[String(codigo)] || "No diagnostic"; }
                  };

                  window.API_1484_11 = {
                    Initialize() { inicializado = true; return "true"; },
                    Terminate() { return window.API.LMSFinish(); },
                    GetValue(nome) { return get(nome); },
                    SetValue(nome, valor) { return set(nome, valor); },
                    Commit() { persistir(); return "true"; },
                    GetLastError() { return ultimoErro; },
                    GetErrorString(codigo) { return window.API.LMSGetErrorString(codigo); },
                    GetDiagnostic(codigo) { return window.API.LMSGetDiagnostic(codigo); }
                  };

                  window.addEventListener("message", (evento) => {
                    const dados = evento.data;
                    if (!dados || typeof dados !== "object") return;
                    if (dados.type === "SCORM_GET_STATUS") {
                      notificar("SCORM_STATUS", { dados: estado() });
                    }
                  });

                  window.addEventListener("beforeunload", () => {
                    if (!finalizado && inicializado) persistir();
                  });

                  function iniciar() {
                    const aviso = document.getElementById("aviso");
                    if (aviso) aviso.remove();

                    const frame = document.getElementById("sco");
                    frame.src = config.conteudoUrl;
                    notificar("SCORM_READY", { dados: estado() });
                  }

                  const url = "/api/v1/scorm/progresso?cursoSlug=" +
                    encodeURIComponent(config.cursoSlug) + "&usuarioId=" + encodeURIComponent(config.usuarioId);

                  fetch(url)
                    .then((resposta) => resposta.status === 204 ? null : (resposta.ok ? resposta.json() : null))
                    .then((progresso) => {
                      if (!progresso) return;
                      cmi["cmi.suspend_data"] = progresso.suspendData || "";
                      cmi["cmi.core.lesson_location"] = progresso.lessonLocation || "";
                      cmi["cmi.location"] = progresso.lessonLocation || "";
                      cmi["cmi.core.lesson_status"] = progresso.lessonStatus || cmi["cmi.core.lesson_status"];
                      cmi["cmi.completion_status"] = progresso.lessonStatus || cmi["cmi.completion_status"];
                      if (progresso.score !== null && progresso.score !== undefined) {
                        cmi["cmi.core.score.raw"] = String(progresso.score);
                        cmi["cmi.score.raw"] = String(progresso.score);
                      }
                      if (progresso.cmiDataJson) {
                        try { Object.assign(cmi, JSON.parse(progresso.cmiDataJson)); } catch (_) {}
                      }
                      notificar("SCORM_STATUS", { dados: estado() });
                    })
                    .catch(() => {})
                    .finally(iniciar);
                })();
              </script>
            </body>
            </html>
            """;
    }
}
