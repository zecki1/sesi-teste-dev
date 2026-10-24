import { useTranslation } from "react-i18next"
import { Container } from "@/components/layout/container"
import { ArrowLeft, ArrowRight } from "@/components/ui/arrow-icons"
import { useSliderArrastavel } from "@/hooks/use-slider-arrastavel"
import { useAvaliacoes } from "@/hooks/use-catalogo"

export interface Depoimento {
  name: string
  role: string
  text: string
}

/** Depoimentos localizados, usados como fallback quando ainda não há avaliações reais. */
export function useDepoimentos(): Depoimento[] {
  const { t } = useTranslation("landing")
  return t("testimonialsItems", { returnObjects: true }) as Depoimento[]
}

interface DepoimentoExibido extends Depoimento {
  chave: string
  nota?: number
}

/** Depoimentos reais de todos os cursos; cai para os textos estáticos quando não há nenhum. */
export function useDepoimentosReais(): { itens: DepoimentoExibido[]; usandoReais: boolean } {
  const { t } = useTranslation("landing")
  const { data } = useAvaliacoes(undefined, 12)
  const estaticos = useDepoimentos()

  const reais = (data ?? [])
    .filter((avaliacao) => avaliacao.depoimento.trim().length > 0)
    .map<DepoimentoExibido>((avaliacao) => ({
      chave: `avaliacao-${avaliacao.id}`,
      name: avaliacao.nome,
      role: avaliacao.cursoNome,
      text: avaliacao.depoimento,
      nota: avaliacao.nota,
    }))

  if (reais.length > 0) return { itens: reais, usandoReais: true }

  return {
    itens: estaticos.map((item) => ({ ...item, chave: item.name, role: item.role || t("testimonialsCourseLabel") })),
    usandoReais: false,
  }
}

export function Stars({ className, nota }: { className?: string; nota?: number }) {
  const { t } = useTranslation("landing")
  const valor = typeof nota === "number" ? Math.max(0, Math.min(5, nota)) : null
  const rotulo =
    valor === null ? t("testimonialsRating") : t("testimonialsRatingValue", { valor })

  return (
    <div className={className ? `flex items-center gap-1 ${className}` : "flex items-center gap-1"} role="img" aria-label={rotulo}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className={valor !== null && i >= valor ? "opacity-30" : undefined}
        >
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
  const { t } = useTranslation("landing")
  const { itens, usandoReais } = useDepoimentosReais()
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
          <p className="text-base font-semibold uppercase tracking-wide text-white">{t("testimonialsEyebrow")}</p>
          <h2 className="mt-1 font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl lg:text-5xl">
            {t("testimonialsTitle")}
          </h2>
          {usandoReais && <p className="mt-2 text-white/80">{t("testimonialsRealHint")}</p>}
        </div>
      </Container>

      <div
        ref={trackRef}
        tabIndex={0}
        data-aos="fade-up"
        role="region"
        aria-label={t("testimonialsRegion")}
        data-arrastando={arrastando}
        className="slider-bleed mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {itens.map((item) => (
          <article
            key={item.chave}
            data-card
            className="slider-card flex shrink-0 snap-start flex-col gap-6 rounded-[var(--radius-lg)] bg-[var(--sesi-red)] p-8 text-white"
          >
            <p className="text-lg leading-relaxed">“{item.text}”</p>
            <div className="mt-auto flex flex-col gap-2">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-white/80">{item.role}</p>
              </div>
              <Stars className="text-white" nota={item.nota} />
            </div>
          </article>
        ))}
      </div>

      <Container className="mt-10 flex flex-col gap-10">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label={t("testimonialsPrevious")}
            className="text-white transition-opacity hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ArrowLeft />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label={t("testimonialsNext")}
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
