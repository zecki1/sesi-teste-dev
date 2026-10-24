import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { CursoDetalheDto } from "@/lib/api/catalogo"
import { criarChamado } from "@/lib/api/gestao"
import { usePerfil } from "@/lib/auth/perfil"
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"

interface AjudaCursoProps {
  curso: CursoDetalheDto
}

/**
 * CTA "Fale com a gente" do curso. Abre um modal e registra a mensagem como
 * chamado (com URL da página, curso e usuário), disparando o e-mail via Resend.
 */
export function AjudaCurso({ curso }: AjudaCursoProps) {
  const { t } = useTranslation("course")
  const perfil = usePerfil()
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [protocolo, setProtocolo] = useState("")
  const [erro, setErro] = useState("")
  const campoMensagem = useRef<HTMLTextAreaElement | null>(null)
  const botaoFechar = useRef<HTMLButtonElement | null>(null)

  useBodyScrollLock(aberto)

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") fechar()
    }
    document.addEventListener("keydown", aoTeclar)
    campoMensagem.current?.focus()
    return () => document.removeEventListener("keydown", aoTeclar)
  }, [aberto])

  function abrir() {
    setNome(perfil ? `${perfil.nome} ${perfil.sobrenome}`.trim() : "")
    setEmail(perfil?.email ?? "")
    setMensagem("")
    setProtocolo("")
    setErro("")
    setAberto(true)
  }

  function fechar() {
    setAberto(false)
    setEnviando(false)
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    if (enviando) return

    if (mensagem.trim().length < 10) {
      setErro(t("helpDialog.minLength"))
      return
    }

    setEnviando(true)
    setErro("")
    try {
      const envio = await criarChamado({
        nome: nome.trim(),
        email: email.trim(),
        categoria: "Curso",
        descricao: mensagem.trim(),
        pagina: window.location.href,
        cursoSlug: curso.slug,
        usuarioId: perfil?.email ?? null,
      })
      setProtocolo(envio.chamado.protocolo)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : t("helpDialog.error"))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="bg-[var(--sesi-red-dark)] py-16 sm:py-20">
      <Container className="flex flex-col items-center gap-4 text-center" data-aos="fade-up">
        <p className="text-base font-semibold text-white">{t("helpEyebrow")}</p>
        <h2 className="mt-1 font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold text-white sm:text-4xl">
          {t("helpTitle")}
        </h2>
        <Button
          type="button"
          variant="secondary"
          className="mt-2 border-white text-white hover:bg-white/10"
          onClick={abrir}
        >
          {t("helpButton")}
        </Button>
      </Container>

      {aberto && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ajuda-curso-titulo"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) fechar()
          }}
        >
          <div className="w-full max-w-lg rounded-[var(--radius-lg)] bg-white p-6 text-left shadow-xl" data-modal-ajuda>
            <div className="flex items-start justify-between gap-4">
              <h3 id="ajuda-curso-titulo" className="font-['Open_Sans_Condensed',sans-serif] text-2xl font-bold text-[var(--sesi-black)]">
                {t("helpDialog.title")}
              </h3>
              <button
                ref={botaoFechar}
                type="button"
                onClick={fechar}
                aria-label={t("helpDialog.close")}
                className="rounded p-1 text-[var(--sesi-muted)] transition hover:bg-[var(--sesi-gray)] hover:text-[var(--sesi-black)]"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            <p className="mt-2 text-sm text-[var(--sesi-muted)]">{t("helpDialog.intro")}</p>
            <p className="mt-1 text-xs text-[var(--sesi-muted)]">
              {curso.nomeCompleto}
              {perfil ? ` · ${t("helpDialog.loginHint")}` : ""}
            </p>

            {protocolo ? (
              <div className="mt-5 rounded-[var(--radius-lg)] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900" role="status">
                <p className="font-semibold">{t("helpDialog.successTitle")}</p>
                <p className="mt-1">{t("helpDialog.success", { protocolo })}</p>
                <Button type="button" variant="primary" className="mt-4" onClick={fechar}>
                  {t("helpDialog.close")}
                </Button>
              </div>
            ) : (
              <form className="mt-4 flex flex-col gap-3" onSubmit={enviar}>
                <label className="flex flex-col gap-1 text-sm font-semibold text-[var(--sesi-black)]">
                  {t("helpDialog.name")}
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={nome}
                    onChange={(evento) => setNome(evento.target.value)}
                    className="rounded-lg border border-[var(--sesi-gray)] px-3 py-2 font-normal outline-none focus:border-[var(--sesi-red)]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-semibold text-[var(--sesi-black)]">
                  {t("helpDialog.email")}
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(evento) => setEmail(evento.target.value)}
                    className="rounded-lg border border-[var(--sesi-gray)] px-3 py-2 font-normal outline-none focus:border-[var(--sesi-red)]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-semibold text-[var(--sesi-black)]">
                  {t("helpDialog.message")}
                  <textarea
                    ref={campoMensagem}
                    required
                    minLength={10}
                    maxLength={4000}
                    rows={4}
                    value={mensagem}
                    onChange={(evento) => setMensagem(evento.target.value)}
                    placeholder={t("helpDialog.messagePlaceholder")}
                    className="rounded-lg border border-[var(--sesi-gray)] px-3 py-2 font-normal outline-none focus:border-[var(--sesi-red)]"
                  />
                </label>

                {erro && <p role="alert" className="text-sm text-[var(--sesi-red)]">{erro}</p>}

                <div className="mt-1 flex items-center justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={fechar}>
                    {t("helpDialog.cancel")}
                  </Button>
                  <Button type="submit" variant="primary" disabled={enviando}>
                    {enviando ? t("helpDialog.sending") : t("helpDialog.send")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
