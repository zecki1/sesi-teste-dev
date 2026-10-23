import { Container } from "@/components/layout/container"
import { ArrowLeft, ArrowRight } from "@/components/ui/arrow-icons"
import { useSliderArrastavel } from "@/hooks/use-slider-arrastavel"

export const TESTIMONIALS = [
  { name: "Lucas Pereira", role: "Analista na Empresa X", text: "A experiência do curso foi incrível! As aulas foram muito bem estruturadas e o cronograma foi cuidadosamente planejado, facilitando muito o aprendizado." },
  { name: "Mariana Costa", role: "Gestora na Empresa X", text: "Concluir o curso foi uma jornada enriquecedora. As aulas eram dinâmicas e o horário foi organizado para maximizar nosso tempo de estudo." },
  { name: "Thiago Almeida", role: "Técnico na Empresa X", text: "O curso superou minhas expectativas! As aulas foram bem elaboradas e o planejamento do horário ajudou a manter o foco e a produtividade." },
  { name: "Fernanda Silva", role: "Analista na Empresa X", text: "Finalizar o curso foi uma experiência motivadora. As aulas foram muito bem preparadas e o cronograma foi ideal para o aprendizado." },
  { name: "Gabriel Santos", role: "Analista na Empresa X", text: "A conclusão do curso foi uma etapa muito gratificante. As aulas eram bem organizadas e o horário foi pensado para facilitar nosso aprendizado." },
]

export function Stars({ className }: { className?: string }) {
  return (
    <div className={className ? `flex items-center gap-1 ${className}` : "flex items-center gap-1"} role="img" aria-label="Avaliação: 5 de 5 estrelas">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M5.68737 16.1347L6.83966 11.3061L3.01758 8.05779L8.03029 7.62196L9.99987 3.06592L11.9695 7.64279L16.9822 8.05779L13.1601 11.3061L14.3124 16.1347L9.99987 13.5738L5.68737 16.1347Z"
            fill="currentColor"
          />
        </svg>
      ))}
    </div>
  )
}

export function Testimonials() {
  const { ref: trackRef, arrastando } = useSliderArrastavel<HTMLDivElement>()

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector<HTMLElement>("[data-card]")
    const step = card ? card.offsetWidth + 24 : track.clientWidth
    track.scrollBy({ left: direction * step, behavior: "smooth" })
  }

  return (
    <section className="bg-[var(--sesi-red-dark)] py-16 text-white sm:py-20">
      <Container>
        <div data-aos="fade-up">
          <p className="text-base font-semibold uppercase tracking-wide text-white">Depoimentos</p>
          <h2 className="mt-1 font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl lg:text-5xl">
            Quem fez recomendações
          </h2>
        </div>
      </Container>

      <div
        ref={trackRef}
        tabIndex={0}
        data-aos="fade-up"
        role="region"
        aria-label="Depoimentos de alunos"
        data-arrastando={arrastando}
        className="slider-bleed mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TESTIMONIALS.map((item) => (
          <article
            key={item.name}
            data-card
            className="slider-card flex shrink-0 snap-start flex-col gap-6 rounded-[var(--radius-lg)] bg-[var(--sesi-red)] p-8 text-white"
          >
            <p className="text-lg leading-relaxed">“{item.text}”</p>
            <div className="mt-auto flex flex-col gap-2">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-white/80">{item.role}</p>
              </div>
              <Stars className="text-white" />
            </div>
          </article>
        ))}
      </div>

      <Container className="mt-10 flex flex-col gap-10">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label="Depoimentos anteriores"
            className="text-white transition-opacity hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ArrowLeft />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label="Próximos depoimentos"
            className="text-white transition-opacity hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ArrowRight />
          </button>
        </div>

        <hr className="border-t border-white" />
      </Container>
    </section>
  )
}
