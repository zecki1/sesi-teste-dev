import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { useCurso } from "@/hooks/use-catalogo"
import { ApiError, API_URL } from "@/lib/api/catalogo"
import { usePerfil } from "@/lib/auth/perfil"
import { MainLayout } from "@/components/layout/main-layout"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { HeroCurso } from "@/features/curso/components/hero-curso"
import { BeneficiosCurso } from "@/features/curso/components/beneficios-curso"
import { SobreCurso } from "@/features/curso/components/sobre-curso"
import { DepoimentosCurso } from "@/features/curso/components/depoimentos-curso"
import { AjudaCurso } from "@/features/curso/components/ajuda-curso"
import { FaixaMatricula } from "@/features/curso/components/faixa-matricula"
import { MatriculaModal } from "@/features/curso/components/matricula-modal"
import { configScormEfetiva } from "./scorm-config"
import {
  obterConfiguracaoPaginaScorm,
  obterPacoteScorm,
  obterProgressoScorm,
  urlPlayerScorm,
  type PacoteScormDto,
  type ScormPaginaConfigDto,
} from "./scorm-api"

export function ScormCursoPage() {
  const { slug } = useParams<{ slug: string }>()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { data: curso, isLoading, isError, error } = useCurso(slug || "")
  const perfil = usePerfil()
  const [pacote, setPacote] = useState<PacoteScormDto | null>(null)
  const [carregandoPacote, setCarregandoPacote] = useState(true)
  const [erroPacote, setErroPacote] = useState("")
  const [erroProgresso, setErroProgresso] = useState("")
  const [erroConfiguracao, setErroConfiguracao] = useState("")
  const [configuracaoRemota, setConfiguracaoRemota] = useState<ScormPaginaConfigDto | null>(null)
  const [progresso, setProgresso] = useState(0)
  const [statusScorm, setStatusScorm] = useState("")
  const [matriculaAberta, setMatriculaAberta] = useState(false)
  const emPlayer = pathname.endsWith("/scorm/player")

  useEffect(() => {
    if (!slug || !curso) return
    let ativo = true
    setErroConfiguracao("")
    obterConfiguracaoPaginaScorm(slug)
      .then((salva) => {
        if (ativo) setConfiguracaoRemota(salva)
      })
      .catch((falha: unknown) => {
        if (ativo) {
          setConfiguracaoRemota(null)
          setErroConfiguracao(falha instanceof Error ? falha.message : "Não foi possível carregar a configuração da página SCORM.")
        }
      })

    return () => {
      ativo = false
    }
  }, [slug, curso])

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
              : "A API não respondeu. Verifique se o serviço está em execução e tente novamente."}
          </p>
          <Link to="/catalogo">
            <Button variant="primary" className="mt-2">Voltar ao catálogo</Button>
          </Link>
        </Container>
      </MainLayout>
    )
  }

  const config = configScormEfetiva(curso, configuracaoRemota)
  const subtitulo = config.subtitulo || `${curso.categoria.nome} · ${curso.modalidade.nome} · Curso autoinstrucional`
  const versaoEfetiva = pacote?.versao ?? config.versao
  const urlPlayer = pacote ? urlPlayerScorm(pacote, perfil?.email ?? "anonimo") : config.urlLancamento
  const temPlayer = Boolean(urlPlayer)

  const irParaConteudo = () => navigate(`/curso/${curso.slug}/scorm/player`)

  if (emPlayer) {
    return (
      <MainLayout showFooter={false}>
        <section className="flex min-h-[calc(100svh-72px)] flex-col">
          <Container className="flex w-full items-center justify-between gap-4 border-b border-[var(--sesi-gray)] py-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sesi-muted)]">Curso SCORM {versaoEfetiva}</p>
              <h1 className="truncate text-lg font-bold text-[var(--sesi-black)] sm:text-xl">{config.titulo}</h1>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-xs text-[var(--sesi-muted)]">Progresso</span>
              <strong className="text-sm text-[var(--sesi-black)]">{progresso}%</strong>
            </div>
          </Container>

          {temPlayer ? (
            <iframe
              data-player-scorm
              src={urlPlayer}
              title={`Conteúdo SCORM do curso ${curso.nomeBreve}`}
              className="h-[calc(100svh-150px)] min-h-[420px] w-full border-0"
              allow="fullscreen"
            />
          ) : carregandoPacote ? (
            <div data-player-carregando className="grid min-h-[420px] flex-1 place-items-center px-6 py-10 text-sm text-[var(--sesi-muted)]">
              Carregando player SCORM...
            </div>
          ) : (
            <Container className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
              <p role={erroPacote ? "alert" : undefined} className={erroPacote ? "text-sm text-[var(--sesi-red)]" : "text-sm text-[var(--sesi-muted)]"}>
                {erroPacote
                  ? `Não foi possível carregar o pacote SCORM. ${erroPacote}`
                  : "Nenhum pacote SCORM foi publicado para este curso."}
              </p>
              <Button type="button" variant="secondary" onClick={() => navigate(`/curso/${curso.slug}/scorm`)}>
                Voltar aos detalhes do curso
              </Button>
            </Container>
          )}
        </section>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <HeroCurso
        curso={curso}
        titulo={config.titulo}
        subtitulo={subtitulo}
        imagemUrl={config.imagemUrl || undefined}
        imagemFundoUrl={config.bannerUrl || undefined}
        cargaHoraria={config.cargaHoraria}
        textoCta={config.botaoTexto}
        aoClicarCta={irParaConteudo}
        onMatricular={() => setMatriculaAberta(true)}
        dataScorm
      />
      <BeneficiosCurso />

      <section id="conteudo-scorm" className="scroll-mt-[88px] py-12 sm:py-16">
        <Container className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">Conteúdo do curso</h2>
            <p className="mt-2 text-sm text-[var(--sesi-muted)]">
              Pacote SCORM {versaoEfetiva}; seu progresso é salvo enquanto você realiza as aulas.
            </p>
            {erroConfiguracao && (
              <p role="alert" className="mt-4 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Não foi possível consultar a configuração salva no servidor. Exibindo os dados disponíveis neste navegador. {erroConfiguracao}
              </p>
            )}

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
                  {erroPacote && <p role="alert" className="border-b border-[var(--sesi-gray)] px-4 py-2 text-sm text-[var(--sesi-red)]">{erroPacote}</p>}
                  {erroProgresso && <p role="alert" className="border-b border-[var(--sesi-gray)] px-4 py-2 text-sm text-[var(--sesi-red)]">{erroProgresso}</p>}
                  <div className="flex flex-col items-start gap-4 bg-[#F5F5F5] px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-[var(--sesi-black)]">Seu curso está pronto</h3>
                      <p className="mt-1 text-sm text-[var(--sesi-muted)]">Continue de onde parou. Seu progresso é salvo durante as aulas.</p>
                    </div>
                    <Link
                      to={`/curso/${curso.slug}/scorm/player`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--sesi-red)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)]"
                    >
                      {progresso > 0 ? "Continuar curso" : "Iniciar curso"}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
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
                    {config.arquivo ? <>O pacote <strong className="text-[var(--sesi-black)]">{config.arquivo}</strong> está registrado no admin.</> : "Nenhum pacote SCORM publicado ainda."}{" "}
                    Envie o <strong className="text-[var(--sesi-black)]">.zip</strong> no admin do curso para disponibilizar o conteúdo aqui.
                  </p>
                  <dl className="mt-2 grid gap-2 text-sm text-[var(--sesi-black)] sm:grid-cols-3">
                    <div><dt className="text-xs uppercase tracking-wide text-[#4A4A4A]">Versão</dt><dd className="font-semibold">SCORM {versaoEfetiva}</dd></div>
                    <div><dt className="text-xs uppercase tracking-wide text-[#4A4A4A]">Carga horária</dt><dd className="font-semibold">{config.cargaHoraria}h</dd></div>
                    <div><dt className="text-xs uppercase tracking-wide text-[#4A4A4A]">Arquivo</dt><dd className="font-semibold">{config.arquivo || "não anexado"}</dd></div>
                  </dl>
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-6 lg:col-span-4">
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
          </aside>
        </Container>
      </section>

      <SobreCurso curso={curso} descricao={config.descricao} />
      <DepoimentosCurso />
      <AjudaCurso />
      <FaixaMatricula nomeCurso={curso.nomeCompleto} onMatricular={() => setMatriculaAberta(true)} />
      <MatriculaModal curso={curso} aberto={matriculaAberta} onFechar={() => setMatriculaAberta(false)} />
    </MainLayout>
  )
}
