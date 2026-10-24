import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { Stars, useDepoimentos } from "@/features/landing/components/testimonials"
import { ArrowLeft, ArrowRight } from "@/components/ui/arrow-icons"
import { useAvaliacoes } from "@/hooks/use-catalogo"
import { useSliderArrastavel } from "@/hooks/use-slider-arrastavel"
import type { CursoDetalheDto } from "@/lib/api/catalogo"
import { AvaliacaoCursoModal } from "./avaliacao-curso-modal"

interface DepoimentosCursoProps {
  curso: CursoDetalheDto
}

/**
 * Depoimentos do curso: mostra as avaliações reais enviadas pelos alunos e,
 * quando ainda não há nenhuma, mantém os depoimentos ilustrativos da landing.
 */
export function DepoimentosCurso({ curso }: DepoimentosCursoProps) {
  const { t, i18n } = useTranslation("landing")
  const { t: tCurso } = useTranslation("course")
  const { data } = useAvaliacoes(curso.slug, 20)
  const estaticos = useDepoimentos()
  const [modalAberto, setModalAberto] = useState(false)
  const { ref: trackRef, arrastando } = useSliderArrastavel<HTMLDivElement>()

  const reais = (data ?? [])
    .filter((avaliacao) => avaliacao.depoimento.trim().length > 0)
    .map((avaliacao) => ({
      chave: `avaliacao-${avaliacao.id}`,
      name: avaliacao.nome,
      role: tCurso("review.studentRole"),
      text: avaliacao.depoimento,
      nota: avaliacao.nota as number | undefined,
    }))

  const usandoReais = reais.length > 0
  const itens = usandoReais
    ? reais
    : estaticos.map((item) => ({ ...item, chave: item.name, nota: undefined as number | undefined }))

  const resumo = curso.avaliacao
  const mediaFormatada = resumo
    ? new Intl.NumberFormat(i18n.language, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(resumo.media)
    : ""

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
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between" data-aos="fade-up">
          <div>
            <p className="text-base font-semibold text-[var(--sesi-black)]/70">{t("testimonialsEyebrow")}</p>
            <h2 className="mt-1 font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl lg:text-5xl">
              {t("testimonialsTitle")}
            </h2>
            {resumo && resumo.total > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Stars className="text-[var(--sesi-black)]" nota={Math.round(resumo.media)} />
                <p className="text-sm text-[var(--sesi-black)]/70">
                  {tCurso("review.average", { media: mediaFormatada, count: resumo.total })}
                </p>
              </div>
            )}
          </div>
          <Button type="button" variant="secondary" onClick={() => setModalAberto(true)}>
            {tCurso("review.reviewButton")}
          </Button>
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
            className="slider-card flex shrink-0 snap-start flex-col gap-6 rounded-[var(--radius-lg)] bg-white p-8 text-[var(--sesi-black)]"
          >
            <p className="text-lg leading-relaxed">“{item.text}”</p>
            <div className="mt-auto flex flex-col gap-2">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-[var(--sesi-black)]/70">{item.role}</p>
              </div>
              <Stars className="text-[var(--sesi-black)]" nota={item.nota} />
            </div>
          </article>
        ))}
      </div>

      <Container className="mt-10 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          aria-label={t("testimonialsPrevious")}
          className="text-[var(--sesi-black)] transition-opacity hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sesi-black)]"
        >
          <ArrowLeft />
        </button>
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          aria-label={t("testimonialsNext")}
          className="text-[var(--sesi-black)] transition-opacity hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sesi-black)]"
        >
          <ArrowRight />
        </button>
      </Container>

      <AvaliacaoCursoModal
        curso={curso}
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
      />
    </section>
  )
}
