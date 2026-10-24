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
  const [copiado, setCopiado] = useState(false)
  const fecharRef = useRef<HTMLButtonElement>(null)
  useBodyScrollLock(Boolean(conclusao))

  useEffect(() => {
    const aoConcluir = (evento: Event) => {
      const detalhe = (evento as CustomEvent<ConclusaoCurso>).detail
      if (detalhe?.slug && detalhe?.titulo) {
        setConclusao(detalhe)
        setCopiado(false)
      }
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

  const dataFormatada = new Date(conclusao.concluidoEm).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  const codigoCertificado = `SESI-${Math.abs(conclusao.slug.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)).toString(16).toUpperCase().padStart(4, "0")}-${new Date(conclusao.concluidoEm).getFullYear()}`

  const compartilharConquista = async () => {
    const texto = `🏆 Acabei de concluir o curso "${conclusao.titulo}" no SESI Indústria! Muito feliz com essa conquista e com meu aprendizado!`
    const url = "https://frontend-ezequiel-reginos-projects.vercel.app"

    if (navigator?.share) {
      try {
        await navigator.share({
          title: `Certificado SESI - ${conclusao.titulo}`,
          text: texto,
          url,
        })
        return
      } catch {
        // Fallback para cópia
      }
    }

    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${texto}\n${url}`)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 3000)
    }
  }

  // Gera 60 confetes festivos com distribuição homogênea
  const confetes = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: `${(i * 1.68) % 100}%`,
    cor: ["#d42731", "#980e08", "#fcd19c", "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"][i % 7],
    delay: `${(i % 15) * 0.1}s`,
    duracao: `${2.2 + (i % 5) * 0.3}s`,
    largura: `${6 + (i % 6)}px`,
    altura: `${12 + (i % 8)}px`,
  }))

  return (
    <div className="sesi-certificado-overlay fixed inset-0 z-[10002] grid place-items-center overflow-hidden bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300" role="presentation">
      {/* Chuva de confetes animados */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {confetes.map((c) => (
          <span
            key={c.id}
            className="sesi-confete absolute top-[-20px] rounded-sm shadow-sm"
            style={{
              left: c.left,
              width: c.largura,
              height: c.altura,
              backgroundColor: c.cor,
              animationDuration: c.duracao,
              animationDelay: c.delay,
            }}
          />
        ))}
      </div>

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="certificado-titulo"
        data-lenis-prevent
        className="relative max-h-[min(94dvh,94vh)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      >
        {/* Cabeçalho de Parabéns */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
            </svg>
          </div>
          <span className="inline-block rounded-full bg-red-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--sesi-red)]">
            100% Concluído
          </span>
          <h2 id="certificado-titulo" className="mt-2 text-2xl font-black text-[var(--sesi-black)] sm:text-3xl">
            Parabéns pelo seu empenho e dedicação! 🎉
          </h2>
          <p className="mt-2 text-sm text-[var(--sesi-muted)] max-w-lg mx-auto">
            Reconhecemos com imenso orgulho todo o seu esforço durante as aulas. Você completou com êxito todas as etapas do curso!
          </p>
        </div>

        {/* Molde do Certificado Oficial */}
        <div className="mt-6 rounded-xl border-[5px] border-double border-[var(--sesi-red)] bg-gradient-to-b from-white via-amber-50/20 to-white p-6 text-center shadow-md sm:p-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-0.5 w-8 bg-[var(--sesi-red)]" />
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--sesi-red)]">
              SESI Indústria · Certificado de Conclusão
            </p>
            <span className="h-0.5 w-8 bg-[var(--sesi-red)]" />
          </div>

          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-[var(--sesi-muted)]">
            Certificamos com honra que
          </p>
          <p className="mt-1 text-2xl font-black tracking-tight text-[var(--sesi-black)] sm:text-3xl">
            {conclusao.aluno}
          </p>

          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-[var(--sesi-muted)]">
            concluiu com êxito e aproveitamento integral o curso
          </p>
          <p className="mt-1 text-xl font-extrabold text-[var(--sesi-red)] sm:text-2xl">
            {conclusao.titulo}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--sesi-muted)] border-t border-[var(--sesi-gray)] pt-4">
            <span>📅 <strong>Data de Conclusão:</strong> {dataFormatada}</span>
            <span>🔑 <strong>Autenticidade:</strong> <code className="font-mono font-bold text-[var(--sesi-black)]">{codigoCertificado}</code></span>
          </div>
          <p className="mt-2 text-[11px] text-[var(--sesi-muted)]">
            Documento digital com validação institucional SESI Educação Profissional.
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[var(--sesi-red-dark)] transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect width="12" height="8" x="6" y="14" />
            </svg>
            Imprimir / Salvar PDF
          </button>

          <button
            type="button"
            onClick={() => void compartilharConquista()}
            className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--sesi-black)] hover:bg-gray-50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
              <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
            </svg>
            {copiado ? "Copiado para o Clipboard! 🎉" : "Compartilhar Conquista"}
          </button>

          <Link
            to="/area-do-aluno"
            onClick={() => setConclusao(null)}
            className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--sesi-black)] hover:bg-gray-50 transition"
          >
            Ver meus cursos
          </Link>

          <button
            ref={fecharRef}
            type="button"
            onClick={() => setConclusao(null)}
            className="rounded-[var(--radius-lg)] px-4 py-2.5 text-sm font-semibold text-[var(--sesi-muted)] hover:text-[var(--sesi-black)] transition"
          >
            Fechar
          </button>
        </div>
      </section>
    </div>
  )
}
