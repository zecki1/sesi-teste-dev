import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock"

interface ConclusaoCurso {
  slug: string
  titulo: string
  aluno: string
  concluidoEm: string
}

export function StudentCertificateCelebration() {
  const [conclusao, setConclusao] = useState<ConclusaoCurso | null>(null)
  const fecharRef = useRef<HTMLButtonElement>(null)
  useBodyScrollLock(Boolean(conclusao))

  useEffect(() => {
    const aoConcluir = (evento: Event) => {
      const detalhe = (evento as CustomEvent<ConclusaoCurso>).detail
      if (detalhe?.slug && detalhe?.titulo) setConclusao(detalhe)
    }
    window.addEventListener("sesi:curso-concluido", aoConcluir)
    return () => window.removeEventListener("sesi:curso-concluido", aoConcluir)
  }, [])

  useEffect(() => {
    if (!conclusao) return
    const focoAnterior = document.activeElement as HTMLElement | null
    fecharRef.current?.focus()
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setConclusao(null)
    }
    document.addEventListener("keydown", aoTeclar)
    return () => {
      document.removeEventListener("keydown", aoTeclar)
      focoAnterior?.focus()
    }
  }, [conclusao])

  if (!conclusao) return null

  return (
    <div className="sesi-certificado-overlay fixed inset-0 z-[10002] grid place-items-center overflow-hidden bg-black/60 p-4" role="presentation">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 30 }, (_, indice) => (
          <span
            key={indice}
            className="sesi-confete absolute top-[-12px] h-3 w-2 rounded-sm"
            style={{
              left: `${(indice * 37) % 100}%`,
              backgroundColor: ["#d71920", "#fcd19c", "#1b1b1b", "#f4b400"][indice % 4],
              animationDelay: `${(indice % 10) * 0.12}s`,
            }}
          />
        ))}
      </div>
      <section role="dialog" aria-modal="true" aria-labelledby="certificado-titulo" data-lenis-prevent className="relative max-h-[min(92dvh,92vh)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl bg-white p-6 shadow-2xl sm:p-10">
        <div className="rounded-xl border-[6px] border-double border-[var(--sesi-red)] p-6 text-center sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--sesi-red)]">SESI Indústria</p>
          <h2 id="certificado-titulo" className="mt-4 text-3xl font-bold text-[var(--sesi-black)]">Curso concluído</h2>
          <p className="mt-6 text-sm text-[var(--sesi-muted)]">Certificamos que</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--sesi-black)]">{conclusao.aluno}</p>
          <p className="mt-4 text-sm text-[var(--sesi-muted)]">concluiu o curso</p>
          <p className="mt-2 text-xl font-bold text-[var(--sesi-black)]">{conclusao.titulo}</p>
          <p className="mt-6 text-sm text-[var(--sesi-muted)]">
            Conclusão em {new Date(conclusao.concluidoEm).toLocaleDateString("pt-BR")}
          </p>
          <p className="mt-8 border-t border-[var(--sesi-gray)] pt-4 text-xs text-[var(--sesi-muted)]">
            Comprovante demonstrativo de conclusão do curso.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => window.print()} className="rounded-lg bg-[var(--sesi-red)] px-4 py-2.5 text-sm font-semibold text-white">
            Imprimir comprovante
          </button>
          <Link to="/area-do-aluno" onClick={() => setConclusao(null)} className="rounded-lg border border-[var(--sesi-gray)] px-4 py-2.5 text-sm font-semibold">
            Ver meus cursos
          </Link>
          <button ref={fecharRef} type="button" onClick={() => setConclusao(null)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--sesi-muted)]">
            Fechar
          </button>
        </div>
      </section>
    </div>
  )
}
