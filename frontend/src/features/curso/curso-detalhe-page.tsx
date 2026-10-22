import { useParams, Link } from "react-router-dom"
import { MainLayout } from "@/components/layout/main-layout"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { useCurso } from "@/hooks/use-catalogo"
import videoThumb from "@/assets/video-thumb.png"

export function CursoDetalhePage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: curso, isLoading, isError } = useCurso(slug || "")

  if (isLoading) return <MainLayout><Container className="py-10">Carregando...</Container></MainLayout>
  if (isError || !curso) return <MainLayout><Container className="py-10"><p>Curso não encontrado.</p><Link to="/catalogo"><Button variant="primary" className="mt-4">Voltar ao catálogo</Button></Link></Container></MainLayout>

  return (
    <MainLayout>
      <section className="py-10">
        <Container className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-fit rounded-[var(--radius-pill)] bg-[var(--sesi-beige)] px-3 py-1 text-sm uppercase">{curso.categoria.nome}</span>
              <span className="w-fit rounded-[var(--radius-pill)] border border-[var(--sesi-gray)] px-3 py-1 text-sm">{curso.modalidade.nome}</span>
              <span className="w-fit rounded-[var(--radius-pill)] border border-[var(--sesi-gray)] px-3 py-1 text-sm">{curso.status.nome}</span>
            </div>
            <h1 className="font-['Open_Sans_Condensed',sans-serif] text-4xl font-bold sm:text-5xl">{curso.nomeCompleto}</h1>
            <div className="flex flex-wrap items-center gap-4 text-[var(--sesi-muted)]">
              <span>Nome breve: {curso.nomeBreve}</span>
              {curso.dataDisponibilizacao && <span>Data de disponibilização: {curso.dataDisponibilizacao}</span>}
              <span>Certificação: SESI</span>
              <span>Carga horária: {curso.cargaHoraria}h</span>
              <span>Modalidade: {curso.modalidade.nome}</span>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">Descrição</h2>
              <p className="max-w-4xl text-lg text-[var(--sesi-muted)]">{curso.descricao}</p>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">Público-alvo</h2>
              <p className="max-w-4xl text-[var(--sesi-muted)]">{curso.publicoAlvo}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" withArrow>Matricule-se</Button>
              <Link to="/area-do-aluno">
                <Button variant="secondary">Acessar AVA</Button>
              </Link>
              <Link to="/catalogo">
                <Button variant="ghost">Voltar ao catálogo</Button>
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[var(--radius-lg)]">
            <img src={videoThumb} alt="Aula introdutória" className="h-full w-full object-cover" />
            <button aria-label="Reproduzir vídeo" className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--sesi-red)] text-white shadow-lg">▶</button>
          </div>

          <section className="flex flex-col gap-6">
            <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold">Conteúdo do curso</h2>
            <div className="flex flex-col gap-4">
              {curso.modulos.map((modulo) => (
                <details key={modulo.id} className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)]" open={modulo.ordem === 1}>
                  <summary className="cursor-pointer px-6 py-4 text-lg font-semibold">Módulo {modulo.ordem} - {modulo.titulo}</summary>
                  <div className="flex flex-col divide-y divide-[var(--sesi-gray)] border-t border-[var(--sesi-gray)]">
                    {modulo.aulas.map((aula) => (
                      <div key={aula.id} className="flex items-center justify-between px-6 py-3">
                        <div>
                          <p className="font-medium">{aula.ordem}. {aula.titulo}</p>
                          <p className="text-sm text-[var(--sesi-muted)]">{aula.duracaoMinutos} min</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </Container>
      </section>
    </MainLayout>
  )
}
