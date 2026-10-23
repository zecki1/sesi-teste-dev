import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"

export function AjudaCurso() {
  return (
    <section className="bg-[var(--sesi-red-dark)] py-16 sm:py-20">
      <Container className="flex flex-col items-center gap-4 text-center" data-aos="fade-up">
        <p className="text-base font-semibold text-white">
          Precisa de ajuda para decidir?
        </p>
        <h2 className="mt-1 font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl lg:text-5xl text-white">Fale com a gente</h2>
        <a href="mailto:contato@sesindustria.com.br" className="mt-2">
          <Button withArrow className="rounded-lg  bg-white text-dark">
            Mandar uma mensagem
          </Button>
        </a>
      </Container>
    </section>
  )
}
