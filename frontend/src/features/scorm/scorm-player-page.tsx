import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useCurso } from "@/hooks/use-catalogo"
import { atualizarPerfil, definirIdioma, usePerfil } from "@/lib/auth/perfil"
import type { Idioma, Tema } from "@/lib/auth/perfil"
import { lerConfig, aplicarNaRaiz, salvarConfig } from "@/lib/a11y/config"
import { aplicarIdioma } from "@/lib/i18n/idioma"
import { useScormAcessibilidade } from "@/features/scorm/use-scorm-acessibilidade"
import { registrarMarcoCurso } from "@/lib/api/gestao"
import { SuperSesinhoTutor } from "@/components/support/super-sesinho-tutor"
import {
  obterConfiguracaoPaginaScorm,
  obterPacoteScorm,
  obterProgressoScorm,
  urlPlayerScorm,
  type PacoteScormDto,
  type ScormPaginaConfigDto,
} from "./scorm-api"

/** Extrai o texto visível do wrapper SCORM e de todos os iframes internos (mesma origem). */
function lerConteudoScorm(): string {
  const externo = document.querySelector<HTMLIFrameElement>("[data-player-scorm]")
  const documentos: Document[] = []

  const visitar = (documento: Document | null | undefined) => {
    if (!documento || documentos.includes(documento)) return
    documentos.push(documento)
    documento.querySelectorAll("iframe").forEach((frame) => {
      try {
        visitar(frame.contentDocument)
      } catch {
        /* iframe de outra origem */
      }
    })
  }

  try {
    visitar(externo?.contentDocument)
  } catch {
    /* documento ainda não carregado */
  }

  return documentos
    .map((documento) => documento.body?.innerText ?? "")
    .join("\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 9000)
}

/**
 * Player do curso SCORM em tela cheia.
 *
 * A página não usa o header/footer do AVA: só o conteúdo, um botão flutuante
 * para voltar ao AVA e o tutor. O VLibras fica desligado aqui (o AVA tem o
 * widget global) — ver `html[data-scorm-player]` em `a11y.css`.
 */
export function ScormPlayerPage() {
  const { t, i18n } = useTranslation(["course", "a11y"])
  const { slug = "" } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [parametros] = useSearchParams()
  const retomar = parametros.get("retomar") === "1"
  const reiniciar = parametros.get("reiniciar") === "1"
  const depurar = parametros.get("debug") === "1"
  const { data: curso } = useCurso(slug)
  const perfil = usePerfil()
  const usuarioId = perfil?.email || "anonimo"

  const [pacote, setPacote] = useState<PacoteScormDto | null>(null)
  const [configuracao, setConfiguracao] = useState<ScormPaginaConfigDto | null>(null)
  const [progresso, setProgresso] = useState(0)
  const [statusScorm, setStatusScorm] = useState("")
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [logs, setLogs] = useState<string[]>([])
  const conclusaoRegistrada = useRef(false)
  const frameRef = useRef<HTMLIFrameElement>(null)

  const registrar = useCallback(
    (origem: string, texto: string) => {
      if (depurar) console.log(`[SESI][PLAYER] ${origem}: ${texto}`)
      if (!depurar) return
      const linha = `${new Date().toLocaleTimeString("pt-BR")} ${origem}: ${texto}`
      setLogs((atual) => [...atual.slice(-24), linha])
    },
    [depurar],
  )

  const enviarParaPlayer = useCallback(
    (mensagem: Record<string, unknown>) => {
      frameRef.current?.contentWindow?.postMessage(mensagem, "*")
      registrar("envio", String(mensagem.type))
    },
    [registrar],
  )

  // Acessibilidade vai para o wrapper; o VLibras fica desligado no player.
  useScormAcessibilidade(Boolean(pacote), pacote?.id, true)

  // Enquanto esta rota está montada, o VLibras global do AVA não aparece.
  useEffect(() => {
    const raiz = document.documentElement
    raiz.setAttribute("data-scorm-player", "true")
    return () => {
      raiz.removeAttribute("data-scorm-player")
    }
  }, [])

  useEffect(() => {
    if (!slug) return
    let ativo = true
    setCarregando(true)
    setErro("")

    Promise.allSettled([obterPacoteScorm(slug), obterConfiguracaoPaginaScorm(slug)]).then(
      ([resultadoPacote, resultadoConfig]) => {
        if (!ativo) return
        if (resultadoPacote.status === "fulfilled") setPacote(resultadoPacote.value)
        else setErro(resultadoPacote.reason instanceof Error ? resultadoPacote.reason.message : t("course:scorm.packageError"))
        if (resultadoConfig.status === "fulfilled") setConfiguracao(resultadoConfig.value)
        setCarregando(false)
      },
    )

    return () => {
      ativo = false
    }
  }, [slug, t])

  // Progresso inicial + polling de segurança (o wrapper também envia por postMessage).
  useEffect(() => {
    if (!slug || !pacote) return
    let ativo = true

    const consultar = () =>
      obterProgressoScorm(slug, usuarioId)
        .then((salvo) => {
          if (!ativo || !salvo) return
          setProgresso((atual) => Math.max(atual, Math.round(salvo.percentual)))
          if (salvo.lessonStatus) setStatusScorm(salvo.lessonStatus)
        })
        .catch(() => {})

    void consultar()
    const intervalo = window.setInterval(consultar, 5000)

    return () => {
      ativo = false
      window.clearInterval(intervalo)
    }
  }, [slug, pacote, usuarioId])

  useEffect(() => {
    if (!slug || !perfil?.email) return
    registrarMarcoCurso(slug, perfil.email, "inicio").catch(() => {})
  }, [slug, perfil?.email])

  // Envia idioma atual para o wrapper (que repassa ao conteúdo SCORM).
  const enviarIdioma = useCallback(() => {
    const idioma = (window.localStorage.getItem("sesi.idioma") as "pt-BR" | "en-US" | "es-ES" | null) || "pt-BR"
    aplicarIdioma(idioma)
    enviarParaPlayer({ type: "SESI_LANG_CHANGED", lang: idioma })
  }, [enviarParaPlayer])

  useEffect(() => {
    enviarIdioma()
  }, [enviarIdioma, pacote])

  /**
   * Ao carregar o wrapper: manda o idioma e, quando solicitado, a retomada
   * (ou o reset). O conteúdo pode demorar a montar, então repetimos algumas
   * vezes — a mensagem é idempotente.
   */
  const aoCarregarPlayer = useCallback(() => {
    enviarIdioma()
    registrar("load", "wrapper do SCORM carregado")

    if (retomar) {
      ;[300, 1200, 2500, 4000].forEach((ms) =>
        window.setTimeout(() => enviarParaPlayer({ type: "SESI_RESUME" }), ms),
      )
    }
    if (reiniciar) {
      ;[300, 1200, 2500].forEach((ms) =>
        window.setTimeout(() => enviarParaPlayer({ type: "SESI_RESET" }), ms),
      )
    }
    window.setTimeout(() => enviarParaPlayer({ type: "SCORM_GET_STATUS" }), 900)
  }, [enviarIdioma, enviarParaPlayer, registrar, reiniciar, retomar])
  useEffect(() => {
    const aoReceber = (evento: MessageEvent) => {
      const mensagem = evento.data as
        | { type?: string; dados?: { percentual?: number; lessonStatus?: string }; lang?: string; theme?: string; evento?: string; detalhes?: unknown }
        | null
      if (!mensagem || typeof mensagem !== "object") return

      registrar("recebido", String(mensagem.type || "sem tipo"))

      if (mensagem.type === "SESI_LANG_CHANGED" && mensagem.lang) {
        const codigo = mensagem.lang
        if (codigo !== i18n.language) {
          aplicarIdioma(codigo as Parameters<typeof aplicarIdioma>[0])
          definirIdioma(codigo as Idioma)
        }
        return
      }

      if (mensagem.type === "SESI_THEME_CHANGED" && mensagem.theme) {
        const tema: Tema = mensagem.theme === "escuro" ? "escuro" : "claro"
        const config = lerConfig()
        if (config.tema !== tema) {
          const nova = { ...config, tema }
          salvarConfig(nova)
          aplicarNaRaiz(nova)
          atualizarPerfil({ acessibilidade: nova })
        }
        return
      }

      if (mensagem.type === "SCORM_DEBUG") {
        registrar("debug", `${mensagem.evento} ${JSON.stringify(mensagem.detalhes ?? "")}`)
        return
      }

      if (!String(mensagem.type).startsWith("SCORM_")) return

      const dados = mensagem.dados ?? (mensagem as { percentual?: number; lessonStatus?: string })
      if (typeof dados.percentual === "number") {
        setProgresso((atual) => Math.max(atual, Math.round(dados.percentual ?? 0)))
      }
      if (dados.lessonStatus) setStatusScorm(dados.lessonStatus)
    }

    window.addEventListener("message", aoReceber)
    return () => window.removeEventListener("message", aoReceber)
  }, [i18n.language, registrar])

  // Conclusão: registra o marco e dispara a celebração do certificado.
  useEffect(() => {
    const concluido = ["completed", "passed", "complete"].includes(statusScorm.toLowerCase())
    if (!slug || !perfil?.email || conclusaoRegistrada.current || (progresso < 100 && !concluido)) return
    conclusaoRegistrada.current = true

    const celebrar = (concluidoEm: string) => {
      const chave = `sesi.certificado.mostrado.${slug}::${perfil.email!.toLowerCase()}`
      if (window.localStorage.getItem(chave)) return
      window.localStorage.setItem(chave, "1")
      window.dispatchEvent(
        new CustomEvent("sesi:curso-concluido", {
          detail: {
            slug,
            titulo: curso?.nomeCompleto ?? curso?.nomeBreve ?? slug,
            aluno: `${perfil.nome} ${perfil.sobrenome}`.trim(),
            concluidoEm,
          },
        }),
      )
    }

    let tentativas = 0;
    const tentar = () => {
      registrarMarcoCurso(slug, perfil.email!, "conclusao", progresso)
        .then((marco) => celebrar(marco.concluidoEm || new Date().toISOString()))
        .catch(() => {
          if (tentativas++ < 4) window.setTimeout(tentar, 1000);
          else celebrar(new Date().toISOString());
        });
    };
    tentar();
  }, [slug, perfil?.email, perfil?.nome, perfil?.sobrenome, progresso, statusScorm, curso?.nomeCompleto, curso?.nomeBreve])

  /** Fecha a guia (quando aberta pelo AVA) ou volta para a página do curso. */
  const voltarAoAva = () => {
    if (window.opener && !window.opener.closed) {
      window.close()
      return
    }
    navigate(`/area-do-aluno/curso/${slug}`)
  }

  const obterContexto = useCallback(() => {
    const conteudo = lerConteudoScorm()
    if (!conteudo) return undefined
    const titulo = configuracao?.titulo || curso?.nomeCompleto || slug
    return `Curso: ${titulo}\n\nConteúdo atual do SCORM:\n${conteudo}`
  }, [configuracao?.titulo, curso?.nomeCompleto, slug])

  if (!slug || (!carregando && !pacote)) {
    return (
      <div className="grid h-svh place-items-center px-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <p role="alert" className="text-sm text-[var(--sesi-red)]">
            {erro || t("course:scorm.noPackage")}
          </p>
          <button
            type="button"
            onClick={voltarAoAva}
            className="rounded-[var(--radius-lg)] bg-[var(--sesi-black)] px-4 py-2 text-sm font-semibold text-white"
          >
            {t("course:scorm.backToCourse")}
          </button>
        </div>
      </div>
    )
  }

  const titulo = configuracao?.titulo || curso?.nomeCompleto || curso?.nomeBreve || slug
  const urlPlayer = pacote ? urlPlayerScorm(pacote, usuarioId) : ""

  return (
    <div className="relative h-svh w-full overflow-hidden bg-white" data-scorm-player>
      <div
        className="absolute inset-x-0 top-0 z-10 h-1 bg-black/10"
        role="progressbar"
        aria-label={t("course:scorm.progress")}
        aria-valuenow={progresso}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-[var(--sesi-red)] transition-[width] duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progresso))}%` }}
        />
      </div>

      {urlPlayer ? (
        <iframe
          ref={frameRef}
          data-player-scorm
          src={urlPlayer}
          title={t("course:scorm.playerTitle", { curso: titulo })}
          className="h-full w-full border-0"
          allow="fullscreen; autoplay; clipboard-read; clipboard-write"
          onLoad={aoCarregarPlayer}
        />
      ) : (
        <div className="grid h-full place-items-center px-6 text-sm text-[var(--sesi-muted)]">
          {t("course:scorm.loadingPlayer")}
        </div>
      )}

      {erro && (
        <p
          role="alert"
          className="absolute inset-x-4 top-4 z-20 rounded-[var(--radius-lg)] bg-white/95 px-4 py-2 text-sm text-[var(--sesi-red)] shadow"
        >
          {erro}
        </p>
      )}

      {/* Controles flutuantes: voltar ao AVA e progresso. */}
      <div className="absolute bottom-5 left-5 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={voltarAoAva}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--sesi-black)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M19 12H5m0 0 7 7m-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("course:scorm.backToCourse")}
        </button>

        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--sesi-black)] shadow" data-progresso-player>
          {progresso}%
        </span>
      </div>

      <SuperSesinhoTutor obterContexto={obterContexto} />

      {depurar && (
        <aside
          className="absolute right-3 top-3 z-30 w-[360px] max-w-[calc(100vw-1.5rem)] rounded-lg border border-black/10 bg-white/95 p-3 text-[11px] leading-snug text-slate-900 shadow-xl"
          data-scorm-debug-painel
        >
          <div className="mb-2 flex items-center justify-between">
            <strong className="text-xs">Diagnóstico SCORM</strong>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="rounded border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
            >
              Limpar
            </button>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
            <dt className="font-semibold">Progresso</dt>
            <dd data-debug-progresso>{progresso}%</dd>
            <dt className="font-semibold">Status</dt>
            <dd data-debug-status>{statusScorm || "—"}</dd>
            <dt className="font-semibold">Retomada</dt>
            <dd>{retomar ? "sim" : "não"}</dd>
            <dt className="font-semibold">Reiniciar</dt>
            <dd>{reiniciar ? "sim" : "não"}</dd>
            <dt className="font-semibold">Pacote</dt>
            <dd>{pacote?.id} ({pacote?.versao})</dd>
          </dl>
          <ul className="mt-2 max-h-48 overflow-auto border-t border-slate-200 pt-1 font-mono">
            {logs.length === 0 ? (
              <li className="py-0.5 text-slate-500">Sem eventos ainda.</li>
            ) : (
              logs.map((linha, indice) => (
                <li key={indice} className="border-b border-slate-100 py-0.5 break-all">
                  {linha}
                </li>
              ))
            )}
          </ul>
        </aside>
      )}
    </div>
  )
}
