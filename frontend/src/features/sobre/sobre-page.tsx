import { useState } from "react"
import { Link } from "react-router-dom"
import { MainLayout } from "@/components/layout/main-layout"
import { Container } from "@/components/layout/container"
import heroImage from "@/assets/hero-image.png"

const videos = [
  { id: "JwELVGH-5YU", titulo: "Novo Centro Cultural SESI Itaquera" },
  { id: "5TIFj2BYmp8", titulo: "Indústria em Equilíbrio: cuidado e saúde mental" },
  { id: "r35ozKIkj8M", titulo: "Faculdade SESI de Educação: inscrições abertas" },
]

const pilares = [
  {
    titulo: "Educação",
    descricao: "Formação profissional, educação básica e cursos que conectam pessoas às demandas reais da indústria.",
    icone: "🎓",
  },
  {
    titulo: "Saúde e segurança",
    descricao: "Programas de saúde, bem-estar e prevenção de acidentes para trabalhadores e empresas.",
    icone: "🩺",
  },
  {
    titulo: "Cultura e esporte",
    descricao: "Centros culturais, orquestras, bibliotecas e projetos esportivos abertos à comunidade.",
    icone: "🎭",
  },
  {
    titulo: "Inovação",
    descricao: "Tecnologia, sustentabilidade e novos modelos de aprendizagem para a indústria do futuro.",
    icone: "💡",
  },
]

const valores = ["Excelência", "Inclusão", "Inovação", "Sustentabilidade", "Compromisso com a indústria"]

function VideoCard({ video }: { video: { id: string; titulo: string } }) {
  const [tocando, setTocando] = useState(false)

  return (
    <figure className="overflow-hidden rounded-[var(--radius-lg)] bg-white/5">
      <div className="relative aspect-video bg-black">
        {tocando ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1`}
            title={video.titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setTocando(true)}
            aria-label={`Assistir: ${video.titulo}`}
            className="group relative h-full w-full"
          >
            <img
              src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 grid place-items-center bg-black/30 transition group-hover:bg-black/45">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--sesi-red)] text-white shadow-lg">
                <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          </button>
        )}
      </div>
      <figcaption className="px-4 py-4 text-sm font-semibold leading-snug">{video.titulo}</figcaption>
    </figure>
  )
}

export function SobrePage() {
  return (
    <MainLayout>
      <section className="relative overflow-hidden bg-[var(--sesi-black)] pb-16 pt-12 text-white sm:pb-20">
        <div
          className="pointer-events-none absolute -right-32 top-0 h-[520px] w-[520px] rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--sesi-red)" }}
          aria-hidden="true"
        />
        <Container className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <nav aria-label="Trilha de navegação" className="mb-6 text-sm text-white/60">
              <Link to="/" className="hover:text-white hover:underline">
                Início
              </Link>
              <span className="mx-2">/</span>
              <span aria-current="page" className="text-white">
                Sobre
              </span>
            </nav>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--sesi-beige)]">Sobre o SESI</p>
            <h1 className="font-['Open_Sans_Condensed',sans-serif] text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Há mais de 80 anos impulsionando a indústria e as pessoas
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-white/75">
              O SESI São Paulo é a casa da indústria quando o assunto é educação, saúde, cultura e inovação. Uma história
              construída junto com as empresas e com os trabalhadores paulistas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/catalogo"
                className="rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)]"
              >
                Conhecer os cursos
              </Link>
              <a
                href="https://www.sesisp.org.br/institucional"
                target="_blank"
                rel="noreferrer"
                className="rounded-[var(--radius-lg)] border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-[var(--sesi-black)]"
              >
                Site institucional ↗
              </a>
            </div>
          </div>
          <div className="relative">
            <img
              src={heroImage}
              alt="Estudantes em ambiente de aprendizagem do SESI"
              className="h-[340px] w-full rounded-[var(--radius-lg)] object-cover shadow-2xl sm:h-[420px]"
            />
            <div className="absolute -bottom-6 left-4 rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-6 py-4 text-white shadow-xl sm:left-8">
              <p className="text-3xl font-bold">80+</p>
              <p className="text-xs font-semibold uppercase tracking-wide">anos de história</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-[var(--sesi-gray)] bg-white py-8" aria-label="Números do SESI">
        <Container className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { valor: "80+", rotulo: "anos de história" },
            { valor: "5", rotulo: "áreas de atuação" },
            { valor: "12", rotulo: "cursos no catálogo" },
            { valor: "SESI", rotulo: "certificação reconhecida" },
          ].map((item) => (
            <div key={item.rotulo} className="text-center">
              <p className="text-3xl font-bold text-[var(--sesi-red)]">{item.valor}</p>
              <p className="mt-1 text-sm text-[var(--sesi-muted)]">{item.rotulo}</p>
            </div>
          ))}
        </Container>
      </section>

      <section className="py-16">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--sesi-red)]">Nossa história</p>
            <h2 className="mt-2 font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold text-[var(--sesi-black)] sm:text-4xl">
              Da fábrica para a vida
            </h2>
            <div className="mt-4 flex flex-col gap-4 text-[var(--sesi-muted)]">
              <p>
                Criado em 1946, o SESI nasceu para cuidar da saúde e da educação dos trabalhadores da indústria. Em São
                Paulo, essa missão cresceu e hoje alcança estudantes, empresas e comunidades em todo o estado.
              </p>
              <p>
                Nossa plataforma reúne cursos presenciais e a distância, com certificação SESI, trilhas pensadas para a
                indústria e uma experiência de aprendizagem acessível — inclusive para quem precisa de recursos de
                acessibilidade e de diferentes idiomas.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img src="/cursos/matematica-precisao.svg" alt="" className="h-40 w-full rounded-[var(--radius-lg)] object-cover" />
            <img src="/cursos/quimica-sustentabilidade.svg" alt="" className="mt-8 h-40 w-full rounded-[var(--radius-lg)] object-cover" />
            <img src="/cursos/geometria-modelagem.svg" alt="" className="h-40 w-full rounded-[var(--radius-lg)] object-cover" />
            <img src="/cursos/fisica-movimento.svg" alt="" className="mt-8 h-40 w-full rounded-[var(--radius-lg)] object-cover" />
          </div>
        </Container>
      </section>

      <section className="bg-[#F5F5F5] py-16">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--sesi-red)]">Nossos princípios</p>
            <h2 className="mt-2 font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold text-[var(--sesi-black)] sm:text-4xl">
              Missão, visão e valores
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                titulo: "Missão",
                texto:
                  "Impulsionar a competitividade da indústria e o desenvolvimento das pessoas por meio da educação, da saúde, da cultura e da inovação.",
              },
              {
                titulo: "Visão",
                texto:
                  "Ser reconhecido como o parceiro essencial da indústria para formar as pessoas e construir o futuro do trabalho.",
              },
              {
                titulo: "Valores",
                texto: "Excelência no que fazemos, inclusão de todas as pessoas e compromisso com a sustentabilidade.",
              },
            ].map((item) => (
              <article key={item.titulo} className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-6">
                <h3 className="text-xl font-bold text-[var(--sesi-black)]">{item.titulo}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--sesi-muted)]">{item.texto}</p>
              </article>
            ))}
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-2">
            {valores.map((valor) => (
              <li key={valor} className="rounded-full border border-[var(--sesi-red)] px-4 py-1.5 text-sm font-semibold text-[var(--sesi-red)]">
                {valor}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--sesi-red)]">O que fazemos</p>
            <h2 className="mt-2 font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold text-[var(--sesi-black)] sm:text-4xl">
              Uma rede de oportunidades para a indústria
            </h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pilares.map((pilar) => (
              <article key={pilar.titulo} className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] p-6 transition hover:border-[var(--sesi-red)] hover:shadow-[var(--shadow-card)]">
                <span className="text-3xl" aria-hidden="true">
                  {pilar.icone}
                </span>
                <h3 className="mt-4 text-lg font-bold text-[var(--sesi-black)]">{pilar.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--sesi-muted)]">{pilar.descricao}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[var(--sesi-black)] py-16 text-white">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--sesi-beige)]">SESI São Paulo no YouTube</p>
              <h2 className="mt-2 font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">
                Histórias, cultura e conhecimento
              </h2>
              <p className="mt-3 text-white/70">
                Acompanhe projetos, eventos e conteúdos que mostram o SESI para além da sala de aula.
              </p>
            </div>
            <a
              href="https://www.youtube.com/@SesiSaoPauloOficial"
              target="_blank"
              rel="noreferrer"
              className="rounded-[var(--radius-lg)] border border-white/30 px-5 py-2.5 text-sm font-semibold transition hover:bg-white hover:text-[var(--sesi-black)]"
            >
              Ver canal ↗
            </a>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[var(--sesi-red)] py-14 text-white">
        <Container className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">Pronto para começar?</h2>
            <p className="mt-2 text-white">Escolha um curso e dê o próximo passo na sua carreira.</p>
          </div>
          <Link
            to="/catalogo"
            className="rounded-[var(--radius-lg)] bg-white px-6 py-3 text-sm font-bold text-[var(--sesi-red)] transition hover:bg-[var(--sesi-black)] hover:text-white"
          >
            Ver todos os cursos
          </Link>
        </Container>
      </section>
    </MainLayout>
  )
}
