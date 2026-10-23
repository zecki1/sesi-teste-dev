import { Link, useParams } from "react-router-dom"
import { useEffect, useState, type ReactNode } from "react"
import { useCurso } from "@/hooks/use-catalogo"
import { ApiError, API_URL } from "@/lib/api/catalogo"
import { usePerfil } from "@/lib/auth/perfil"
import { MainLayout } from "@/components/layout/main-layout"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { IconeCategoria, estiloBadgeCategoria } from "@/lib/ui/icones-categoria"
import bannerPadrao from "@/assets/case/banner-ava.png"
import logoWhite from "@/assets/logo-sesi-industria-white.svg"
import { configScormEfetiva } from "./scorm-config"
import {
  obterPacoteScorm,
  obterProgressoScorm,
  urlPlayerScorm,
  type PacoteScormDto,
} from "./scorm-api"

function Meta({ children }: { children: ReactNode }) {
  return <li className="flex items-center gap-2 text-sm text-white/85">{children}</li>
}

export function ScormCursoPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: curso, isLoading, isError, error } = useCurso(slug || "")
  const perfil = usePerfil()
  const [pacote, setPacote] = useState<PacoteScormDto | null>(null)
  const [carregandoPacote, setCarregandoPacote] = useState(true)
  const [erroPacote, setErroPacote] = useState("")
  const [erroProgresso, setErroProgresso] = useState("")
  const [progresso, setProgresso] = useState(0)
  const [statusScorm, setStatusScorm] = useState("")

  useEffect(() => {
    if (!slug) return
    let ativo = true

    setCarregandoPacote(true)
    setErroPacote("")
    obterPacoteScorm(slug)
      .then((encontrado) => {
        if (ativo) setPacote(encontrado)
      })
      .catch((falha: unknown) => {
        if (ativo) {
          setPacote(null)
          setErroPacote(falha instanceof Error ? falha.message : "Não foi possível consultar o pacote SCORM.")
        }
      })
      .finally(() => {
        if (ativo) setCarregandoPacote(false)
      })

    return () => {
      ativo = false
    }
  }, [slug])

  useEffect(() => {
    const usuarioId = perfil?.email || "anonimo"
    if (!slug || !pacote) return
    let ativo = true

    obterProgressoScorm(slug, usuarioId)
      .then((salvo) => {
        if (ativo && salvo) {
          setProgresso((atual) => Math.max(atual, Math.round(salvo.percentual)))
          setStatusScorm(salvo.lessonStatus || "")
        }
      })
      .catch((falha: unknown) => {
        if (ativo) {
          setErroProgresso(falha instanceof Error ? falha.message : "Não foi possível consultar o progresso SCORM.")
        }
      })

    return () => {
      ativo = false
    }
  }, [slug, pacote, perfil?.email])

  useEffect(() => {
    const origemApi = new URL(API_URL).origin

    const aoReceberMensagem = (evento: MessageEvent) => {
      if (evento.origin !== origemApi) return

      const mensagem = evento.data as { type?: string; dados?: { percentual?: number; lessonStatus?: string } } | null
      if (!mensagem || typeof mensagem !== "object" || !String(mensagem.type).startsWith("SCORM_")) return

      const dados = mensagem.dados ?? (mensagem as { percentual?: number; lessonStatus?: string })
      if (typeof dados.percentual === "number") {
        setProgresso((atual) => Math.max(atual, Math.round(dados.percentual ?? 0)))
      }
      if (dados.lessonStatus) setStatusScorm(dados.lessonStatus)
    }

    window.addEventListener("message", aoReceberMensagem)
    return () => window.removeEventListener("message", aoReceberMensagem)
  }, [])

  if (isLoading) {
    return (
      <MainLayout>
        <Container className="py-10">Carregando...</Container>
      </MainLayout>
    )
  }

  if (isError || !curso) {
    const naoEncontrado = error instanceof ApiError && error.status === 404

    return (
      <MainLayout>
        <Container className="flex flex-col items-start gap-4 py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--sesi-red)]">
            {naoEncontrado ? "Erro 404" : "Falha de conexão"}
          </p>
          <h1 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">
            {naoEncontrado ? "Curso não encontrado" : "Não foi possível carregar o curso"}
          </h1>
          <p className="max-w-xl text-[var(--sesi-muted)]">
            {naoEncontrado
              ? "O curso que você procura não existe ou saiu do catálogo."
              : "Verifique sua conexão com a internet e tente novamente."}
          </p>
          <Link to="/catalogo">
            <Button variant="primary" className="mt-2">Voltar ao catálogo</Button>
          </Link>
        </Container>
      </MainLayout>
    )
  }

  const config = configScormEfetiva(curso)
  const banner = config.bannerUrl || bannerPadrao
  const subtitulo = config.subtitulo || `${curso.categoria.nome} · ${curso.modalidade.nome} · Curso autoinstrucional`
  const versaoEfetiva = pacote?.versao ?? config.versao
  const urlPlayer = pacote ? urlPlayerScorm(pacote, perfil?.email ?? "anonimo") : config.urlLancamento
  const temPlayer = Boolean(urlPlayer)

  const irParaConteudo = () => {
    document.getElementById("conteudo-scorm")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <MainLayout>
      <section data-banner-scorm className="relative overflow-hidden bg-[var(--sesi-black)] py-14 text-white sm:py-20">
        <img src={banner} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,12,13,0.95)_0%,rgba(12,12,13,0.75)_55%,rgba(12,12,13,0.35)_100%)]" />

        <Container className="relative grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="flex flex-col gap-5 lg:col-span-7">
            <img src={logoWhite} alt="SESI Indústria" className="h-8 w-auto" />
            <span
              style={estiloBadgeCategoria(curso.categoria.cor)}
              className="flex w-fit items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
            >
              <IconeCategoria slug={curso.categoria.slug} className="h-4 w-4 shrink-0" />
              {curso.categoria.nome}
            </span>
            <h1 data-titulo-scorm className="font-['Open_Sans_Condensed',sans-serif] text-4xl font-bold leading-[1.05] sm:text-5xl">
              {config.titulo}
            </h1>
            <p className="max-w-2xl text-base text-white/85">{subtitulo}</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              <Meta>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Carga horária: <strong data-carga-scorm>{config.cargaHoraria}h</strong>
              </Meta>
              <Meta>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7h16v12H4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M4 7l8-4 8 4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
                {curso.modalidade.nome}
              </Meta>
              <Meta>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3l8 4v6c0 4.2-3.2 7.4-8 8.6C7.2 20.4 4 17.2 4 13V7l8-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Certificação SESI
              </Meta>
            </ul>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={irParaConteudo}
                className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-6 py-3 text-base font-semibold text-white transition hover:bg-[var(--sesi-red-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {config.botaoTexto}
                <span aria-hidden="true">→</span>
              </button>
              <Link
                to={`/curso/${curso.slug}`}
                className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-[var(--sesi-black)]"
              >
                Ver página do curso
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-white/15 bg-white/5 p-2 backdrop-blur-sm">
              {config.imagemUrl ? (
                <img
                  data-imagem-scorm
                  src={config.imagemUrl}
                  alt={`Capa do curso ${curso.nomeBreve}`}
                  className="aspect-[4/3] w-full rounded object-cover"
                />
              ) : (
                <div className="grid aspect-[4/3] w-full place-items-center rounded bg-white/10 text-sm text-white/70">
                  Sem imagem configurada
                </div>
              )}
            </div>
          </div>
        </Container>
      </section>

      <section id="conteudo-scorm" className="scroll-mt-[88px] py-12 sm:py-16">
        <Container className="grid gap-10 lg:grid-cols-12">
          <div className="flex flex-col gap-10 lg:col-span-8">
            <div>
              <h2 className="font-['Open_Sans_Condensed',sans-serif] text-2xl font-bold sm:text-3xl">Conteúdo do curso</h2>
              <p className="mt-2 text-sm text-[var(--sesi-muted)]">
                Este curso é entregue como pacote SCORM {versaoEfetiva} e mantém o mesmo padrão de página do catálogo.
              </p>

              <div className="mt-5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white">
                {temPlayer ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--sesi-gray)] px-4 py-2 text-xs text-[var(--sesi-muted)]">
                      <span className="font-semibold uppercase tracking-wide">Progresso do aluno</span>
                      <span className="flex items-center gap-3">
                        {statusScorm && (
                          <span data-status-scorm className="rounded bg-[var(--sesi-gray)] px-2 py-0.5 font-semibold text-[var(--sesi-black)]">
                            {statusScorm}
                          </span>
                        )}
                        <strong className="text-[var(--sesi-black)]">{progresso}%</strong>
                      </span>
                    </div>
                    <div className="h-1 bg-[var(--sesi-gray)]">
                      <div className="h-full bg-[var(--sesi-red)] transition-[width] duration-300" style={{ width: `${progresso}%` }} />
                    </div>
                    {erroPacote && (
                      <p role="alert" className="border-b border-[var(--sesi-gray)] px-4 py-2 text-sm text-[var(--sesi-red)]">
                        {erroPacote}
                      </p>
                    )}
                    {erroProgresso && (
                      <p role="alert" className="border-b border-[var(--sesi-gray)] px-4 py-2 text-sm text-[var(--sesi-red)]">
                        {erroProgresso}
                      </p>
                    )}
                    <iframe
                      data-player-scorm
                      src={urlPlayer}
                      title={`Conteúdo SCORM do curso ${curso.nomeBreve}`}
                      className="h-[70vh] min-h-[420px] w-full border-0"
                      allow="fullscreen"
                    />
                  </>
                ) : carregandoPacote ? (
                  <div data-player-carregando className="grid min-h-[280px] place-items-center bg-[#F5F5F5] px-6 py-10 text-sm text-[var(--sesi-muted)]">
                    Carregando player SCORM...
                  </div>
                ) : erroPacote ? (
                  <div role="alert" className="bg-red-50 px-6 py-10 text-sm text-red-800">
                    Não foi possível carregar o pacote SCORM. {erroPacote}
                  </div>
                ) : (
                  <div data-player-demonstrativo className="flex flex-col items-center gap-4 bg-[#F5F5F5] px-6 py-14 text-center">
                    <span aria-hidden="true" className="grid h-16 w-16 place-items-center rounded-full bg-[var(--sesi-red)]/10 text-[var(--sesi-red)]">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M10 8l5 3-5 3V8z" fill="currentColor" />
                        <path d="M8 21h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </span>
                    <h3 className="text-lg font-bold text-[var(--sesi-black)]">Player SCORM</h3>
                    <p className="max-w-md text-sm text-[#4A4A4A]">
                      {config.arquivo ? (
                        <>
                          O pacote <strong className="text-[var(--sesi-black)]">{config.arquivo}</strong> está registrado no admin.
                        </>
                      ) : (
                        "Nenhum pacote SCORM publicado ainda."
                      )}{" "}
                      Envie o <strong className="text-[var(--sesi-black)]">.zip</strong> no admin do curso para que o backend extraia o
                      conteúdo e o player o execute aqui.
                    </p>
                    <dl className="mt-2 grid gap-2 text-sm text-[var(--sesi-black)] sm:grid-cols-3">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-[#4A4A4A]">Versão</dt>
                        <dd className="font-semibold">SCORM {versaoEfetiva}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-[#4A4A4A]">Carga horária</dt>
                        <dd className="font-semibold">{config.cargaHoraria}h</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-[#4A4A4A]">Arquivo</dt>
                        <dd className="font-semibold">{config.arquivo || "não anexado"}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="font-['Open_Sans_Condensed',sans-serif] text-2xl font-bold sm:text-3xl">Sobre o curso</h2>
              <p data-descricao-scorm className="mt-3 whitespace-pre-line text-[var(--sesi-muted)]">
                {config.descricao}
              </p>
            </div>

            <div>
              <h2 className="font-['Open_Sans_Condensed',sans-serif] text-2xl font-bold sm:text-3xl">Módulos</h2>
              {curso.modulos.length > 0 ? (
                <ol className="mt-4 flex flex-col gap-3">
                  {curso.modulos.map((modulo, indice) => (
                    <li key={modulo.id} className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-4">
                      <p className="text-sm font-semibold text-[var(--sesi-black)]">
                        {indice + 1}. {modulo.titulo}
                      </p>
                      {modulo.aulas.length > 0 && (
                        <ul className="mt-2 flex flex-col gap-1 text-sm text-[var(--sesi-muted)]">
                          {modulo.aulas.map((aula) => (
                            <li key={aula.id}>• {aula.titulo}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-[var(--sesi-muted)]">
                  A estrutura de módulos é definida dentro do pacote SCORM.
                </p>
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-6 lg:col-span-4">
            <div className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-6">
              <h2 className="text-lg font-bold text-[var(--sesi-black)]">Informações do curso</h2>
              <dl className="mt-4 flex flex-col gap-3 text-sm">
                {[
                  { rotulo: "Carga horária", valor: `${config.cargaHoraria} horas` },
                  { rotulo: "Modalidade", valor: curso.modalidade.nome },
                  { rotulo: "Categoria", valor: curso.categoria.nome },
                  { rotulo: "Público-alvo", valor: curso.publicoAlvo || "Não informado" },
                  { rotulo: "Formato", valor: `Pacote SCORM ${versaoEfetiva}` },
                  { rotulo: "Certificação", valor: "SESI" },
                ].map((item) => (
                  <div key={item.rotulo} className="flex flex-col gap-0.5 border-b border-[var(--sesi-gray)] pb-2 last:border-0 last:pb-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--sesi-muted)]">{item.rotulo}</dt>
                    <dd className="text-[var(--sesi-black)]">{item.valor}</dd>
                  </div>
                ))}
              </dl>
              <Link
                to={`/area-do-aluno/curso/${curso.slug}`}
                className="mt-5 inline-flex w-full items-center justify-center rounded-[var(--radius-lg)] bg-[var(--sesi-black)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Abrir na área do aluno
              </Link>
            </div>

            <div className="rounded-[var(--radius-lg)] bg-[var(--sesi-black)] p-6 text-white">
              <h2 className="text-lg font-bold">Precisa de ajuda?</h2>
              <p className="mt-2 text-sm text-white/75">
                Fale com a equipe pedagógica para tirar dúvidas sobre o acesso ao pacote SCORM.
              </p>
              <a href="mailto:contato@sesindustria.com.br" className="mt-4 inline-block text-sm font-semibold text-[var(--sesi-beige)] underline-offset-4 hover:underline">
                contato@sesindustria.com.br
              </a>
            </div>
          </aside>
        </Container>
      </section>
    </MainLayout>
  )
}
