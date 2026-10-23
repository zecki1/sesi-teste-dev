import { Link } from "react-router-dom"
import { Container } from "@/components/layout/container"

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center bg-[var(--sesi-white)] pt-[72px]">
      <Container className="flex flex-col items-start gap-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--sesi-red)]">Erro 404</p>
        <h1 className="font-['Open_Sans_Condensed',sans-serif] text-4xl font-bold sm:text-5xl">
          Página não encontrada
        </h1>
        <p className="max-w-xl text-lg text-[var(--sesi-black)]">
          O endereço que você tentou acessar não existe ou foi movido. Volte para o início ou explore o
          catálogo de cursos.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/"
            className="rounded-lg bg-[var(--sesi-red)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--sesi-red-dark)]"
          >
            Ir para o início
          </Link>
          <Link
            to="/catalogo"
            className="rounded-lg border border-[var(--sesi-black)] px-6 py-3 font-semibold text-[var(--sesi-black)] transition-colors hover:bg-[var(--sesi-black)] hover:text-white"
          >
            Ver catálogo
          </Link>
        </div>
      </Container>
    </div>
  )
}
