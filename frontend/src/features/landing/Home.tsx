import { Link } from "react-router-dom"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { MainLayout } from "@/components/layout/main-layout"
import { CookieBanner } from "@/components/cookie-banner"
import { Hero } from "./components/hero"
import { Impact } from "./components/impact"
import { Differentials } from "./components/differentials"
import { Testimonials } from "./components/testimonials"
import { CtaFinal } from "./components/cta-final"
import { useCursos } from "@/hooks/use-catalogo"

export function Home() {
  const { data } = useCursos({ tamanho: 6 })

  return (
    <MainLayout>
      <Hero />
      <section id="cursos" className="py-16">
        <Container className="flex flex-col gap-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">Principais cursos</h2>
            <select className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] px-4 py-2">
              <option>Todos os cursos</option>
            </select>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.itens || []).slice(0, 6).map((curso) => (
              <Link key={curso.slug} to={`/curso/${curso.slug}`} className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] shadow-[var(--shadow-card)] transition-shadow hover:shadow-md">
                <div className="h-48 bg-[linear-gradient(135deg,var(--sesi-red)_0%,#7f1d1d_100%)]" />
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <span className="w-fit rounded-[var(--radius-pill)] bg-[var(--sesi-beige)] px-3 py-1 text-sm">{curso.categoria.nome}</span>
                  <h3 className="text-xl font-semibold">{curso.nomeCompleto}</h3>
                  <p className="line-clamp-3 text-[var(--sesi-muted)]">{curso.descricao}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="flex justify-center">
            <Link to="/catalogo">
              <Button variant="primary">Ver todos os cursos</Button>
            </Link>
          </div>
        </Container>
      </section>
      <Impact />
      <Differentials />
      <Testimonials />
      <CtaFinal />
      <CookieBanner />
    </MainLayout>
  )
}
