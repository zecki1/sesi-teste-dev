import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import type { CursoDetalheDto, TurmaDto } from "@/lib/api/catalogo"
import { criarMatricula } from "@/lib/api/catalogo"
import { useTurmas } from "@/hooks/use-catalogo"
import { usePerfil } from "@/lib/auth/perfil"
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock"

interface MatriculaModalProps {
  curso: CursoDetalheDto
  aberto: boolean
  onFechar: () => void
}

function formatarData(data: string | undefined, idioma: string) {
  if (!data) return "—"
  const valor = new Date(`${data}T00:00:00`)
  if (Number.isNaN(valor.getTime())) return data
  return valor.toLocaleDateString(idioma, { day: "2-digit", month: "2-digit", year: "numeric" })
}

function horario(valor: string) {
  return valor.slice(0, 5)
}

export function MatriculaModal({ curso, aberto, onFechar }: MatriculaModalProps) {
  const { t, i18n } = useTranslation(["course", "common"])
  const perfil = usePerfil()
  const queryClient = useQueryClient()
  const { data: turmas, isLoading } = useTurmas(curso.slug, aberto)
  const [selecionada, setSelecionada] = useState<number | null>(null)
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const fecharRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const sucessoRef = useRef<HTMLAnchorElement>(null)
  const onFecharRef = useRef(onFechar)
  useBodyScrollLock(aberto)

  useEffect(() => {
    if (sucesso) sucessoRef.current?.focus()
  }, [sucesso])

  useEffect(() => {
    onFecharRef.current = onFechar
  }, [onFechar])

  useEffect(() => {
    if (!aberto) return
    const focoAnterior = document.activeElement as HTMLElement | null
    setSelecionada(null)
    setErro("")
    setSucesso(false)
    fecharRef.current?.focus()

    const focaveis = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((elemento) => elemento.offsetParent !== null)

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault()
        onFecharRef.current()
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
    return () => {
      document.removeEventListener("keydown", aoTeclar)
      focoAnterior?.focus()
    }
  }, [aberto])

  if (!aberto) return null

  const turmaSelecionada: TurmaDto | undefined = turmas?.find((turma) => turma.id === selecionada)

  const confirmar = async () => {
    if (!perfil) {
      setErro(t("course:enrollModal.loginRequired"))
      return
    }
    if (!turmaSelecionada) {
      setErro(t("course:enrollModal.select"))
      return
    }

    setErro("")
    setEnviando(true)
    try {
      await criarMatricula({
        cursoSlug: curso.slug,
        turmaId: turmaSelecionada.id,
        usuarioId: perfil.email,
      })
      await queryClient.invalidateQueries({ queryKey: ["matriculas", perfil.email] })
      setSucesso(true)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : t("course:enrollModal.error"))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="matricula-titulo"
        data-lenis-prevent
        className="relative max-h-[min(92dvh,92vh)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <button
          ref={fecharRef}
          type="button"
          onClick={onFechar}
          aria-label={t("course:enrollModal.close")}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-[var(--sesi-muted)] transition hover:bg-[#F5F5F5] hover:text-[var(--sesi-black)]"
        >
          ✕
        </button>

        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sesi-red)]">SESI Indústria</p>
        <h2 id="matricula-titulo" className="mt-1 text-2xl font-bold text-[var(--sesi-black)]">
          {t("course:enrollModal.title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--sesi-muted)]">{curso.nomeCompleto}</p>

        {sucesso ? (
          <div className="mt-6 flex flex-col gap-4">
            <div role="status" className="rounded-[var(--radius-lg)] border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              <p className="font-semibold">{t("course:enrollModal.success")}</p>
              <p className="mt-1">{t("course:enrollModal.successHint")}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                ref={sucessoRef}
                to="/area-do-aluno"
                onClick={onFechar}
                className="rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)]"
              >
                {t("course:enrollModal.viewCalendar")}
              </Link>
              <button
                type="button"
                onClick={onFechar}
                className="rounded-[var(--radius-lg)] border border-[var(--sesi-black)] px-5 py-2.5 text-sm font-semibold text-[var(--sesi-black)] transition hover:bg-[var(--sesi-black)] hover:text-white"
              >
                {t("course:enrollModal.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <section className="mt-5 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-[#F5F5F5] p-4">
              <h3 className="text-sm font-bold text-[var(--sesi-black)]">{t("course:enrollModal.summary")}</h3>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--sesi-muted)]">{t("course:enrollModal.modality")}</dt>
                  <dd className="font-semibold text-[var(--sesi-black)]">{curso.modalidade.nome}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--sesi-muted)]">{t("course:enrollModal.workload")}</dt>
                  <dd className="font-semibold text-[var(--sesi-black)]">{curso.cargaHoraria}h</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--sesi-muted)]">{t("course:enrollModal.status")}</dt>
                  <dd className="font-semibold text-[var(--sesi-black)]">{curso.status.nome}</dd>
                </div>
              </dl>
            </section>

            <section className="mt-6" aria-labelledby="turmas-disponiveis">
              <h3 id="turmas-disponiveis" className="text-sm font-bold text-[var(--sesi-black)]">
                {t("course:enrollModal.classes")}
              </h3>

              {isLoading && <p className="mt-3 text-sm text-[var(--sesi-muted)]">{t("course:enrollModal.loading")}</p>}

              {!isLoading && (!turmas || turmas.length === 0) && (
                <p className="mt-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--sesi-gray)] p-4 text-sm text-[var(--sesi-muted)]">
                  {t("course:enrollModal.noClasses")}
                </p>
              )}

              {!isLoading && turmas && turmas.length > 0 && (
                <fieldset className="mt-3 flex flex-col gap-3">
                  <legend className="sr-only">{t("course:enrollModal.select")}</legend>
                  {turmas.map((turma) => {
                    const vagas = Math.max(turma.vagas - turma.inscritos, 0)
                    return (
                      <label
                        key={turma.id}
                        className={`flex cursor-pointer gap-3 rounded-[var(--radius-lg)] border p-4 transition ${
                          selecionada === turma.id
                            ? "border-[var(--sesi-red)] bg-[var(--sesi-red)]/5 ring-1 ring-[var(--sesi-red)]"
                            : "border-[var(--sesi-gray)] bg-white hover:border-[var(--sesi-red)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="turma"
                          value={turma.id}
                          checked={selecionada === turma.id}
                          onChange={() => setSelecionada(turma.id)}
                          className="mt-1 h-4 w-4 shrink-0 accent-[var(--sesi-red)]"
                        />
                        <span className="flex flex-1 flex-col gap-2 text-sm">
                          <span className="flex flex-wrap items-center gap-2">
                            <strong className="text-[var(--sesi-black)]">{turma.modalidade.nome}</strong>
                            <span className="rounded-full bg-[var(--sesi-beige)] px-2 py-0.5 text-xs font-semibold text-[var(--sesi-black)]">
                              {vagas} {t("course:enrollModal.vacancies")}
                            </span>
                          </span>
                          <span className="grid gap-1 text-[var(--sesi-muted)] sm:grid-cols-3">
                            <span>
                              {t("course:enrollModal.date")}: <strong className="text-[var(--sesi-black)]">{formatarData(turma.dataInicio, i18n.language)}</strong>
                            </span>
                            <span>
                              {t("course:enrollModal.days")}: <strong className="text-[var(--sesi-black)]">{turma.diasSemana}</strong>
                            </span>
                            <span>
                              {t("course:enrollModal.time")}:{" "}
                              <strong className="text-[var(--sesi-black)]">
                                {horario(turma.horarioInicio)}–{horario(turma.horarioFim)}
                              </strong>
                            </span>
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </fieldset>
              )}
            </section>

            {erro && (
              <div role="alert" className="mt-4 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                <p>{erro}</p>
                {!perfil && (
                  <Link to="/area-do-aluno" onClick={onFechar} className="mt-2 inline-block font-semibold underline">
                    {t("course:enrollModal.login")}
                  </Link>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={onFechar}
                className="rounded-[var(--radius-lg)] border border-[var(--sesi-black)] px-5 py-2.5 text-sm font-semibold text-[var(--sesi-black)] transition hover:bg-[var(--sesi-black)] hover:text-white"
              >
                {t("course:enrollModal.cancel")}
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={enviando || !turmaSelecionada}
                className="rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("course:enrollModal.confirm")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
