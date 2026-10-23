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
                  let ultimaAcessibilidade = null;

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
                    if (evento.source === window.parent && dados.type === "SESI_A11Y_CONFIG") {
                      aplicarAcessibilidade(dados.config);
                      return;
                    }
                    if (dados.type === "SCORM_GET_STATUS") {
                      notificar("SCORM_STATUS", { dados: estado() });
                    }
                  });

                  function aplicarAcessibilidade(preferencias) {
                    if (!preferencias || typeof preferencias !== "object") return;
                    const filtros = ["none", "protanopia", "deuteranopia", "tritanopia", "monocromia"];
                    const tamanhos = ["small", "normal", "large", "xlarge"];
                    const temas = ["claro", "escuro"];
                    const configA11y = {
                      filtro: filtros.includes(preferencias.filtro) ? preferencias.filtro : "none",
                      tamanhoFonte: tamanhos.includes(preferencias.tamanhoFonte) ? preferencias.tamanhoFonte : "normal",
                      dislexia: preferencias.dislexia === true,
                      tema: temas.includes(preferencias.tema) ? preferencias.tema : "claro",
                      vlibras: preferencias.vlibras !== false
                    };
                    const fonteDataUrl = typeof preferencias.fontDataUrl === "string" &&
                      /^data:font\/woff2;base64,[a-zA-Z0-9+/]+={0,2}$/.test(preferencias.fontDataUrl)
                      ? preferencias.fontDataUrl
                      : null;
                    ultimaAcessibilidade = { ...configA11y, fontDataUrl: fonteDataUrl };

                    function aplicarNoDocumento(documento) {
                      const raiz = documento.documentElement;
                      if (!raiz) return;
                      raiz.setAttribute("data-color-filter", configA11y.filtro);
                      raiz.setAttribute("data-font-size", configA11y.tamanhoFonte);
                      raiz.setAttribute("data-font", configA11y.dislexia ? "opendyslexic" : "default");
                      raiz.setAttribute("data-theme", configA11y.tema);
                      raiz.setAttribute("data-vlibras", configA11y.vlibras ? "on" : "off");

                      let estilos = documento.getElementById("sesi-a11y-styles");
                      if (!estilos) {
                        estilos = documento.createElement("style");
                        estilos.id = "sesi-a11y-styles";
                        estilos.textContent = `
                          html[data-theme="escuro"], html[data-theme="escuro"] body {
                            color-scheme: dark !important;
                            background: #0c0c0d !important;
                            color: #f4f4f5 !important;
                          }
                          html[data-theme="escuro"] body :is(main, section, article, header, footer, nav, aside, form, fieldset, table, th, td) {
                            background-color: #17171a !important;
                            border-color: #2e2e33 !important;
                          }
                          html[data-theme="escuro"] body :is(p, li, label, h1, h2, h3, h4, h5, h6, dt, dd, td, th, small, strong, em) {
                            color: #f4f4f5 !important;
                          }
                          html[data-theme="escuro"] body :is(input, select, textarea, button) {
                            color: #f4f4f5 !important;
                            background-color: #232327 !important;
                            border-color: #3f3f46 !important;
                          }
                          html[data-color-filter="protanopia"] body { filter: url(#sesi-protanopia-filter); }
                          html[data-color-filter="deuteranopia"] body { filter: url(#sesi-deuteranopia-filter); }
                          html[data-color-filter="tritanopia"] body { filter: url(#sesi-tritanopia-filter); }
                          html[data-color-filter="monocromia"] body { filter: grayscale(1); }
                          html[data-font-size="small"] { font-size: 14px !important; }
                          html[data-font-size="normal"] { font-size: 16px !important; }
                          html[data-font-size="large"] { font-size: 18px !important; }
                          html[data-font-size="xlarge"] { font-size: 20px !important; }
                          html[data-font="opendyslexic"] body { font-family: OpenDyslexic, "Open Sans", system-ui, sans-serif !important; }
                        `;
                        (documento.head || raiz).appendChild(estilos);
                      }

                      if (fonteDataUrl) {
                        let fonte = documento.getElementById("sesi-a11y-font");
                        if (!fonte) {
                          fonte = documento.createElement("style");
                          fonte.id = "sesi-a11y-font";
                          (documento.head || raiz).appendChild(fonte);
                        }
                        fonte.textContent = `@font-face { font-family: OpenDyslexic; src: url("${fonteDataUrl}") format("woff2"); font-weight: 400; font-style: normal; font-display: swap; }`;
                      }

                      if (!documento.getElementById("sesi-a11y-filters")) {
                        const svg = documento.createElementNS("http://www.w3.org/2000/svg", "svg");
                        svg.id = "sesi-a11y-filters";
                        svg.setAttribute("aria-hidden", "true");
                        svg.setAttribute("style", "position:fixed;width:0;height:0;overflow:hidden");
                        svg.innerHTML = `
                          <defs>
                            <filter id="sesi-protanopia-filter"><feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0" /></filter>
                            <filter id="sesi-deuteranopia-filter"><feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0" /></filter>
                            <filter id="sesi-tritanopia-filter"><feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0" /></filter>
                          </defs>
                        `;
                        (documento.body || raiz).prepend(svg);
                      }

                      for (const interno of Array.from(documento.querySelectorAll("iframe"))) {
                        try {
                          if (!interno.dataset.sesiA11yListener) {
                            interno.dataset.sesiA11yListener = "true";
                            interno.addEventListener("load", () => {
                              if (ultimaAcessibilidade) aplicarAcessibilidade(ultimaAcessibilidade);
                            });
                          }
                          if (interno.contentDocument) aplicarNoDocumento(interno.contentDocument);
                        } catch (_) {}
                      }
                    }

                    aplicarNoDocumento(document);
                  }

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
