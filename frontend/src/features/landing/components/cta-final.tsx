import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"

export function CtaFinal() {
  return (
    <section className="bg-[var(--sesi-red)] py-16 text-white">
      <Container className="flex flex-col items-center gap-6 text-center">
        <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">Pronto para transformar sua carreira?</h2>
        <p className="max-w-2xl text-lg">Junte-se a milhares de profissionais que estão transformando a indústria através dos nossos cursos. Invista no seu futuro hoje mesmo!</p>
        <Button variant="secondary" className="border-white text-white hover:bg-white/10">Matricule-se</Button>
        <div className="flex flex-col gap-1 text-sm">
          <span>contato@sesindustria.com.br</span>
          <span>Av. Paulista, 1313</span>
        </div>
      </Container>
    </section>
  )
}
