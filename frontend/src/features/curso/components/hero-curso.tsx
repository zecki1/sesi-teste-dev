import type { CursoDetalheDto } from "@/lib/api/catalogo"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { IconeCategoria, estiloBadgeCategoria } from "@/lib/ui/icones-categoria"
import { VideoCurso } from "./video-curso"

function formatarData(data?: string) {
  if (!data) return null
  const [ano, mes, dia] = data.split("-")
  return `${dia}/${mes}/${ano}`
}

export function HeroCurso({ curso, onMatricular }: { curso: CursoDetalheDto; onMatricular: () => void }) {
  const inicio = formatarData(curso.dataDisponibilizacao)

  return (
    <section className="py-12 sm:py-16">
      <Container className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <div data-aos="fade-up" className="flex flex-col gap-6 lg:col-span-6">
          <span
            style={estiloBadgeCategoria(curso.categoria.cor)}
            className="flex w-fit items-center gap-2 rounded px-4 py-2 text-sm font-semibold uppercase tracking-wide"
          >
            <IconeCategoria slug={curso.categoria.slug} className="h-5 w-5 shrink-0" />
            {curso.categoria.nome}
          </span>

          <h1 className="font-['Open_Sans_Condensed',sans-serif] text-4xl font-bold leading-[1.05] sm:text-5xl">
            {curso.nomeCompleto}
          </h1>

          <ul className="flex flex-col gap-3 text-[var(--sesi-muted)]">
            {inicio && (
              <li className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                  <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span>
                  Início do curso: <strong className="text-[var(--sesi-black)]">{inicio}</strong>
                </span>
              </li>
            )}
            <li className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                <path
                  d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>
                Certificação: <strong className="text-[var(--sesi-black)]">SESI</strong>
              </span>
            </li>
          </ul>

          <div data-cta-principal className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={onMatricular} withArrow className="rounded-lg">
              Matricule-se
            </Button>
          </div>
        </div>

        <div data-aos="fade-up" data-aos-delay="120" className="lg:col-span-6">
          <VideoCurso titulo={curso.nomeBreve} />
        </div>
      </Container>
    </section>
  )
}
