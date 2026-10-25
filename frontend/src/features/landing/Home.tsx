import { useLayoutEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Container } from "@/components/layout/container"
import { MainLayout } from "@/components/layout/main-layout"
import { CookieBanner } from "@/components/cookie-banner"
import { Hero } from "./components/hero"
import { Impact } from "./components/impact"
import { Testimonials } from "./components/testimonials"
import { CtaFinal } from "./components/cta-final"
import { Button } from "@/components/ui/button"
import { useCursos } from "@/hooks/use-catalogo"
import { ArrowLeft, ArrowRight } from "@/components/ui/arrow-icons"
import { IconeCategoria, estiloBadgeCategoria } from "@/lib/ui/icones-categoria"
import { imagemDoCurso, srcSetDoCurso } from "@/lib/ui/imagens-cursos"
import { useSliderArrastavel } from "@/hooks/use-slider-arrastavel"

export function Home() {
  const { t } = useTranslation("landing")
  const { data, isLoading } = useCursos({ destaque: "true", tamanho: 12 })
  const [categoria, setCategoria] = useState("")

  const cursos = (data?.itens ?? []).filter((curso) => !categoria || curso.categoria.slug === categoria)

  // Só as categorias que têm cursos em destaque aparecem no filtro da landing.
  const categorias = Array.from(
    new Map((data?.itens ?? []).map((curso) => [curso.categoria.slug, curso.categoria])).values(),
  )

  const { ref: trackRef, arrastando } = useSliderArrastavel<HTMLDivElement>()

  // A cada troca de filtro (e quando os cursos chegam da API) volta ao primeiro card.
  // useLayoutEffect evita o "pulo" causado pela inserção dos cards antes do card final.
  useLayoutEffect(() => {
    trackRef.current?.scrollTo({ left: 0 })
  }, [categoria, data])

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector<HTMLElement>("[data-card]")
    const step = card ? card.offsetWidth + 24 : track.clientWidth
    track.scrollBy({ left: direction * step, behavior: "smooth" })
  }

  return (
    <MainLayout>
      <Hero />
      <section id="cursos" className="scroll-mt-[88px] py-16">
        <Container>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 data-aos="fade-up" className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">{t("mainCourses")}</h2>
            <select
              aria-label={t("filterByCategory")}
              value={categoria}
              onChange={(evento) => setCategoria(evento.target.value)}
              className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] px-4 py-2"
            >
              <option value="">{t("allCourses")}</option>
              {categorias.map((item) => (
                <option key={item.slug} value={item.slug}>{item.nome}</option>
              ))}
            </select>
          </div>
        </Container>
        <div
          ref={trackRef}
          tabIndex={0}
          data-aos="fade-up"
          role="region"
          aria-label={t("mainCourses")}
          data-arrastando={arrastando}
          className="slider-bleed mt-5 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 pt-3 [overflow-anchor:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
            {isLoading &&
              Array.from({ length: 4 }, (_, indice) => (
                <div
                  key={`curso-skeleton-${indice}`}
                  aria-hidden="true"
                  className="slider-card relative flex aspect-[4/5] shrink-0 animate-pulse snap-start flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] bg-[#F1F1F1] p-6"
                >
                  <span className="h-7 w-28 rounded-full bg-[#E2E2E2]" />
                  <div className="flex flex-col gap-3">
                    <span className="h-7 w-full rounded bg-[#E2E2E2]" />
                    <span className="h-4 w-4/5 rounded bg-[#E2E2E2]" />
                    <span className="h-4 w-2/3 rounded bg-[#E2E2E2]" />
                  </div>
                </div>
              ))}
            {cursos.map((curso) => {
              return (
                <Link
                  key={curso.slug}
                  data-card
                  to={`/curso/${curso.slug}`}
                  draggable={false}
                  onMouseEnter={() => {
                    import("@/features/curso/curso-detalhe-page")
                  }}
                  className="slider-card card-lift group relative flex aspect-[4/5] shrink-0 snap-start flex-col overflow-hidden rounded-[var(--radius-lg)] bg-[var(--sesi-black)]"
                >
                  <img
                    data-capa
                    src={imagemDoCurso(curso)}
                    srcSet={srcSetDoCurso(curso.slug)}
                    sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 25vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-[linear-gradient(to_top,var(--sesi-red)_0%,rgba(227,5,19,0.9)_30%,rgba(227,5,19,0.45)_62%,rgba(227,5,19,0)_88%)]"
                  />
                  <div className="relative z-10 flex h-full flex-col justify-between p-6">
                    <span
                      style={estiloBadgeCategoria(curso.categoria.cor)}
                      className="flex w-fit items-center gap-2 rounded px-3 py-1 text-sm font-semibold uppercase tracking-wide"
                    >
                      <IconeCategoria slug={curso.categoria.slug} className="h-4 w-4 shrink-0" />
                      {curso.categoria.nome}
                    </span>
                    <div className="flex flex-col gap-2 text-white">
                      <h3 className="line-clamp-3 font-['Open_Sans_Condensed',sans-serif] text-2xl font-bold leading-tight">
                        {curso.nomeCompleto}
                      </h3>
                      <p className="line-clamp-2 text-sm text-white">{curso.descricao}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white">
                        {curso.cargaHoraria}h · {curso.modalidade.nome}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}

            <Link
              to="/catalogo"
              data-card
              draggable={false}
              className="slider-card card-lift group relative flex aspect-[4/5] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] bg-[var(--sesi-black)] p-6 text-white"
            >
              <span aria-hidden="true" className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[var(--sesi-red)] opacity-25 blur-2xl" />
              <ArrowRight className="h-12 w-12 text-[var(--sesi-beige)] transition-transform duration-300 group-hover:translate-x-1" />
              <div className="relative flex flex-col gap-3">
                <p className="font-['Open_Sans_Condensed',sans-serif] text-4xl font-bold uppercase leading-[0.95]">
                  {t("allCourses")}
                </p>
                <span className="text-sm text-white">{t("exploreCatalog")}</span>
              </div>
            </Link>
        </div>

        <Container className="mt-8 flex items-center justify-between gap-4">
          <Link to="/catalogo">
            <Button variant="secondary" className="rounded-lg border-[var(--sesi-black)]">{t("seeAllCourses")}</Button>
          </Link>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              aria-label={t("previousCourses")}
              className="text-[var(--sesi-black)] transition-opacity hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sesi-black)]"
            >
              <ArrowLeft />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              aria-label={t("nextCourses")}
              className="text-[var(--sesi-black)] transition-opacity hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sesi-black)]"
            >
              <ArrowRight />
            </button>
          </div>
        </Container>
      </section>
      <Impact />
      <Testimonials />
      <CtaFinal />
      <CookieBanner />
    </MainLayout>
  )
}
