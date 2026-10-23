import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { assinarAlturaBannerCookie } from "@/lib/ui/cookie-banner-store"
import {
  ACESSIBILIDADE_PADRAO,
  atualizarPerfil,
  definirIdioma,
  type ConfigAcessibilidade,
  type FiltroDaltonismo,
  type Idioma,
  type TamanhoFonte,
} from "@/lib/auth/perfil"
import { aplicarIdioma } from "@/lib/i18n/idioma"
import { CHAVE_ACESSIBILIDADE, aplicarNaRaiz, lerConfig, salvarConfig } from "@/lib/a11y/config"

const IDIOMAS: { id: Idioma; rotulo: string; curto: string }[] = [
  { id: "pt-BR", rotulo: "Português", curto: "PT" },
  { id: "en-US", rotulo: "English", curto: "EN" },
  { id: "es-ES", rotulo: "Español", curto: "ES" },
]

const TAMANHOS_FONTE: TamanhoFonte[] = ["small", "normal", "large", "xlarge"]
const ROTULOS_FONTE: Record<TamanhoFonte, string> = {
  small: "A-",
  normal: "A",
  large: "A+",
  xlarge: "A++",
}

export function AccessibilityMenu() {
  const { t, i18n } = useTranslation(["a11y"])
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<ConfigAcessibilidade>(() => lerConfig())
  const [offsetCookies, setOffsetCookies] = useState(0)
  const idioma: Idioma = i18n.language === "en-US" || i18n.language === "es-ES" ? i18n.language : "pt-BR"
  const fecharRef = useRef<HTMLButtonElement>(null)
  const asideRef = useRef<HTMLElement>(null)

  // Sobe os botões fixos quando o banner de cookies está aberto.
  useEffect(() => assinarAlturaBannerCookie(setOffsetCookies), [])

  useEffect(() => {
    aplicarNaRaiz(config)
  }, [config])

  // Abre a barra a partir de qualquer botão da interface (ex.: card da área do aluno).
  useEffect(() => {
    const abrir = () => setOpen(true)
    window.addEventListener("sesi:abrir-acessibilidade", abrir)
    return () => window.removeEventListener("sesi:abrir-acessibilidade", abrir)
  }, [])

  useEffect(() => {
    if (!open) return
    const focoAnterior = document.activeElement as HTMLElement | null
    fecharRef.current?.focus()

    const focaveis = () =>
      Array.from(
        asideRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((elemento) => elemento.offsetParent !== null)

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault()
        setOpen(false)
        return
      }
      if (evento.key !== "Tab") return

      const lista = focaveis()
      if (lista.length === 0) return
      const primeiro = lista[0]
      const ultimo = lista[lista.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener("keydown", aoTeclar)
    const raiz = document.documentElement
    const corpo = document.body
    const overflowAnterior = corpo.style.overflow
    const overflowRaizAnterior = raiz.style.overflow
    const paddingDireitaAnterior = corpo.style.paddingRight
    const posicaoAnterior = corpo.style.position
    const topoAnterior = corpo.style.top
    const esquerdaAnterior = corpo.style.left
    const direitaAnterior = corpo.style.right
    const larguraAnterior = corpo.style.width
    const rolagemAnterior = window.scrollY
    const larguraBarra = window.innerWidth - raiz.clientWidth
    corpo.style.position = "fixed"
    corpo.style.top = `-${rolagemAnterior}px`
    corpo.style.left = "0"
    corpo.style.right = "0"
    corpo.style.width = "100%"
    corpo.style.overflow = "hidden"
    raiz.style.overflow = "hidden"
    if (larguraBarra > 0) corpo.style.paddingRight = `${larguraBarra}px`
    raiz.setAttribute("data-a11y-aberto", "true")
    window.dispatchEvent(new Event("sesi:travar-scroll"))
    const widgetsVlibras = document.querySelectorAll<HTMLElement>(
      "[vw], [vw-access-button], [vw-plugin-wrapper], #vlibras-access-wrapper",
    )
    widgetsVlibras.forEach((widget) => {
      widget.style.display = "none"
    })
    return () => {
      document.removeEventListener("keydown", aoTeclar)
      corpo.style.position = posicaoAnterior
      corpo.style.top = topoAnterior
      corpo.style.left = esquerdaAnterior
      corpo.style.right = direitaAnterior
      corpo.style.width = larguraAnterior
      corpo.style.overflow = overflowAnterior
      corpo.style.paddingRight = paddingDireitaAnterior
      raiz.style.overflow = overflowRaizAnterior
      raiz.removeAttribute("data-a11y-aberto")
      window.scrollTo(0, rolagemAnterior)
      window.dispatchEvent(new Event("sesi:liberar-scroll"))
      widgetsVlibras.forEach((widget) => {
        widget.style.display = ""
      })
      focoAnterior?.focus()
    }
  }, [open])

  const atualizar = (parcial: Partial<ConfigAcessibilidade>) => {
    const nova = { ...config, ...parcial }
    setConfig(nova)
    salvarConfig(nova)
    atualizarPerfil({ acessibilidade: nova })
  }

  const trocarIdioma = (novo: Idioma) => {
    aplicarIdioma(novo)
    definirIdioma(novo)
  }

  const restaurar = () => {
    setConfig({ ...ACESSIBILIDADE_PADRAO })
    window.localStorage.removeItem(CHAVE_ACESSIBILIDADE)
    atualizarPerfil({ acessibilidade: { ...ACESSIBILIDADE_PADRAO } })
  }

  const indiceFonte = Math.max(0, TAMANHOS_FONTE.indexOf(config.tamanhoFonte))
  const rotuloFonte = t(`a11y:${config.tamanhoFonte}`)

  return (
    <>
      <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="protanopia-filter">
            <feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0" />
          </filter>
          <filter id="deuteranopia-filter">
            <feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0" />
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0" />
          </filter>
        </defs>
      </svg>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("a11y:open")}
        aria-expanded={open}
        aria-controls="barra-acessibilidade"
        className="fixed left-5 z-[9999] grid h-12 w-12 place-items-center rounded-full bg-[var(--sesi-black)] text-white shadow-lg transition hover:bg-[var(--sesi-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        style={{ bottom: `${80 + offsetCookies}px` }}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="4.5" r="2" fill="currentColor" stroke="none" />
          <path d="M4.5 8.5c2.6.8 5 1.2 7.5 1.2s4.9-.4 7.5-1.2" strokeLinecap="round" />
          <path d="M12 9.7v5.2m0 0-2.8 5.6m2.8-5.6 2.8 5.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside
            ref={asideRef}
            id="barra-acessibilidade"
            role="dialog"
            aria-modal="true"
            aria-labelledby="acessibilidade-titulo"
            data-lenis-prevent
            className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-[var(--sesi-gray)] px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sesi-red)]">SESI</p>
                <h2 id="acessibilidade-titulo" className="text-xl font-bold text-[var(--sesi-black)]">
                  {t("a11y:accessibility")}
                </h2>
              </div>
              <button
                ref={fecharRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("a11y:close")}
                className="grid h-10 w-10 place-items-center rounded-full text-[var(--sesi-muted)] transition hover:bg-[#F5F5F5] hover:text-[var(--sesi-black)]"
              >
                ✕
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <div className="flex flex-col gap-6">
              <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--sesi-red)]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18M12 3c2.5 2.4 3.8 5.4 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3Z" />
                  </svg>
                  <p className="text-sm font-bold text-[var(--sesi-black)]">{t("a11y:language")}</p>
                </div>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label={t("a11y:language")}>
                  {IDIOMAS.map((opcao) => (
                    <button
                      key={opcao.id}
                      type="button"
                      onClick={() => trocarIdioma(opcao.id)}
                      aria-pressed={idioma === opcao.id}
                      aria-label={`${opcao.rotulo} - ${opcao.curto}`}
                      title={opcao.rotulo}
                      className={`flex items-center justify-center gap-1 rounded-[var(--radius-lg)] border px-2 py-2.5 text-xs font-bold transition ${
                        idioma === opcao.id
                          ? "border-[var(--sesi-red)] bg-[var(--sesi-red)] text-white"
                          : "border-[var(--sesi-gray)] bg-white text-[var(--sesi-black)] hover:border-[var(--sesi-red)]"
                      }`}
                    >
                      {opcao.curto}
                      {idioma === opcao.id && <span aria-hidden="true">✓</span>}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[var(--sesi-muted)]">{t("a11y:languageHint")}</p>
              </section>

              <section>
                <p className="mb-2 text-sm font-bold text-[var(--sesi-black)]">{t("a11y:theme")}</p>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("a11y:theme")}>
                  <button
                    type="button"
                    onClick={() => atualizar({ tema: "claro" })}
                    aria-pressed={config.tema === "claro"}
                    className={`flex items-center justify-center gap-2 rounded-[var(--radius-lg)] border px-3 py-2.5 text-sm font-semibold transition ${
                      config.tema === "claro"
                        ? "border-[var(--sesi-red)] bg-[var(--sesi-red)] text-white"
                        : "border-[var(--sesi-gray)] bg-white text-[var(--sesi-black)] hover:border-[var(--sesi-red)]"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
                    </svg>
                    {t("a11y:light")}
                  </button>
                  <button
                    type="button"
                    onClick={() => atualizar({ tema: "escuro" })}
                    aria-pressed={config.tema === "escuro"}
                    className={`flex items-center justify-center gap-2 rounded-[var(--radius-lg)] border px-3 py-2.5 text-sm font-semibold transition ${
                      config.tema === "escuro"
                        ? "border-[var(--sesi-red)] bg-[var(--sesi-red)] text-white"
                        : "border-[var(--sesi-gray)] bg-white text-[var(--sesi-black)] hover:border-[var(--sesi-red)]"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" strokeLinejoin="round" />
                    </svg>
                    {t("a11y:dark")}
                  </button>
                </div>
              </section>

              <section>
                <label htmlFor="a11y-filtro" className="mb-2 block text-sm font-bold text-[var(--sesi-black)]">
                  {t("a11y:colorFilter")}
                </label>
                <select
                  id="a11y-filtro"
                  value={config.filtro}
                  onChange={(evento) => atualizar({ filtro: evento.target.value as FiltroDaltonismo })}
                  className="w-full rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--sesi-red)]"
                >
                  <option value="none">{t("a11y:none")}</option>
                  <option value="protanopia">Protanopia</option>
                  <option value="deuteranopia">Deuteranopia</option>
                  <option value="tritanopia">Tritanopia</option>
                  <option value="monocromia">Monocromia</option>
                </select>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="a11y-fonte" className="text-sm font-bold text-[var(--sesi-black)]">
                    {t("a11y:fontSize")}
                  </label>
                  <span className="text-xs font-semibold text-[var(--sesi-red)]" aria-live="polite">
                    {rotuloFonte}
                  </span>
                </div>
                <input
                  id="a11y-fonte"
                  type="range"
                  min={0}
                  max={TAMANHOS_FONTE.length - 1}
                  step={1}
                  value={indiceFonte}
                  onChange={(evento) => atualizar({ tamanhoFonte: TAMANHOS_FONTE[Number(evento.target.value)] })}
                  aria-valuetext={rotuloFonte}
                  className="w-full cursor-pointer accent-[var(--sesi-red)]"
                />
                <div className="mt-1 flex justify-between px-0.5 text-xs font-semibold text-[var(--sesi-muted)]" aria-hidden="true">
                  {TAMANHOS_FONTE.map((tamanho) => (
                    <span key={tamanho}>{ROTULOS_FONTE[tamanho]}</span>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--sesi-muted)]">{t("a11y:fontSizeHint")}</p>
              </section>

              <section>
                <p className="mb-2 text-sm font-bold text-[var(--sesi-black)]">{t("a11y:font")}</p>
                <label className="flex cursor-pointer items-center justify-between rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] px-4 py-3 text-sm font-medium">
                  <span>{t("a11y:dyslexiaFont")}</span>
                  <input
                    type="checkbox"
                    checked={config.dislexia}
                    onChange={(evento) => atualizar({ dislexia: evento.target.checked })}
                    className="h-5 w-5 accent-[var(--sesi-red)]"
                  />
                </label>
              </section>

              <section>
                <p className="mb-2 text-sm font-bold text-[var(--sesi-black)]">{t("a11y:vlibras")}</p>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] px-4 py-3 text-sm font-medium">
                  <span>{t("a11y:vlibrasEnable")}</span>
                  <input
                    type="checkbox"
                    checked={config.vlibras}
                    onChange={(evento) => atualizar({ vlibras: evento.target.checked })}
                    className="h-5 w-5 accent-[var(--sesi-red)]"
                  />
                </label>
                <p className="mt-2 text-xs leading-relaxed text-[var(--sesi-muted)]">{t("a11y:vlibrasHint")}</p>
              </section>
              </div>
            </div>

            <footer className="shrink-0 border-t border-[var(--sesi-gray)] px-6 py-4">
              <button
                type="button"
                onClick={restaurar}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--sesi-black)] px-4 py-2.5 text-sm font-semibold text-[var(--sesi-black)] transition hover:bg-[var(--sesi-black)] hover:text-white"
              >
                {t("a11y:reset")}
              </button>
            </footer>
          </aside>
        </div>
      )}
    </>
  )
}
