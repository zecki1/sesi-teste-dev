import { Link, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useCurso } from "@/hooks/use-catalogo"
import { ApiError } from "@/lib/api/catalogo"
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
import { obterBoletim, type BoletimCurso } from "@/lib/api/academico"

const IDIOMAS_SUPORTADOS = ["pt-BR", "en-US", "es-ES"] as const

/** Reduz o idioma da interface a um dos três suportados. */
function normalizarIdioma(valor: string | undefined) {
  const idioma = (valor ?? "").replace("_", "-").toLowerCase()
  if (idioma.startsWith("en")) return "en-US"
  if (idioma.startsWith("es")) return "es-ES"
  return "pt-BR"
}

/** Alerta de idioma indisponível, exibido acima do conteúdo SCORM. */
function AlertaIdioma({ idioma, padrao }: { idioma: string; padrao: string }) {
  const { t, i18n } = useTranslation("course")
  const formatador = new Intl.DisplayNames([i18n.language], { type: "language" })
  const nome = (codigo: string) => {
    try {
      return formatador.of(codigo) ?? codigo
    } catch {
      return codigo
    }
  }

  return (
    <div
      role="alert"
      data-alerta-idioma
      className="mt-4 flex items-start gap-3 rounded-[var(--radius-lg)] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <span aria-hidden="true" className="mt-0.5 text-base">⚠️</span>
      <div>
        <p className="font-semibold">{t("scorm.languageAlertTitle")}</p>
        <p className="mt-1">
          {t("scorm.languageAlert", { idioma: nome(idioma), padrao: nome(padrao) })}
        </p>
      </div>
    </div>
  )
}

export function ScormCursoPage() {
  const { t, i18n } = useTranslation("course")
  const { slug } = useParams<{ slug: string }>()
  const { data: curso, isLoading, isError, error } = useCurso(slug || "")
  const perfil = usePerfil()
  const [pacote, setPacote] = useState<PacoteScormDto | null>(null)
  const [carregandoPacote, setCarregandoPacote] = useState(true)
  const [erroPacote, setErroPacote] = useState("")
  const [erroProgresso, setErroProgresso] = useState("")
  const [erroConfiguracao, setErroConfiguracao] = useState("")
  const [configuracaoRemota, setConfiguracaoRemota] = useState<ScormPaginaConfigDto | null>(null)
  const [progresso, setProgresso] = useState(0)
  const [boletimCurso, setBoletimCurso] = useState<BoletimCurso | null>(null)
  const [statusScorm, setStatusScorm] = useState("")
  const [matriculaAberta, setMatriculaAberta] = useState(false)

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
          setErroConfiguracao(falha instanceof Error ? falha.message : t("scorm.configError"))
        }
      })

    return () => {
      ativo = false
    }
  }, [slug, curso, t])

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
          setErroPacote(falha instanceof Error ? falha.message : t("scorm.packageError"))
        }
      })
      .finally(() => {
        if (ativo) setCarregandoPacote(false)
      })

    return () => {
      ativo = false
    }
  }, [slug, t])

  useEffect(() => {
    const usuarioId = perfil?.email || "anonimo"
    if (!slug || !pacote) return
    let ativo = true

    const consultar = () =>
      obterProgressoScorm(slug, usuarioId)
        .then((salvo) => {
          if (ativo && salvo) {
            setProgresso((atual) => Math.max(atual, Math.round(salvo.percentual)))
            setStatusScorm(salvo.lessonStatus || "")
          }
        })
        .catch((falha: unknown) => {
          if (ativo) {
            setErroProgresso(falha instanceof Error ? falha.message : t("scorm.progressError"))
          }
        })

    void consultar()

    // O curso abre em outra guia; ao voltar, atualiza o progresso salvo pelo player.
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void consultar()
    }
    document.addEventListener("visibilitychange", aoVoltar)
    window.addEventListener("focus", aoVoltar)

    return () => {
      ativo = false
      document.removeEventListener("visibilitychange", aoVoltar)
      window.removeEventListener("focus", aoVoltar)
    }
  }, [slug, pacote, perfil?.email, t])

  useEffect(() => {
    if (!perfil?.email || !slug) return
    let ativo = true
    obterBoletim(perfil.email)
      .then((b) => ativo && setBoletimCurso(b.cursos.find((c) => c.cursoSlug === slug) ?? null))
      .catch(() => ativo && setBoletimCurso(null))
    return () => { ativo = false }
  }, [perfil?.email, slug])

  if (isLoading) {
    return (
      <MainLayout>
        <Container className="py-10">{t("loading")}</Container>
      </MainLayout>
    )
  }

  if (isError || !curso) {
    const naoEncontrado = error instanceof ApiError && error.status === 404

    return (
      <MainLayout>
        <Container className="flex flex-col items-start gap-4 py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--sesi-red)]">
            {naoEncontrado ? t("notFoundEyebrow") : t("connectionEyebrow")}
          </p>
          <h1 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">
            {naoEncontrado ? t("notFoundTitle") : t("connectionTitle")}
          </h1>
          <p className="max-w-xl text-[var(--sesi-muted)]">
            {naoEncontrado ? t("notFoundHint") : t("connectionHintApi")}
          </p>
          <Link to="/catalogo">
            <Button variant="primary" className="mt-2">{t("backToCatalog")}</Button>
          </Link>
        </Container>
      </MainLayout>
    )
  }

  const config = configScormEfetiva(curso, configuracaoRemota)
  const subtitulo = config.subtitulo || `${curso.categoria.nome} · ${curso.modalidade.nome} · ${t("scorm.autoInstructional")}`
  const versaoEfetiva = pacote?.versao ?? config.versao
  const urlPlayer = pacote ? urlPlayerScorm(pacote, perfil?.email ?? "anonimo") : config.urlLancamento
  const temPlayer = Boolean(urlPlayer)

  const idiomaAtual = normalizarIdioma(i18n.language)
  const idiomasDoPacote = (config.idiomas.length ? config.idiomas : ["pt-BR"])
    .map(normalizarIdioma)
    .filter((idioma, indice, lista) => IDIOMAS_SUPORTADOS.includes(idioma as typeof IDIOMAS_SUPORTADOS[number]) && lista.indexOf(idioma) === indice)
  const idiomaPadrao = normalizarIdioma(config.idiomaPadrao)
  const idiomaIndisponivel = !idiomasDoPacote.includes(idiomaAtual)

  const abrirPlayer = () => window.open(`/curso/${curso.slug}/scorm/player`, "_blank")
  const irParaConteudo = abrirPlayer

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

      <section className="py-6">
        <Container>
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-4">
            <span className="text-sm font-semibold text-[var(--sesi-black)]">Idioma do conteúdo:</span>
            {(["pt-BR", "en-US", "es-ES"] as const).map((codigo) => {
              const disponivel = idiomasDoPacote.includes(codigo)
              const ativo = idiomaAtual === codigo
              return (
                <button
                  key={codigo}
                  type="button"
                  onClick={() => i18n.changeLanguage(codigo)}
                  className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-semibold transition ${
                    ativo
                      ? "border-[var(--sesi-red)] bg-[var(--sesi-red)] text-white"
                      : disponivel
                      ? "border-[var(--sesi-gray)] bg-white text-[var(--sesi-black)] hover:border-[var(--sesi-red)]"
                      : "border-[var(--sesi-gray)] bg-[#F5F5F5] text-[var(--sesi-muted)]"
                  }`}
                  title={disponivel ? "Disponível no pacote" : "Não disponível no pacote"}
                >
                  {codigo === "pt-BR" ? "🇧🇷 Português" : codigo === "en-US" ? "🇺🇸 English" : "🇪🇸 Español"}
                  {!disponivel && <span className="text-xs">(indisponível)</span>}
                </button>
              )
            })}
          </div>
        </Container>
      </section>

      <section id="conteudo-scorm" className="scroll-mt-[88px] py-12 sm:py-16">
        <Container className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">{t("scorm.contentTitle")}</h2>
            <p className="mt-2 text-sm text-[var(--sesi-muted)]">
              {t("scorm.contentSubtitle", { versao: versaoEfetiva })}
            </p>
            {erroConfiguracao && (
              <p role="alert" className="mt-4 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {t("scorm.configError")} {erroConfiguracao}
              </p>
            )}

            {idiomaIndisponivel && <AlertaIdioma idioma={idiomaAtual} padrao={idiomaPadrao} />}

            <div className="mt-5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white">
              {temPlayer ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--sesi-gray)] px-4 py-2 text-xs text-[var(--sesi-muted)]">
                    <span className="font-semibold uppercase tracking-wide">{t("scorm.progressLabel")}</span>
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
                      <h3 className="font-semibold text-[var(--sesi-black)]">{t("scorm.readyTitle")}</h3>
                      <p className="mt-1 text-sm text-[var(--sesi-muted)]">{t("scorm.readyText")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={abrirPlayer}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--sesi-red)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)]"
                    >
                      {progresso > 0 ? t("continueCourse") : t("startCourse")}
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </>
              ) : carregandoPacote ? (
                <div data-player-carregando className="grid min-h-[280px] place-items-center bg-[#F5F5F5] px-6 py-10 text-sm text-[var(--sesi-muted)]">
                  {t("scorm.loadingPlayer")}
                </div>
              ) : erroPacote ? (
                <div role="alert" className="bg-red-50 px-6 py-10 text-sm text-red-800">
                  {t("scorm.packageError")} {erroPacote}
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
                    {config.arquivo ? t("scorm.demoPackage", { arquivo: config.arquivo }) : t("scorm.demoNoPackage")}{" "}
                    {t("scorm.demoUploadHint")}
                  </p>
                  <dl className="mt-2 grid gap-2 text-sm text-[var(--sesi-black)] sm:grid-cols-3">
                    <div><dt className="text-xs uppercase tracking-wide text-[#4A4A4A]">{t("scorm.version")}</dt><dd className="font-semibold">SCORM {versaoEfetiva}</dd></div>
                    <div><dt className="text-xs uppercase tracking-wide text-[#4A4A4A]">{t("scorm.workloadLabel")}</dt><dd className="font-semibold">{config.cargaHoraria}h</dd></div>
                    <div><dt className="text-xs uppercase tracking-wide text-[#4A4A4A]">{t("scorm.file")}</dt><dd className="font-semibold">{config.arquivo || t("scorm.fileNotAttached")}</dd></div>
                  </dl>
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-6 lg:col-span-4">
            <h2 className="text-lg font-bold text-[var(--sesi-black)]">{t("scorm.infoTitle")}</h2>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              {[
                { rotulo: t("scorm.workloadLabel"), valor: `${config.cargaHoraria}h` },
                { rotulo: t("modality"), valor: curso.modalidade.nome },
                { rotulo: t("scorm.category"), valor: curso.categoria.nome },
                { rotulo: t("scorm.infoAudience"), valor: curso.publicoAlvo || t("scorm.infoNotInformed") },
                { rotulo: t("scorm.infoFormat"), valor: t("scorm.infoFormatValue", { versao: versaoEfetiva }) },
                { rotulo: t("certification"), valor: "SESI" },
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
              {t("scorm.openStudentArea")}
            </Link>
          </aside>
        </Container>
      </section>

      <SobreCurso curso={curso} descricao={config.descricao} />
      <DepoimentosCurso curso={curso} />
      <AjudaCurso curso={curso} />
      {boletimCurso && (
        <section className="mx-auto mt-6 max-w-5xl px-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold text-[var(--sesi-black)]">Minhas notas neste curso</h2>
              <p className="text-sm text-[var(--sesi-muted)]">
                Turma {boletimCurso.turmaCodigo || "—"} · média{" "}
                <strong className="text-[var(--sesi-black)]">
                  {boletimCurso.notas.length ? boletimCurso.mediaFinal.toFixed(1) : "—"}
                </strong>
              </p>
            </div>
            {boletimCurso.notas.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--sesi-muted)]">Nenhuma nota lançada ainda.</p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--sesi-gray)]">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-[#F5F5F5] text-xs uppercase text-[var(--sesi-muted)]">
                    <tr>
                      <th className="px-4 py-2.5">Avaliação</th>
                      <th className="px-4 py-2.5">Tipo</th>
                      <th className="px-4 py-2.5">Data</th>
                      <th className="px-4 py-2.5">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boletimCurso.notas.map((nota) => (
                      <tr key={nota.id} className="border-t border-[var(--sesi-gray)]">
                        <td className="px-4 py-2.5 font-medium">{nota.titulo}</td>
                        <td className="px-4 py-2.5">{nota.tipo}</td>
                        <td className="px-4 py-2.5">{new Date(nota.data).toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-2.5">{nota.valor} / {nota.valorMaximo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      <FaixaMatricula
        nomeCurso={curso.nomeCompleto}
        onMatricular={() => setMatriculaAberta(true)}
        matriculaEmBreve={curso.status.slug === "em-breve"}
      />
      <MatriculaModal curso={curso} aberto={matriculaAberta} onFechar={() => setMatriculaAberta(false)} />
    </MainLayout>
  )
}
