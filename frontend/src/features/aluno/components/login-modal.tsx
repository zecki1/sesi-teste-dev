import { FormEvent, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  EMAIL_ADMIN,
  EMAIL_TESTE,
  atualizarPerfil,
  criarConta,
  entrar,
  type PerfilAluno,
} from "@/lib/auth/perfil"
import { idiomaAtual } from "@/lib/i18n/idioma"

interface LoginModalProps {
  aberto: boolean
  onFechar: () => void
  onEntrou: (perfil: PerfilAluno) => void
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const campo =
  "w-full rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white px-3 py-2.5 text-sm text-[var(--sesi-black)] outline-none transition focus:border-[var(--sesi-red)] focus:ring-2 focus:ring-[var(--sesi-red)]/20"

const botaoPrimario =
  "inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sesi-red)] disabled:opacity-60"

const botaoSocial =
  "inline-flex w-full items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--sesi-black)] transition hover:bg-[#F5F5F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sesi-black)]"

export function LoginModal({ aberto, onFechar, onEntrou }: LoginModalProps) {
  const { t } = useTranslation(["student", "common"])
  const [etapa, setEtapa] = useState<"email" | "cadastro">("email")
  const [email, setEmail] = useState("")
  const [nome, setNome] = useState("")
  const [sobrenome, setSobrenome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [erro, setErro] = useState("")

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onFechar()
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
    window.dispatchEvent(new Event("sesi:travar-scroll"))

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
      window.scrollTo(0, rolagemAnterior)
      window.dispatchEvent(new Event("sesi:liberar-scroll"))
    }
  }, [aberto, onFechar])

  useEffect(() => {
    if (!aberto) {
      setEtapa("email")
      setErro("")
    }
  }, [aberto])

  if (!aberto) return null

  const concluir = (perfil: PerfilAluno) => {
    atualizarPerfil({ idioma: idiomaAtual() })
    onEntrou(perfil)
  }

  const entrarComEmail = (valor: string) => {
    const perfil = entrar(valor)
    concluir(perfil)
  }

  const aoContinuar = (evento: FormEvent) => {
    evento.preventDefault()
    const normalizado = email.trim().toLowerCase()
    if (!EMAIL_VALIDO.test(normalizado)) {
      setErro(t("student:login.invalidEmail"))
      return
    }
    setErro("")
    entrarComEmail(normalizado)
  }

  const aoIniciarCadastro = () => {
    setErro("")
    setEtapa("cadastro")
  }

  const aoCriarConta = (evento: FormEvent) => {
    evento.preventDefault()
    if (!EMAIL_VALIDO.test(email.trim().toLowerCase())) {
      setErro(t("student:login.invalidEmail"))
      return
    }
    if (!nome.trim() || !sobrenome.trim() || !telefone.trim() || !dataNascimento) {
      setErro(t("student:login.required"))
      return
    }
    setErro("")
    const perfil = criarConta({
      nome: nome.trim(),
      sobrenome: sobrenome.trim(),
      email: email.trim().toLowerCase(),
      telefone: telefone.trim(),
      dataNascimento,
    })
    concluir(perfil)
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-titulo"
        data-lenis-prevent
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onFechar}
          aria-label={t("student:login.close")}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-[var(--sesi-muted)] transition hover:bg-[#F5F5F5] hover:text-[var(--sesi-black)]"
        >
          ✕
        </button>

        <div className="mb-5 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--sesi-red)] text-sm font-bold text-white">
            S
          </span>
          <span className="text-sm font-bold tracking-tight text-[var(--sesi-black)]">SESI Indústria</span>
        </div>

        {etapa === "email" ? (
          <>
            <h2 id="login-titulo" className="text-2xl font-bold text-[var(--sesi-black)]">
              {t("student:login.title")}
            </h2>
            <p className="mt-1 text-sm text-[var(--sesi-muted)]">{t("student:login.subtitle")}</p>

            <form onSubmit={aoContinuar} className="mt-6 flex flex-col gap-3" noValidate>
              <label htmlFor="login-email" className="text-sm font-semibold text-[var(--sesi-black)]">
                {t("student:login.email")}
              </label>
              <input
                id="login-email"
                type="email"
                autoFocus
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                placeholder={t("student:login.emailPlaceholder")}
                className={campo}
                aria-invalid={Boolean(erro)}
                aria-describedby={erro ? "login-erro" : undefined}
              />
              {erro && (
                <p id="login-erro" role="alert" className="text-sm font-medium text-[var(--sesi-red)]">
                  {erro}
                </p>
              )}
              <button type="submit" className={botaoPrimario}>
                {t("student:login.continue")}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-[var(--sesi-muted)]">
              {t("student:login.noAccount")}{" "}
              <button
                type="button"
                className="font-semibold text-[var(--sesi-red)] hover:underline"
                onClick={aoIniciarCadastro}
              >
                {t("student:login.createAccountLink")}
              </button>
            </p>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--sesi-gray)]" />
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--sesi-muted)]">
                {t("student:login.or")}
              </span>
              <span className="h-px flex-1 bg-[var(--sesi-gray)]" />
            </div>

            <div className="flex flex-col gap-2">
              <button type="button" className={botaoSocial} onClick={() => entrarComEmail("aluno.microsoft@exemplo.com")}>
                <span className="grid h-5 w-5 grid-cols-2 gap-0.5" aria-hidden="true">
                  <span className="bg-[#f25022]" />
                  <span className="bg-[#7fba00]" />
                  <span className="bg-[#00a4ef]" />
                  <span className="bg-[#ffb900]" />
                </span>
                {t("student:login.microsoft")}
              </button>
              <button type="button" className={botaoSocial} onClick={() => entrarComEmail("aluno.gmail@exemplo.com")}>
                <span aria-hidden="true" className="text-base font-bold text-[#4285f4]">
                  G
                </span>
                {t("student:login.google")}
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-1 border-t border-[var(--sesi-gray)] pt-4 text-sm">
              <button
                type="button"
                className="text-left font-semibold text-[var(--sesi-red)] hover:underline"
                onClick={() => entrarComEmail(EMAIL_TESTE)}
              >
                {t("student:login.testAccount")}
              </button>
              <button
                type="button"
                className="text-left text-[var(--sesi-muted)] hover:underline"
                onClick={() => entrarComEmail(EMAIL_ADMIN)}
              >
                {t("student:login.adminAccount")}
              </button>
              <button type="button" className="mt-2 text-left text-[var(--sesi-muted)] hover:underline" onClick={onFechar}>
                {t("student:login.keepBrowsing")}
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setEtapa("email")
                setErro("")
              }}
              className="mb-3 text-sm font-semibold text-[var(--sesi-muted)] hover:text-[var(--sesi-black)]"
            >
              ← {t("student:login.back")}
            </button>
            <h2 id="login-titulo" className="text-2xl font-bold text-[var(--sesi-black)]">
              {t("student:login.registerTitle")}
            </h2>
            <p className="mt-1 text-sm text-[var(--sesi-muted)]">{t("student:login.registerSubtitle")}</p>

            <form onSubmit={aoCriarConta} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cadastro-nome" className="text-sm font-semibold">
                  {t("student:login.name")}
                </label>
                <input id="cadastro-nome" value={nome} onChange={(e) => setNome(e.target.value)} className={campo} autoFocus required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cadastro-sobrenome" className="text-sm font-semibold">
                  {t("student:login.lastName")}
                </label>
                <input id="cadastro-sobrenome" value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} className={campo} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cadastro-nascimento" className="text-sm font-semibold">
                  {t("student:login.birthDate")}
                </label>
                <input id="cadastro-nascimento" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} className={campo} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cadastro-telefone" className="text-sm font-semibold">
                  {t("student:login.phone")}
                </label>
                <input id="cadastro-telefone" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-0000" className={campo} required />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="cadastro-email" className="text-sm font-semibold">
                  {t("student:login.email")}
                </label>
                <input
                  id="cadastro-email"
                  type="email"
                  value={email}
                  onChange={(evento) => setEmail(evento.target.value)}
                  className={campo}
                  required
                  aria-invalid={Boolean(erro)}
                />
              </div>

              {erro && (
                <p role="alert" className="text-sm font-medium text-[var(--sesi-red)] sm:col-span-2">
                  {erro}
                </p>
              )}

              <button type="submit" className={`${botaoPrimario} sm:col-span-2`}>
                {t("student:login.createAccount")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
