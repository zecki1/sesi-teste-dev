import { useEffect, useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Container } from "./container"
import logoWhite from "@/assets/logo-sesi-industria-white.svg"
import logoPrimary from "@/assets/logo-sesi-industria-primary.svg"
import { usePerfil } from "@/lib/auth/perfil"

export function Header() {
  const { t } = useTranslation("nav")
  const { pathname } = useLocation()
  const { slug } = useParams<{ slug: string }>()
  const perfil = usePerfil()
  const [open, setOpen] = useState(false)
  const [solid, setSolid] = useState(false)
  const dentroPlayerScorm = pathname.endsWith("/scorm/player")
  const nomeAluno = perfil ? `${perfil.nome} ${perfil.sobrenome}`.trim() : ""
  const iniciaisAluno = perfil
    ? `${perfil.nome.charAt(0)}${perfil.sobrenome.charAt(0)}`.toLocaleUpperCase()
    : ""

  useEffect(() => {
    const hasHero = Boolean(document.getElementById("hero"))

    // Páginas sem hero (catálogo, curso, AVA): header sempre branco.
    if (!hasHero) {
      setSolid(true)
      return
    }

    const update = () => setSolid(window.scrollY > 8)

    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])

  const linkClass =
    "text-sm font-semibold transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 h-[72px] transition-colors duration-300 ${
        solid
          ? "bg-white text-[var(--sesi-black)] shadow-[0_1px_4px_rgb(0_0_0/.10)]"
          : "bg-transparent text-white"
      }`}
    >
      <Container className="flex h-full items-center">
        <Link to="/" className="flex shrink-0 items-center" aria-label="SESI Indústria - Início">
          <img
            src={solid ? logoPrimary : logoWhite}
            alt="SESI Indústria"
            width="132"
            height="14"
            className="h-auto w-[132px]"
          />
        </Link>

        <nav className="ml-auto hidden items-center gap-8 md:flex" aria-label="Navegação principal">
          <Link to="/" className={linkClass}>
            {t("nav:home")}
          </Link>
          <Link to="/catalogo" className={linkClass}>
            {t("nav:courses")}
          </Link>
          <Link to="/sobre" className={linkClass}>
            {t("nav:about")}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3 md:ml-8">
          {dentroPlayerScorm && (
            <Link
              to={`/curso/${slug}/scorm`}
              aria-label="Voltar aos detalhes do curso"
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4 ${
                solid
                  ? "border-[var(--sesi-black)] text-[var(--sesi-black)] hover:bg-[var(--sesi-black)] hover:text-white"
                  : "border-white text-white hover:bg-white hover:text-[var(--sesi-red)]"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M19 12H5m0 0 7 7m-7-7 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline">Voltar</span>
            </Link>
          )}

          <Link
            to="/area-do-aluno"
            aria-label={perfil ? `Área do aluno: ${nomeAluno}` : t("nav:studentArea")}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4 ${
              solid
                ? "border-[var(--sesi-black)] text-[var(--sesi-black)] hover:bg-[var(--sesi-black)] hover:text-white"
                : "border-white text-white hover:bg-white hover:text-[var(--sesi-red)]"
            }`}
          >
            {perfil ? (
              <>
                <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--sesi-red)] text-xs font-bold text-white">
                  {iniciaisAluno}
                </span>
                <span className="hidden max-w-36 truncate sm:inline">{nomeAluno}</span>
              </>
            ) : (
              <span className={dentroPlayerScorm ? "hidden sm:inline" : ""}>
                {t("nav:studentArea")}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="menu-mobile"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {open ? (
                <path
                  d="M6 6L18 18M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 12H21M3 6H21M3 18H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </Container>

      {open && (
        <div
          id="menu-mobile"
          className="absolute inset-x-0 top-[72px] border-t border-black/5 bg-white text-[var(--sesi-black)] shadow-[0_8px_16px_rgb(0_0_0/.08)] md:hidden"
        >
          <Container className="flex flex-col gap-1 py-4">
            <Link to="/" onClick={() => setOpen(false)} className="rounded-lg px-2 py-3 text-sm font-semibold hover:bg-black/5">
              {t("nav:home")}
            </Link>
            <Link to="/catalogo" onClick={() => setOpen(false)} className="rounded-lg px-2 py-3 text-sm font-semibold hover:bg-black/5">
              {t("nav:courses")}
            </Link>
            <Link to="/sobre" onClick={() => setOpen(false)} className="rounded-lg px-2 py-3 text-sm font-semibold hover:bg-black/5">
              {t("nav:about")}
            </Link>
            <Link
              to="/area-do-aluno"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md border border-[var(--sesi-black)] px-5 py-2.5 text-center text-sm font-semibold hover:bg-[var(--sesi-black)] hover:text-white"
            >
              {perfil ? nomeAluno : t("nav:studentArea")}
            </Link>
          </Container>
        </div>
      )}
    </header>
  )
}
