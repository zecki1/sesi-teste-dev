import { FormEvent, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  EMAIL_ADMIN,
  EMAIL_TESTE,
  atualizarPerfil,
  criarConta,
  entrar,
  papelDeGestao,
  salvarPerfil,
  type PerfilAluno,
  type Papel,
} from "@/lib/auth/perfil"
import { idiomaAtual } from "@/lib/i18n/idioma"
import {
  autenticarAdministrador,
  autenticarAlunoGestao,
  obterUsuarioGestaoPorEmail,
  registrarAlunoComSenhaGestao,
  registrarAlunoGestao,
  type UsuarioGestao,
} from "@/lib/api/gestao"
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock"

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

const IconeOlho = ({ visivel }: { visivel: boolean }) =>
  visivel ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )

export function LoginModal({ aberto, onFechar, onEntrou }: LoginModalProps) {
  const { t } = useTranslation(["student", "common"])
  const [etapa, setEtapa] = useState<"email" | "cadastro">("email")
  const [email, setEmail] = useState("")
  const [nome, setNome] = useState("")
  const [sobrenome, setSobrenome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [senha, setSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [mostrarSenhaLogin, setMostrarSenhaLogin] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
  useBodyScrollLock(aberto)

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onFechar()
    }
    document.addEventListener("keydown", aoTeclar)

    return () => {
      document.removeEventListener("keydown", aoTeclar)
    }
  }, [aberto, onFechar])

  useEffect(() => {
    if (!aberto) {
      setEtapa("email")
      setErro("")
      setSenha("")
      setConfirmarSenha("")
      setMostrarSenhaLogin(false)
      setMostrarSenha(false)
      setMostrarConfirmarSenha(false)
      setCopiado(false)
    }
  }, [aberto])

  if (!aberto) return null

  const calcularForcaSenha = (valor: string) => {
    if (!valor) return { score: 0, label: "", cor: "bg-gray-200", texto: "text-gray-400" }
    let pontos = 0
    if (valor.length >= 8) pontos++
    if (valor.length >= 12) pontos++
    if (/[a-z]/.test(valor) && /[A-Z]/.test(valor)) pontos++
    if (/\d/.test(valor)) pontos++
    if (/[^a-zA-Z0-9]/.test(valor)) pontos++

    if (pontos <= 1) return { score: 1, label: "Fraca", cor: "bg-red-500", texto: "text-red-600" }
    if (pontos <= 2) return { score: 2, label: "Regular", cor: "bg-orange-500", texto: "text-orange-600" }
    if (pontos <= 4) return { score: 3, label: "Forte", cor: "bg-amber-500", texto: "text-amber-600" }
    return { score: 4, label: "Excelente", cor: "bg-emerald-500", texto: "text-emerald-600" }
  }

  const forca = calcularForcaSenha(senha)

  const gerarSenhaForte = () => {
    const maiusc = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    const minusc = "abcdefghijkmnopqrstuvwxyz"
    const nums = "23456789"
    const simbolos = "!@#$%&*+?"
    const todos = maiusc + minusc + nums + simbolos
    const chars = [
      maiusc[Math.floor(Math.random() * maiusc.length)],
      minusc[Math.floor(Math.random() * minusc.length)],
      nums[Math.floor(Math.random() * nums.length)],
      simbolos[Math.floor(Math.random() * simbolos.length)],
    ]
    for (let i = chars.length; i < 14; i++) {
      chars.push(todos[Math.floor(Math.random() * todos.length)])
    }
    const novaSenha = chars.sort(() => Math.random() - 0.5).join("")
    setSenha(novaSenha)
    setConfirmarSenha(novaSenha)
    setMostrarSenha(true)
    setMostrarConfirmarSenha(true)
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(novaSenha)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    }
  }

  const concluir = (perfil: PerfilAluno) => {
    atualizarPerfil({ idioma: idiomaAtual() })
    onEntrou(perfil)
  }

  const aoEntrarComoAlunoDemo = () => {
    setCarregando(false)
    setErro("")
    setEmail(EMAIL_TESTE)
    setSenha("")
    concluir(entrar(EMAIL_TESTE, "aluno"))
  }

  const aoEntrarComoAdminDemo = async () => {
    setCarregando(true)
    setErro("")
    setEmail(EMAIL_ADMIN)
    setSenha("")
    try {
      const registrado = await autenticarAdministrador(EMAIL_ADMIN, "Admin@SESI2026!").catch(() => null)
      const papel: Papel = registrado?.papel ? papelDeGestao(registrado.papel) : "admin"
      const perfil = entrar(EMAIL_ADMIN, papel)
      if (registrado?.nome) {
        const [nomeAdmin, ...sobrenomeAdmin] = registrado.nome.trim().split(/\s+/)
        const perfilAtualizado = {
          ...perfil,
          nome: nomeAdmin || perfil.nome,
          sobrenome: sobrenomeAdmin.join(" "),
        }
        salvarPerfil(perfilAtualizado)
        concluir(perfilAtualizado)
      } else {
        concluir(perfil)
      }
    } catch {
      concluir(entrar(EMAIL_ADMIN, "admin"))
    } finally {
      setCarregando(false)
    }
  }

  const entrarComEmail = async (valor: string) => {
    if (carregando) return
    setCarregando(true)
    setErro("")
    try {
      const normalizado = valor.trim().toLowerCase()
      // Conta demo sem senha entra imediatamente
      if (normalizado === EMAIL_TESTE) {
        concluir(entrar(normalizado, "aluno"))
        return
      }

      // Conta de administrador
      if (normalizado === EMAIL_ADMIN) {
        const senhaAdminFinal = senha || "Admin@SESI2026!"
        const registrado = await autenticarAdministrador(normalizado, senhaAdminFinal).catch(() => null)
        const papel: Papel = registrado?.papel ? papelDeGestao(registrado.papel) : "admin"
        const perfil = entrar(normalizado, papel)
        if (registrado?.nome) {
          const [nomeAdmin, ...sobrenomeAdmin] = registrado.nome.trim().split(/\s+/)
          const nomeCompleto = registrado.nome.trim()
          const perfilAtualizado = nomeCompleto
            ? { ...perfil, nome: nomeAdmin || perfil.nome, sobrenome: sobrenomeAdmin.join(" ") }
            : perfil
          salvarPerfil(perfilAtualizado)
          concluir(perfilAtualizado)
        } else {
          concluir(perfil)
        }
        return
      }

      // Autenticação de aluno (funciona tanto local quanto na API de produção no Render)
      let usuarioGestao: UsuarioGestao | null = null
      if (senha) {
        usuarioGestao = await autenticarAlunoGestao(normalizado, senha).catch(() => null)
        if (!usuarioGestao) {
          usuarioGestao = await autenticarAdministrador(normalizado, senha).catch(() => null)
        }
      } else if (normalizado === EMAIL_TESTE) {
        usuarioGestao = (await obterUsuarioGestaoPorEmail(normalizado).catch(() => null)) ??
          await registrarAlunoGestao(normalizado.split("@")[0], normalizado).catch(() => null)
      }

      if (!usuarioGestao) {
        if (!senha) {
          setErro("Informe sua senha para continuar.")
        } else {
          setErro("E-mail ou senha incorretos. Se ainda não possui conta, use Criar conta.")
        }
        return
      }

      if (!usuarioGestao.ativo) {
        setErro("Esta conta está inativa. Entre em contato com o suporte.")
        return
      }

      const perfil = entrar(normalizado, papelDeGestao(usuarioGestao.papel))
      const [nomeUsuario, ...sobrenomeUsuario] = usuarioGestao.nome.trim().split(/\s+/)
      const nomeCompleto = usuarioGestao.nome.trim()
      const perfilAtualizado = nomeCompleto
        ? { ...perfil, nome: nomeUsuario || perfil.nome, sobrenome: sobrenomeUsuario.join(" ") }
        : perfil
      salvarPerfil(perfilAtualizado)
      concluir(perfilAtualizado)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível validar sua conta na API.")
    } finally {
      setCarregando(false)
    }
  }

  const aoContinuar = (evento: FormEvent) => {
    evento.preventDefault()
    const normalizado = email.trim().toLowerCase()
    if (!EMAIL_VALIDO.test(normalizado)) {
      setErro(t("student:login.invalidEmail"))
      return
    }
    setErro("")
    const senhaObrigatoria = normalizado !== EMAIL_TESTE
    if (senhaObrigatoria && !senha) {
      setErro("Informe sua senha para continuar.")
      return
    }
    void entrarComEmail(normalizado)
  }

  const aoIniciarCadastro = () => {
    setErro("")
    setSenha("")
    setConfirmarSenha("")
    setMostrarSenha(false)
    setMostrarConfirmarSenha(false)
    setEtapa("cadastro")
  }

  const aoCriarConta = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!EMAIL_VALIDO.test(email.trim().toLowerCase())) {
      setErro(t("student:login.invalidEmail"))
      return
    }
    if (!nome.trim() || !sobrenome.trim() || !telefone.trim() || !dataNascimento) {
      setErro(t("student:login.required"))
      return
    }
    if (senha.length < 8 || senha.length > 128) {
      setErro("A senha deve ter entre 8 e 128 caracteres.")
      return
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não conferem.")
      return
    }
    if (email.trim().toLowerCase() === EMAIL_ADMIN || email.trim().toLowerCase() === EMAIL_TESTE) {
      setErro("As contas de demonstração entram sem senha e não precisam de cadastro.")
      return
    }
    setErro("")
    setCarregando(true)
    try {
      const usuario = await registrarAlunoComSenhaGestao(
        `${nome.trim()} ${sobrenome.trim()}`,
        email.trim().toLowerCase(),
        senha,
      )
      if (!usuario.ativo) {
        setErro("Esta conta está inativa. Entre em contato com o suporte.")
        return
      }
      const papel: Papel = papelDeGestao(usuario.papel)
      const perfil = criarConta({
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        email: email.trim().toLowerCase(),
        telefone: telefone.trim(),
        dataNascimento,
      }, papel)
      concluir(perfil)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível registrar sua conta na API.")
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-titulo"
        data-lenis-prevent
        className="relative max-h-[min(92dvh,92vh)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
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
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                placeholder={t("student:login.emailPlaceholder")}
                className={campo}
                aria-invalid={Boolean(erro)}
                aria-describedby={erro ? "login-erro" : undefined}
              />
              <label htmlFor="login-senha" className="mt-1 text-sm font-semibold text-[var(--sesi-black)]">
                Senha
                <span className="font-normal text-[var(--sesi-muted)]">
                  {" (obrigatória para contas cadastradas e gestão)"}
                </span>
              </label>
              <div className="relative">
                <input
                  id="login-senha"
                  type={mostrarSenhaLogin ? "text" : "password"}
                  autoComplete="current-password"
                  value={senha}
                  onChange={(evento) => setSenha(evento.target.value)}
                  placeholder="Sua senha"
                  className={`${campo} pr-10`}
                  aria-invalid={Boolean(erro)}
                  aria-describedby={erro ? "login-erro" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenhaLogin((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--sesi-muted)] hover:text-[var(--sesi-black)] p-1 rounded transition"
                  aria-label={mostrarSenhaLogin ? "Ocultar senha" : "Ver senha"}
                >
                  <IconeOlho visivel={mostrarSenhaLogin} />
                </button>
              </div>
              {erro && (
                <p id="login-erro" role="alert" className="text-sm font-medium text-[var(--sesi-red)]">
                  {erro}
                </p>
              )}
              <button type="submit" disabled={carregando} className={botaoPrimario}>
                {carregando ? "Consultando..." : t("student:login.continue")}
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
              <button type="button" disabled={carregando} className={botaoSocial} onClick={() => setErro("O login com Microsoft ainda não está configurado.")}>
                <span className="grid h-5 w-5 grid-cols-2 gap-0.5" aria-hidden="true">
                  <span className="bg-[#f25022]" />
                  <span className="bg-[#7fba00]" />
                  <span className="bg-[#00a4ef]" />
                  <span className="bg-[#ffb900]" />
                </span>
                {t("student:login.microsoft")}
              </button>
              <button type="button" disabled={carregando} className={botaoSocial} onClick={() => setErro("O login com Google ainda não está configurado.")}>
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
                onClick={aoEntrarComoAlunoDemo}
              >
                {t("student:login.testAccount")}
              </button>
              <button
                type="button"
                className="text-left text-[var(--sesi-muted)] hover:underline"
                onClick={() => void aoEntrarComoAdminDemo()}
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

              {/* Senha e confirmação empilhadas verticalmente (ambas sm:col-span-2) */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="cadastro-senha" className="text-sm font-semibold text-[var(--sesi-black)]">
                    Senha (mínimo 8 caracteres)
                  </label>
                  <button
                    type="button"
                    onClick={gerarSenhaForte}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sesi-red)] hover:text-[var(--sesi-red-dark)] transition"
                    title="Gera uma senha forte e preenche automaticamente"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
                      <path d="m21 2-9.6 9.6" />
                      <circle cx="7.5" cy="15.5" r="5.5" />
                    </svg>
                    {copiado ? "Copiada para a área de transferência!" : "Gerar senha forte"}
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="cadastro-senha"
                    type={mostrarSenha ? "text" : "password"}
                    autoComplete="new-password"
                    value={senha}
                    onChange={(evento) => setSenha(evento.target.value)}
                    className={`${campo} pr-10`}
                    required
                    minLength={8}
                    maxLength={128}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--sesi-muted)] hover:text-[var(--sesi-black)] p-1 rounded transition"
                    aria-label={mostrarSenha ? "Ocultar senha" : "Ver senha"}
                  >
                    <IconeOlho visivel={mostrarSenha} />
                  </button>
                </div>
                {senha && (
                  <div className="mt-1 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--sesi-muted)]">Força da senha:</span>
                      <span className={`font-semibold ${forca.texto}`}>{forca.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${forca.score >= 1 ? forca.cor : "bg-transparent"}`} />
                      <div className={`h-full rounded-full transition-all duration-300 ${forca.score >= 2 ? forca.cor : "bg-transparent"}`} />
                      <div className={`h-full rounded-full transition-all duration-300 ${forca.score >= 3 ? forca.cor : "bg-transparent"}`} />
                      <div className={`h-full rounded-full transition-all duration-300 ${forca.score >= 4 ? forca.cor : "bg-transparent"}`} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="cadastro-confirmar-senha" className="text-sm font-semibold text-[var(--sesi-black)]">
                  Confirmar senha
                </label>
                <div className="relative">
                  <input
                    id="cadastro-confirmar-senha"
                    type={mostrarConfirmarSenha ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmarSenha}
                    onChange={(evento) => setConfirmarSenha(evento.target.value)}
                    className={`${campo} pr-10`}
                    required
                    minLength={8}
                    maxLength={128}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmarSenha((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--sesi-muted)] hover:text-[var(--sesi-black)] p-1 rounded transition"
                    aria-label={mostrarConfirmarSenha ? "Ocultar senha" : "Ver senha"}
                  >
                    <IconeOlho visivel={mostrarConfirmarSenha} />
                  </button>
                </div>
                {confirmarSenha && senha !== confirmarSenha && (
                  <p className="text-xs font-medium text-[var(--sesi-red)]">As senhas não conferem.</p>
                )}
              </div>

              {erro && (
                <p role="alert" className="text-sm font-medium text-[var(--sesi-red)] sm:col-span-2">
                  {erro}
                </p>
              )}

              <button type="submit" disabled={carregando} className={`${botaoPrimario} sm:col-span-2`}>
                {carregando ? "Criando conta..." : t("student:login.createAccount")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
