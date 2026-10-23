import { useState } from "react"
import { Link } from "react-router-dom"
import { Container } from "@/components/layout/container"
import videoThumb from "@/assets/video-thumb.png"

const VIDEO_ID = "UOALUskXHcY"

export function CtaFinal() {
  const [playing, setPlaying] = useState(false)

  return (
    <section className="bg-[var(--sesi-red-dark)] py-16 text-white sm:py-20">
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <div data-aos="fade-up" className="flex flex-col gap-6">
          <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">
            Pronto para transformar sua carreira?
          </h2>
          <p className="max-w-xl text-lg text-white">
            Junte-se a milhares de profissionais que estão transformando a indústria através dos nossos
            cursos. Invista no seu futuro hoje mesmo!
          </p>
          <div>
            <Link
              to="/catalogo"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-white px-8 py-4 text-base font-semibold text-[var(--sesi-black)] transition-colors hover:bg-white/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Matricule-se
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div
          data-aos="fade-up"
          data-aos-delay="120"
          className="relative aspect-video overflow-hidden rounded-[var(--radius-lg)] bg-black"
        >
          {playing ? (
            <iframe
              key="video"
              className="media-reveal h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
              title="Vídeo institucional SESI Indústria"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <>
              <img
                src={videoThumb}
                alt="Apresentação dos cursos SESI Indústria"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label="Reproduzir vídeo"
                className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--sesi-red)] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </>
          )}
        </div>
      </Container>
    </section>
  )
}
