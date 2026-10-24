import { Container } from "@/components/layout/container"
import { Stars, TESTIMONIALS } from "@/features/landing/components/testimonials"
import { ArrowLeft, ArrowRight } from "@/components/ui/arrow-icons"
import { useSliderArrastavel } from "@/hooks/use-slider-arrastavel"

/** Mesmos depoimentos da landing, com o fundo amarelo e cards brancos no detalhe do curso. */
export function DepoimentosCurso() {
  const { ref: trackRef, arrastando } = useSliderArrastavel<HTMLDivElement>()

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector<HTMLElement>("[data-card]")
    const step = card ? card.offsetWidth + 24 : track.clientWidth
    track.scrollBy({ left: direction * step, behavior: "smooth" })
  }

  return (
    <section className="bg-[var(--sesi-beige)] py-16 text-[var(--sesi-black)] sm:py-20">
      <Container>
        <div data-aos="fade-up">
          <p className="text-base font-semibold text-[var(--sesi-black)]/70">Depoimentos</p>
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
              className="slider-card flex shrink-0 snap-start flex-col gap-6 rounded-[var(--radius-lg)] bg-white p-8 text-[var(--sesi-black)]"
            >
              <p className="text-lg leading-relaxed">“{item.text}”</p>
              <div className="mt-auto flex flex-col gap-2">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-[var(--sesi-black)]/70">{item.role}</p>
                </div>
                <Stars className="text-[var(--sesi-black)]" />
              </div>
            </article>
          ))}
      </div>

      <Container className="mt-10 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          aria-label="Depoimentos anteriores"
          className="text-[var(--sesi-black)] transition-opacity hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sesi-black)]"
        >
          <ArrowLeft />
        </button>
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          aria-label="Próximos depoimentos"
          className="text-[var(--sesi-black)] transition-opacity hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sesi-black)]"
        >
          <ArrowRight />
        </button>
      </Container>
    </section>
  )
}
