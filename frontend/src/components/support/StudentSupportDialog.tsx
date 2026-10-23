import { FormEvent, useEffect, useRef, useState } from "react"
import {
  FaBook,
  FaCertificate,
  FaCommentDots,
  FaFileAlt,
  FaLock,
  FaSpinner,
  FaTimes,
} from "react-icons/fa"
import { usePerfil } from "@/lib/auth/perfil"
import { criarChamado, type EnvioChamado } from "@/lib/api/gestao"
import { capturarPaginaAtual } from "@/lib/ui/capturar-pagina"
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock"

const categorias = [
  { nome: "Acesso", Icone: FaLock },
  { nome: "Curso", Icone: FaBook },
  { nome: "Conteúdo", Icone: FaFileAlt },
  { nome: "Certificado", Icone: FaCertificate },
  { nome: "Outro", Icone: FaCommentDots },
] as const
const campo =
  "w-full rounded-lg border border-[#D9D9D9] bg-white px-3 py-2.5 text-sm text-[var(--sesi-black)] outline-none transition-colors placeholder:text-[#8A8A8A] focus:border-[var(--sesi-red)] focus:ring-2 focus:ring-[var(--sesi-red)]/15"

export function StudentSupportDialog() {
  const perfil = usePerfil()
  const [aberto, setAberto] = useState(false)
  const [categoria, setCategoria] = useState<(typeof categorias)[number]["nome"]>("Acesso")
  const [descricao, setDescricao] = useState("")
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [incluirCaptura, setIncluirCaptura] = useState(true)
  const [capturando, setCapturando] = useState(false)
  const [captura, setCaptura] = useState<string | null>(null)
  const [erro, setErro] = useState("")
  const [resultado, setResultado] = useState<EnvioChamado | null>(null)
  const nomeRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  useBodyScrollLock(aberto)

  useEffect(() => {
    const abrir = () => {
      setErro("")
      setResultado(null)
      setCaptura(null)
      setIncluirCaptura(true)
      setNome(perfil ? `${perfil.nome} ${perfil.sobrenome}`.trim() : "")
      setEmail(perfil?.email ?? "")
      setAberto(true)
    }
    window.addEventListener("sesi:abrir-ajuda", abrir)
    return () => window.removeEventListener("sesi:abrir-ajuda", abrir)
  }, [perfil])

  useEffect(() => {
    if (!aberto) return
    const focoAnterior = document.activeElement as HTMLElement | null
    nomeRef.current?.focus()
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberto(false)
      if (evento.key !== "Tab") return
      const focaveis = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
        ) ?? [],
      ).filter((item) => item.offsetParent !== null)
      if (focaveis.length === 0) return
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener("keydown", aoTeclar)
    return () => {
      document.removeEventListener("keydown", aoTeclar)
      focoAnterior?.focus()
    }
  }, [aberto])

  if (!aberto) return null

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    setErro("")
    setEnviando(true)
    let falhaNaCaptura = false
    try {
      let capturaTela = captura
      if (incluirCaptura && !capturaTela) {
        setCapturando(true)
        try {
          capturaTela = await capturarPaginaAtual()
        } catch (falha) {
          falhaNaCaptura = true
          throw falha
        }
        setCaptura(capturaTela)
      }
      const envio = await criarChamado({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        categoria,
        descricao: descricao.trim(),
        pagina: window.location.href,
        capturaTela: incluirCaptura ? capturaTela : null,
      })
      setResultado(envio)
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falhaNaCaptura
            ? `Não foi possível capturar a tela: ${falha.message}`
            : falha.message
          : falhaNaCaptura
            ? "Não foi possível capturar a tela."
            : "Não foi possível registrar o chamado.",
      )
    } finally {
      setCapturando(false)
      setEnviando(false)
    }
  }

  return (
    <div data-support-ui className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAberto(false)} aria-label="Fechar ajuda" />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="suporte-titulo"
        data-lenis-prevent
        className="relative max-h-[min(92dvh,92vh)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-xl border border-[#E5E5E5] bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#E5E5E5] p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sesi-red)]">Ajuda ao aluno</p>
            <h2 id="suporte-titulo" className="mt-1 text-xl font-bold text-[var(--sesi-black)] sm:text-2xl">
              {resultado ? "Chamado registrado" : "Como podemos ajudar?"}
            </h2>
            {!resultado && (
              <p className="mt-1.5 max-w-md text-sm leading-5 text-[var(--sesi-muted)]">
                Descreva o problema. Enviaremos o protocolo à equipe e uma confirmação ao e-mail informado.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAberto(false)}
            aria-label="Fechar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--sesi-muted)] transition-colors hover:bg-[#F5F5F5] hover:text-[var(--sesi-black)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sesi-red)]"
          >
            <FaTimes aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>
        {resultado ? (
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <span aria-hidden="true" className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-green-100 text-green-700">✓</span>
              <p className="text-sm leading-6 text-green-950">
                Protocolo <strong>{resultado.chamado.protocolo}</strong>. Sua solicitação foi salva para a equipe de suporte.
              </p>
            </div>
            {resultado.erro && (
              <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                {resultado.erro} Confira se a chave e o remetente do Resend estão configurados; o chamado permanece salvo.
              </p>
            )}
            <div className="flex justify-end">
              <button type="button" onClick={() => setAberto(false)} className="rounded-lg bg-[var(--sesi-black)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#292929] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sesi-red)]">
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[var(--sesi-black)]">
                Nome
                <input ref={nomeRef} required maxLength={120} value={nome} onChange={(evento) => setNome(evento.target.value)} className={`${campo} mt-1.5 font-normal`} autoComplete="name" />
              </label>
              <label className="block text-sm font-medium text-[var(--sesi-black)]">
                E-mail
                <input required type="email" maxLength={254} value={email} onChange={(evento) => setEmail(evento.target.value)} className={`${campo} mt-1.5 font-normal`} autoComplete="email" />
              </label>
            </div>
            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-[var(--sesi-black)]">Assunto</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categorias.map(({ nome: opcao, Icone }) => (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => setCategoria(opcao)}
                    aria-pressed={categoria === opcao}
                    className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sesi-red)] ${
                      categoria === opcao
                        ? "border-[var(--sesi-red)] bg-[var(--sesi-red)]/5 text-[var(--sesi-red)]"
                        : "border-[#D9D9D9] text-[var(--sesi-muted)] hover:bg-[#F7F7F7] hover:text-[var(--sesi-black)]"
                    }`}
                  >
                    <Icone aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    {opcao}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm font-medium text-[var(--sesi-black)]">
              Descrição
              <textarea required minLength={10} maxLength={4000} rows={5} value={descricao} onChange={(evento) => setDescricao(evento.target.value)} className={`${campo} mt-1.5 min-h-32 resize-y font-normal`} placeholder="Conte o que aconteceu e o que você esperava que acontecesse." />
              <span className="mt-1 flex justify-end text-xs text-[var(--sesi-muted)]" aria-live="polite">{descricao.length}/4000</span>
            </label>
            <div className="rounded-lg border border-[#E5E5E5] p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-start gap-2 text-sm text-[var(--sesi-black)]">
                  <input
                    type="checkbox"
                    checked={incluirCaptura}
                    onChange={(evento) => {
                      setIncluirCaptura(evento.target.checked)
                      if (!evento.target.checked) setCaptura(null)
                    }}
                    className="mt-0.5 h-4 w-4 accent-[var(--sesi-red)]"
                  />
                  <span>
                    Incluir captura da tela
                    <span className="mt-0.5 block text-xs font-normal text-[var(--sesi-muted)]">
                      A imagem será anexada ao chamado e enviada à equipe de suporte.
                    </span>
                  </span>
                </label>
                {incluirCaptura && (
                  <button
                    type="button"
                    disabled={capturando || enviando}
                    onClick={async () => {
                      setErro("")
                      setCapturando(true)
                      try {
                        setCaptura(await capturarPaginaAtual())
                      } catch (falha) {
                        setErro(falha instanceof Error ? `Não foi possível capturar a tela: ${falha.message}` : "Não foi possível capturar a tela.")
                      } finally {
                        setCapturando(false)
                      }
                    }}
                    className="rounded-lg border border-[#D9D9D9] px-3 py-2 text-xs font-semibold text-[var(--sesi-black)] transition hover:bg-[#F7F7F7] disabled:opacity-60"
                  >
                    {capturando ? "Capturando..." : captura ? "Capturar novamente" : "Pré-visualizar"}
                  </button>
                )}
              </div>
              {captura && incluirCaptura && (
                <img src={captura} alt="Pré-visualização da captura que será anexada ao chamado" className="mt-3 max-h-48 w-full rounded-md border border-[#E5E5E5] object-contain object-top" />
              )}
            </div>
            {erro && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800">{erro}</p>}
            <div className="flex justify-end border-t border-[#E5E5E5] pt-4">
              <button type="submit" disabled={enviando || capturando || descricao.trim().length < 10} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--sesi-red)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sesi-red)] disabled:cursor-not-allowed disabled:opacity-60">
                {(enviando || capturando) && <FaSpinner aria-hidden="true" className="h-4 w-4 animate-spin" />}
                {capturando ? "Capturando tela..." : enviando ? "Enviando chamado..." : "Enviar chamado"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
