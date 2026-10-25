import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { criarAvaliacao } from "@/lib/api/catalogo"
import { usePerfil } from "@/lib/auth/perfil"
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock"
import { Button } from "@/components/ui/button"

interface AvaliacaoCursoModalProps {
  curso: { slug: string; nomeCompleto: string }
  aberto: boolean
  onFechar: () => void
  onConcluido?: () => void
}

interface SeletorNotaProps {
  id: string
  pergunta: string
  valor: number
  onChange: (valor: number) => void
}

/** Cinco estrelas acessíveis: radios nativos com as estrelas como rótulo visual. */
function SeletorNota({ id, pergunta, valor, onChange }: SeletorNotaProps) {
  const { t } = useTranslation("course")

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-semibold text-[var(--sesi-black)]">{pergunta}</legend>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((nota) => (
          <label key={nota} className="cursor-pointer rounded p-0.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--sesi-red)]">
            <input
              type="radio"
              name={id}
              value={nota}
              checked={valor === nota}
              onChange={() => onChange(nota)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`text-2xl leading-none transition-colors ${
                nota <= valor ? "text-[var(--sesi-red)]" : "text-[var(--sesi-gray)]"
              }`}
            >
              ★
            </span>
            <span className="sr-only">{t("review.starOption", { valor: nota })}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/**
 * Modal de avaliação do curso: nota geral, depoimento e pesquisa de satisfação
 * com cinco perguntas. Envia apenas para o usuário logado.
 */
export function AvaliacaoCursoModal({ curso, aberto, onFechar, onConcluido }: AvaliacaoCursoModalProps) {
  const { t } = useTranslation("course")
  const perfil = usePerfil()
  const queryClient = useQueryClient()
  const [nota, setNota] = useState(0)
  const [depoimento, setDepoimento] = useState("")
  const [notaPlataforma, setNotaPlataforma] = useState(0)
  const [notaCurso, setNotaCurso] = useState(0)
  const [notaAvaliacao, setNotaAvaliacao] = useState(0)
  const [notaAcessibilidade, setNotaAcessibilidade] = useState(0)
  const [sugestao, setSugestao] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState("")

  useBodyScrollLock(aberto)

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") fechar()
    }
    document.addEventListener("keydown", aoTeclar)
    return () => document.removeEventListener("keydown", aoTeclar)
  }, [aberto, onFechar])

  function fechar() {
    const eraEnviado = enviado
    setEnviado(false)
    setEnviando(false)
    if (eraEnviado) onConcluido?.()
    onFechar()
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    if (enviando || !perfil) return

    const notas = [nota, notaPlataforma, notaCurso, notaAvaliacao, notaAcessibilidade]
    if (notas.some((valor) => valor < 1 || valor > 5)) {
      setErro(t("review.required"))
      return
    }
    if (depoimento.trim().length < 10) {
      setErro(t("review.testimonialMin"))
      return
    }

    setEnviando(true)
    setErro("")
    try {
      await criarAvaliacao({
        cursoSlug: curso.slug,
        usuarioId: perfil.email,
        nome: `${perfil.nome} ${perfil.sobrenome}`.trim(),
        nota,
        depoimento: depoimento.trim(),
        notaPlataforma,
        notaCurso,
        notaAvaliacao,
        notaAcessibilidade,
        sugestao: sugestao.trim(),
      })
      setEnviado(true)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["avaliacoes"] }),
        queryClient.invalidateQueries({ queryKey: ["curso", curso.slug] }),
      ])
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : t("review.error"))
    } finally {
      setEnviando(false)
    }
  }

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avaliacao-curso-titulo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) fechar()
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[var(--radius-lg)] bg-white p-6 text-left shadow-xl"
        data-modal-avaliacao
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3
              id="avaliacao-curso-titulo"
              className="font-['Open_Sans_Condensed',sans-serif] text-2xl font-bold text-[var(--sesi-black)]"
            >
              {t("review.title")}
            </h3>
            <p className="mt-1 text-sm text-[var(--sesi-muted)]">{curso.nomeCompleto}</p>
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label={t("review.close")}
            className="shrink-0 rounded p-1 text-[var(--sesi-muted)] transition hover:bg-[var(--sesi-gray)] hover:text-[var(--sesi-black)]"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {!perfil ? (
          <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-[var(--sesi-beige)] px-4 py-4 text-sm text-[var(--sesi-black)]">
            <p className="font-semibold">{t("review.loginRequired")}</p>
            <p className="mt-1 text-[var(--sesi-muted)]">{t("review.loginHint")}</p>
            <Link to="/area-do-aluno" className="mt-3 inline-block">
              <Button type="button" variant="primary">
                {t("review.login")}
              </Button>
            </Link>
          </div>
        ) : enviado ? (
          <div
            className="mt-5 rounded-[var(--radius-lg)] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900"
            role="status"
          >
            <p className="font-semibold">{t("review.successTitle")}</p>
            <p className="mt-1">{t("review.success")}</p>
            <Button type="button" variant="primary" className="mt-4" onClick={fechar}>
              {t("review.done")}
            </Button>
          </div>
        ) : (
          <form className="mt-4 flex flex-col gap-4" onSubmit={enviar}>
            <p className="text-sm text-[var(--sesi-muted)]">{t("review.intro")}</p>

            <SeletorNota
              id="avaliacao-nota"
              pergunta={t("review.gradeLabel")}
              valor={nota}
              onChange={setNota}
            />

            <label className="flex flex-col gap-1 text-sm font-semibold text-[var(--sesi-black)]">
              {t("review.testimonialLabel")}
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={3}
                value={depoimento}
                onChange={(evento) => setDepoimento(evento.target.value)}
                placeholder={t("review.testimonialPlaceholder")}
                className="rounded-lg border border-[var(--sesi-gray)] px-3 py-2 font-normal outline-none focus:border-[var(--sesi-red)]"
              />
            </label>

            <fieldset className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] p-4">
              <legend className="px-1 text-sm font-semibold text-[var(--sesi-black)]">
                {t("review.surveyTitle")}
              </legend>
              <p className="-mt-1 text-xs text-[var(--sesi-muted)]">{t("review.surveyIntro")}</p>
              <SeletorNota
                id="avaliacao-plataforma"
                pergunta={t("review.platform")}
                valor={notaPlataforma}
                onChange={setNotaPlataforma}
              />
              <SeletorNota
                id="avaliacao-conteudo"
                pergunta={t("review.courseContent")}
                valor={notaCurso}
                onChange={setNotaCurso}
              />
              <SeletorNota
                id="avaliacao-avaliacao"
                pergunta={t("review.courseAssessment")}
                valor={notaAvaliacao}
                onChange={setNotaAvaliacao}
              />
              <SeletorNota
                id="avaliacao-acessibilidade"
                pergunta={t("review.accessibility")}
                valor={notaAcessibilidade}
                onChange={setNotaAcessibilidade}
              />
            </fieldset>

            <label className="flex flex-col gap-1 text-sm font-semibold text-[var(--sesi-black)]">
              {t("review.missing")}
              <textarea
                maxLength={2000}
                rows={3}
                value={sugestao}
                onChange={(evento) => setSugestao(evento.target.value)}
                placeholder={t("review.missingPlaceholder")}
                className="rounded-lg border border-[var(--sesi-gray)] px-3 py-2 font-normal outline-none focus:border-[var(--sesi-red)]"
              />
            </label>

            {erro && (
              <p role="alert" className="text-sm text-[var(--sesi-red)]">
                {erro}
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={fechar}>
                {t("review.cancel")}
              </Button>
              <Button type="submit" variant="primary" disabled={enviando}>
                {enviando ? t("review.sending") : t("review.submit")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
