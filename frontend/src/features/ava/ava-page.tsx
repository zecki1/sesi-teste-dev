import { useEffect, useRef, useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useCurso } from "@/hooks/use-catalogo"
import { usePerfil } from "@/lib/auth/perfil"
import { useScormAcessibilidade } from "@/features/scorm/use-scorm-acessibilidade"
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock"
import { API_URL, type CursoDetalheDto, type ModuloDto } from "@/lib/api/catalogo"
import { Container } from "@/components/layout/container"
import { SesiMark } from "@/components/layout/footer"
import bannerAva from "@/assets/case/banner-ava.png"
import logoWhite from "@/assets/logo-sesi-industria-white.svg"
import { calcularPercentualAva, carregarProgressoAva, salvarProgressoAva } from "./progresso-ava"
import {
  obterPacoteScorm,
  obterProgressoScorm,
  reiniciarProgressoScorm,
  urlPlayerScorm,
  type PacoteScormDto,
  type ProgressoScormDto,
} from "@/features/scorm/scorm-api"
import { registrarMarcoCurso } from "@/lib/api/gestao"

const SLUG_PADRAO = "matematica-para-a-precisao-medidas-e-escalas-na-metalurgia"
const TOTAL_ITENS_AVA = 9

type ItemAva = {
  id: string
  numero: string
  titulo: string
  tipo: "introducao" | "modulo"
  modulo?: ModuloDto
}

const ITENS_INTRODUCAO: ItemAva[] = [
  { id: "introducao", numero: "1.1", titulo: "Introdução", tipo: "introducao" },
  { id: "boas-praticas", numero: "1.2", titulo: "Boas práticas", tipo: "introducao" },
  { id: "extras", numero: "1.3", titulo: "Extras", tipo: "introducao" },
]

const TEXTO_INTRODUCAO = [
  "Bem-vindo ao Ambiente Virtual do Aluno. Este curso foi organizado para que você avance de forma gradual, com aulas objetivas, materiais de apoio e atividades de fixação.",
  "Use o menu ao lado para navegar entre a introdução e os módulos. O progresso é atualizado conforme você avança pelos conteúdos.",
]

const TEXTO_BOAS_PRATICAS = [
  "Se você está interessado em se aprofundar em Matemática para a Precisão, especialmente em Medidas e Escalas na Metalurgia, aqui estão algumas dicas para maximizar sua experiência online. Primeiro, crie um espaço de estudo livre de distrações, onde você possa se concentrar totalmente no material.",
  "Estabeleça uma rotina de estudos, reservando horários específicos para assistir às aulas e realizar as atividades. Além disso, interaja com seus colegas e instrutores nos fóruns e chats disponíveis, pois isso enriquece o aprendizado e ajuda a esclarecer dúvidas. Não se esqueça de revisar o conteúdo regularmente e aplicar os conhecimentos em situações práticas sempre que possível.",
  "Por fim, mantenha-se atualizado sobre as novas técnicas e normas em medidas e escalas na metalurgia, já que essa área está sempre evoluindo. Com dedicação e as estratégias corretas, você estará preparado para se destacar no setor!",
]

const TEXTO_RECOMENDACOES = [
  "Se você está interessado em se aprofundar na matemática aplicada à metalurgia, aqui estão algumas dicas valiosas. Primeiro, escolha um curso que ofereça uma abordagem prática, com aulas que incluam exercícios e estudos de caso. Isso ajudará a entender como aplicar medidas e escalas na prática. Além disso, verifique se o curso é reconhecido por instituições relevantes, pois isso pode impactar sua formação e carreira.",
  "Outro aspecto importante é a experiência dos instrutores. Procure cursos que tenham profissionais com experiência no setor, pois eles podem compartilhar insights valiosos que vão além da teoria.",
  "Considere também a carga horária e a flexibilidade do curso. Se você trabalha, um curso que ofereça aulas noturnas ou aos finais de semana pode ser mais conveniente.",
  "Por fim, não se esqueça de se conectar com outros alunos e profissionais da área. Isso pode abrir portas e proporcionar um aprendizado ainda mais enriquecedor. Investir em um bom curso de matemática para a metalurgia é essencial para garantir precisão e eficiência no trabalho.",
]

const TEXTO_EXTRAS = [
  "Este espaço reúne materiais complementares, links de apoio e orientações para aprofundar os temas estudados.",
  "Consulte também os fóruns e os canais de atendimento da equipe pedagógica sempre que precisar.",
]

function textosBoasPraticas(curso?: CursoDetalheDto) {
  if (!curso || curso.slug === SLUG_PADRAO) return TEXTO_BOAS_PRATICAS

  return [
    `Se você está interessado em se aprofundar em ${curso.nomeCompleto}, aqui estão algumas dicas para maximizar sua experiência online. Primeiro, crie um espaço de estudo livre de distrações, onde você possa se concentrar totalmente no material.`,
    TEXTO_BOAS_PRATICAS[1],
    "Por fim, mantenha-se atualizado sobre as novas técnicas e normas da sua área, já que ela está sempre evoluindo. Com dedicação e as estratégias corretas, você estará preparado para se destacar no setor!",
  ]
}

function textosRecomendacoes(curso?: CursoDetalheDto) {
  if (!curso || curso.slug === SLUG_PADRAO) return TEXTO_RECOMENDACOES

  return [
    `Se você está interessado em se aprofundar em ${curso.nomeCompleto}, aqui estão algumas dicas valiosas. Primeiro, escolha um curso que ofereça uma abordagem prática, com aulas que incluam exercícios e estudos de caso. Isso ajudará a entender como aplicar os conceitos na prática. Além disso, verifique se o curso é reconhecido por instituições relevantes, pois isso pode impactar sua formação e carreira.`,
    TEXTO_RECOMENDACOES[1],
    TEXTO_RECOMENDACOES[2],
    `Por fim, não se esqueça de se conectar com outros alunos e profissionais da área. Isso pode abrir portas e proporcionar um aprendizado ainda mais enriquecedor. Investir em um bom curso de ${curso.nomeCompleto} é essencial para garantir precisão e eficiência no trabalho.`,
  ]
}

type StatusAva = "ativo" | "visitado" | "nao-visitado"

function IconeStatus({ status }: { status: StatusAva }) {
  if (status === "nao-visitado") {
    return (
      <span
        data-status={status}
        aria-hidden="true"
        className="h-4 w-4 shrink-0 rounded-full border border-[var(--sesi-muted)]"
      />
    )
  }

  return (
    <span
      data-status={status}
      aria-hidden="true"
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--sesi-black)] text-white"
    >
      {status === "visitado" ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
          <path
            d="m5 12 4 4L19 6"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5 translate-x-px">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </span>
  )
}

function ItemNavegacao({
  item,
  ativo,
  visitado,
  onSelect,
}: {
  item: ItemAva
  ativo: boolean
  visitado: boolean
  onSelect: () => void
}) {
  const rotulo = item.tipo === "introducao" ? `${item.numero} ${item.titulo}` : `${item.numero}. ${item.titulo}`
  const status: StatusAva = ativo ? "ativo" : visitado ? "visitado" : "nao-visitado"

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={ativo ? "page" : undefined}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
          ativo
            ? "bg-[var(--sesi-beige)] font-semibold text-[var(--sesi-black)]"
            : "text-[var(--sesi-muted)] hover:bg-[var(--sesi-gray)] hover:text-[var(--sesi-black)]"
        }`}
      >
        <IconeStatus status={status} />
        {rotulo}
      </button>
    </li>
  )
}

export function AvaPage() {
  const { slug = SLUG_PADRAO } = useParams()
  const { t } = useTranslation("ava")
  const perfil = usePerfil()
  const { data: curso } = useCurso(slug)
  const [busca, setBusca] = useState("")
  const [itemAtivo, setItemAtivo] = useState("boas-praticas")
  const [visitados, setVisitados] = useState<Set<string>>(() => new Set())
  const [percentualMaximo, setPercentualMaximo] = useState(0)
  const [mostrarRetomada, setMostrarRetomada] = useState(false)
  const [pacoteScorm, setPacoteScorm] = useState<PacoteScormDto | null>(null)
  const [progressoScorm, setProgressoScorm] = useState<ProgressoScormDto | null>(null)
  const [scormResolvido, setScormResolvido] = useState(false)
  const [erroScorm, setErroScorm] = useState("")
  const [reiniciandoScorm, setReiniciandoScorm] = useState(false)
  const [playerScormAtivo, setPlayerScormAtivo] = useState(true)
  const [versaoPlayerScorm, setVersaoPlayerScorm] = useState(0)
  const retomadaAvaliada = useRef<string | null>(null)
  const conclusaoRegistrada = useRef(false)
  useBodyScrollLock(mostrarRetomada)
  useScormAcessibilidade(
    Boolean(pacoteScorm && scormResolvido && playerScormAtivo),
    `${pacoteScorm?.id ?? ""}:${versaoPlayerScorm}`,
  )

  useEffect(() => {
    conclusaoRegistrada.current = false
  }, [slug, perfil?.email])

  useEffect(() => {
    if (!perfil?.email || !slug) return
    registrarMarcoCurso(slug, perfil.email, "inicio").catch((falha: unknown) => {
      setErroScorm(falha instanceof Error ? falha.message : "Não foi possível registrar o início do curso.")
    })
  }, [slug, perfil?.email])

  useEffect(() => {
    const statusConcluido = ["completed", "passed", "complete"].includes(
      (progressoScorm?.lessonStatus ?? "").toLowerCase(),
    )
    if (
      !perfil?.email ||
      !slug ||
      conclusaoRegistrada.current ||
      (pacoteScorm ? (progressoScorm?.percentual ?? 0) < 100 && !statusConcluido : percentualMaximo < 100)
    ) return

    conclusaoRegistrada.current = true
    const percentual = pacoteScorm ? progressoScorm?.percentual ?? 0 : percentualMaximo

    const dispararCelebracao = (concluidoEm: string) => {
      const chaveAviso = `sesi.certificado.mostrado.${slug}::${perfil.email.toLowerCase()}`
      if (window.localStorage.getItem(chaveAviso)) return
      window.localStorage.setItem(chaveAviso, "1")
      window.dispatchEvent(new CustomEvent("sesi:curso-concluido", {
        detail: {
          slug,
          titulo: curso?.nomeCompleto ?? curso?.nomeBreve ?? slug,
          aluno: `${perfil.nome} ${perfil.sobrenome}`.trim(),
          concluidoEm,
        },
      }))
    }

    registrarMarcoCurso(slug, perfil.email, "conclusao", percentual)
      .then((marco) => {
        dispararCelebracao(marco.concluidoEm || new Date().toISOString())
      })
      .catch((falha: unknown) => {
        setErroScorm(falha instanceof Error ? falha.message : "Não foi possível registrar a conclusão do curso.")
        dispararCelebracao(new Date().toISOString())
      })
  }, [slug, perfil?.email, perfil?.nome, perfil?.sobrenome, pacoteScorm, progressoScorm?.percentual, progressoScorm?.lessonStatus, percentualMaximo, curso?.nomeCompleto, curso?.nomeBreve])

  useEffect(() => {
    if (!slug) return
    let ativo = true

    setScormResolvido(false)
    setPacoteScorm(null)
    setProgressoScorm(null)
    setErroScorm("")

    obterPacoteScorm(slug)
      .then(async (pacote) => {
        if (!ativo) return
        setPacoteScorm(pacote)
        if (!pacote || !perfil?.email) return

        const salvo = await obterProgressoScorm(slug, perfil.email)
        if (!ativo) return
        setProgressoScorm(salvo)

        const temCheckpoint = Boolean(
          salvo &&
            (salvo.suspendData ||
              salvo.lessonLocation ||
              salvo.lessonStatus ||
              salvo.cmiDataJson ||
              salvo.percentual > 0),
        )
        const chaveAtual = `${slug}::${perfil.email}`
        if (retomadaAvaliada.current !== chaveAtual) {
          retomadaAvaliada.current = chaveAtual
          setMostrarRetomada(temCheckpoint)
        }
      })
      .catch((falha: unknown) => {
        if (ativo) {
          setErroScorm(falha instanceof Error ? falha.message : "Não foi possível carregar o curso SCORM.")
        }
      })
      .finally(() => {
        if (ativo) setScormResolvido(true)
      })

    return () => {
      ativo = false
    }
  }, [slug, perfil?.email])

  useEffect(() => {
    if (!perfil?.email || !slug || !scormResolvido || pacoteScorm || erroScorm) return

    const salvo = carregarProgressoAva(slug, perfil.email)
    const iniciais = new Set(salvo?.visitados ?? [])
    const itemInicial = salvo?.ultimo || "boas-praticas"
    iniciais.add(itemInicial)

    const percentual = calcularPercentualAva(TOTAL_ITENS_AVA, iniciais, salvo?.percentualMaximo ?? 0)
    setVisitados(iniciais)
    setPercentualMaximo(percentual)
    setItemAtivo(itemInicial)

    // O StrictMode executa o efeito duas vezes; a avaliação da retomada
    // precisa acontecer apenas na primeira, antes de salvar o progresso atual.
    const chaveAtual = `${slug}::${perfil.email}`
    if (retomadaAvaliada.current !== chaveAtual) {
      retomadaAvaliada.current = chaveAtual
      setMostrarRetomada(Boolean(salvo && salvo.visitados.length > 0))
    }

    salvarProgressoAva(slug, perfil.email, {
      visitados: [...iniciais],
      ultimo: itemInicial,
      percentualMaximo: percentual,
    })
  }, [slug, perfil?.email, scormResolvido, pacoteScorm, erroScorm])

  useEffect(() => {
    if (!pacoteScorm) return
    const origemApi = new URL(API_URL).origin

    const aoReceberMensagem = (evento: MessageEvent) => {
      if (evento.origin !== origemApi) return
      const mensagem = evento.data as
        | { type?: string; cursoSlug?: string; dados?: { percentual?: number; lessonStatus?: string } }
        | null
      if (
        !mensagem ||
        typeof mensagem !== "object" ||
        mensagem.cursoSlug !== slug ||
        !String(mensagem.type).startsWith("SCORM_")
      ) {
        return
      }

      const dados = mensagem.dados
      const percentualScorm = dados?.percentual
      const statusScorm = dados?.lessonStatus
      if (typeof percentualScorm === "number") {
        setProgressoScorm((atual) => ({
          cursoSlug: slug,
          usuarioId: perfil?.email ?? "anonimo",
          suspendData: atual?.suspendData,
          lessonStatus: statusScorm ?? atual?.lessonStatus,
          lessonLocation: atual?.lessonLocation,
          score: atual?.score,
          percentual: Math.max(atual?.percentual ?? 0, Math.round(percentualScorm)),
          cmiDataJson: atual?.cmiDataJson,
          atualizadoEm: new Date().toISOString(),
        }))
      }
    }

    window.addEventListener("message", aoReceberMensagem)
    return () => window.removeEventListener("message", aoReceberMensagem)
  }, [pacoteScorm, slug, perfil?.email])

  useEffect(() => {
    if (!reiniciandoScorm || playerScormAtivo || !pacoteScorm || !perfil?.email) return
    let ativo = true

    reiniciarProgressoScorm(slug, perfil.email)
      .then((reiniciado) => {
        if (!ativo) return
        setProgressoScorm(reiniciado)
        setVersaoPlayerScorm((versao) => versao + 1)
        setMostrarRetomada(false)
      })
      .catch((falha: unknown) => {
        if (ativo) {
          setErroScorm(falha instanceof Error ? falha.message : "Não foi possível reiniciar o conteúdo SCORM.")
        }
      })
      .finally(() => {
        if (ativo) {
          setPlayerScormAtivo(true)
          setReiniciandoScorm(false)
        }
      })

    return () => {
      ativo = false
    }
  }, [reiniciandoScorm, playerScormAtivo, pacoteScorm, perfil?.email, slug])

  if (!perfil) return <Navigate to="/area-do-aluno" replace />

  const itensModulos: ItemAva[] = Array.from({ length: 6 }, (_, indice) => ({
    id: `modulo-${indice + 1}`,
    numero: String(indice + 2),
    titulo: `${t("module")} ${indice + 1}`,
    tipo: "modulo",
    modulo: curso?.modulos[indice],
  }))
  const itens = [...ITENS_INTRODUCAO, ...itensModulos]
  const boasPraticas = textosBoasPraticas(curso)
  const recomendacoes = textosRecomendacoes(curso)
  const itemSelecionado = itens.find((item) => item.id === itemAtivo) ?? ITENS_INTRODUCAO[1]
  const progresso = pacoteScorm ? Math.round(progressoScorm?.percentual ?? 0) : percentualMaximo
  const buscaNormalizada = busca.trim().toLowerCase()
  const itensFiltrados = itens.filter((item) =>
    `${item.numero} ${item.titulo}`.toLowerCase().includes(buscaNormalizada),
  )
  const itensIntroducaoFiltrados = itensFiltrados.filter((item) => item.tipo === "introducao")
  const itensModulosFiltrados = itensFiltrados.filter((item) => item.tipo === "modulo")

  const selecionarItem = (id: string) => {
    const proximos = new Set(visitados)
    proximos.add(itemAtivo)
    proximos.add(id)

    const percentual = calcularPercentualAva(itens.length, proximos, percentualMaximo)
    setVisitados(proximos)
    setPercentualMaximo(percentual)
    setItemAtivo(id)

    if (perfil.email) {
      salvarProgressoAva(slug, perfil.email, {
        visitados: [...proximos],
        ultimo: id,
        percentualMaximo: percentual,
      })
    }
  }

  const continuarDeOndeParei = () => setMostrarRetomada(false)
  const comecarDoInicio = () => {
    if (pacoteScorm && perfil.email) {
      setReiniciandoScorm(true)
      setErroScorm("")
      setPlayerScormAtivo(false)
      return
    }

    selecionarItem("introducao")
    setMostrarRetomada(false)
  }

  const modoScorm = Boolean(pacoteScorm)

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--sesi-white)] lg:grid-cols-12">
      {mostrarRetomada && (
        <div
          data-modal-retomada
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-retomada"
          data-lenis-prevent
        >
          <div className="w-full max-w-md rounded-[var(--radius-lg)] bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sesi-muted)]">Sua jornada</p>
            <h2 id="titulo-retomada" className="mt-2 font-['Open_Sans_Condensed',sans-serif] text-2xl font-bold text-[var(--sesi-black)]">
              Continuar de onde parei?
            </h2>
            <p className="mt-2 text-sm text-[var(--sesi-muted)]">
              {pacoteScorm
                ? `Seu progresso máximo é ${progresso}%. Você pode retomar o checkpoint salvo ou reiniciar o conteúdo sem apagar esse progresso.`
                : `Você já visitou ${visitados.size} de ${itens.length} conteúdos deste curso. Retome do último ponto ou volte ao início sem perder o progresso.`}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={continuarDeOndeParei}
                disabled={reiniciandoScorm}
                className="flex-1 rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)]"
              >
                Continuar de onde parei
              </button>
              <button
                type="button"
                onClick={comecarDoInicio}
                disabled={reiniciandoScorm}
                className="flex-1 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] px-4 py-2.5 text-sm font-semibold text-[var(--sesi-black)] transition hover:bg-[var(--sesi-gray)]"
              >
                {reiniciandoScorm ? "Reiniciando..." : "Começar do início"}
              </button>
            </div>
            {erroScorm && (
              <p role="alert" className="mt-3 text-sm font-medium text-[var(--sesi-red)]">
                {erroScorm}
              </p>
            )}
          </div>
        </div>
      )}

      {!modoScorm && (
      <aside className="flex flex-col border-r border-[var(--sesi-gray)] lg:sticky lg:top-0 lg:col-span-2 lg:h-screen lg:overflow-y-auto">
        <div className="bg-[var(--sesi-black)] px-5 py-6 text-white">
          <SesiMark />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Certificação</p>
          <h1 className="mt-1 text-base font-semibold leading-snug">{curso?.nomeCompleto ?? "Curso"}</h1>
          <hr className="my-4 border-white/20" />
          <div className="flex items-center gap-3" data-progresso>
            <span className="shrink-0 text-xs font-semibold text-white" aria-live="polite">
              {progresso}%
            </span>
            <div
              role="progressbar"
              aria-label={t("progress")}
              aria-valuenow={progresso}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20"
            >
              <div
                data-progresso-barra
                className="h-full rounded-full bg-white transition-[width] duration-300"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col bg-white px-4 py-5">
          {pacoteScorm ? (
            <p className="rounded-lg bg-[var(--sesi-gray)] px-3 py-3 text-sm leading-relaxed text-[var(--sesi-muted)]">
              Navegue pelos módulos e atividades no conteúdo SCORM ao lado.
            </p>
          ) : (
            <>
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sesi-muted)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                  placeholder={t("searchLessons")}
                  aria-label={t("searchLessons")}
                  className="w-full rounded-lg border border-[var(--sesi-gray)] bg-white py-2 pl-9 pr-3 text-sm text-[var(--sesi-black)] placeholder:text-[var(--sesi-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sesi-black)]"
                />
              </div>

              <nav className="mt-5" aria-label={t("title")}>
                {buscaNormalizada ? (
                  itensFiltrados.length > 0 ? (
                    <ul className="flex flex-col gap-1">
                      {itensFiltrados.map((item) => (
                        <ItemNavegacao
                          key={item.id}
                          item={item}
                          ativo={itemSelecionado.id === item.id}
                          visitado={visitados.has(item.id)}
                          onSelect={() => selecionarItem(item.id)}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3 text-sm text-[var(--sesi-muted)]">Nenhum item encontrado.</p>
                  )
                ) : (
                  <>
                    <p className="px-3 text-sm font-bold text-[var(--sesi-black)]">1. Introdução</p>
                    <ul className="mt-1 flex flex-col gap-1">
                      {itensIntroducaoFiltrados.map((item) => (
                        <ItemNavegacao
                          key={item.id}
                          item={item}
                          ativo={itemSelecionado.id === item.id}
                          visitado={visitados.has(item.id)}
                          onSelect={() => selecionarItem(item.id)}
                        />
                      ))}
                    </ul>
                    <ul className="mt-3 flex flex-col gap-1">
                      {itensModulosFiltrados.map((item) => (
                        <ItemNavegacao
                          key={item.id}
                          item={item}
                          ativo={itemSelecionado.id === item.id}
                          visitado={visitados.has(item.id)}
                          onSelect={() => selecionarItem(item.id)}
                        />
                      ))}
                    </ul>
                  </>
                )}
              </nav>
            </>
          )}

          <Link
            to="/area-do-aluno"
            className="mt-auto pt-6 text-xs font-semibold text-[var(--sesi-muted)] underline-offset-4 transition hover:text-[var(--sesi-black)] hover:underline"
          >
            ← {t("backToArea")}
          </Link>
        </div>
      </aside>
      )}

      <main className={modoScorm ? "lg:col-span-12" : "lg:col-span-10"}>
        <Container className="py-6 lg:py-8">
          {pacoteScorm ? (
            <>
              <Link
                to="/area-do-aluno"
                className="mb-5 inline-flex text-xs font-semibold text-[var(--sesi-muted)] underline-offset-4 transition hover:text-[var(--sesi-black)] hover:underline"
              >
                ← {t("backToArea")}
              </Link>
              <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--sesi-gray)] px-4 py-3">
                  <div>
                    <h2 className="font-semibold text-[var(--sesi-black)]">Conteúdo original do curso</h2>
                    <p className="mt-1 text-xs text-[var(--sesi-muted)]">SCORM {pacoteScorm.versao} · Seu progresso é salvo automaticamente.</p>
                  </div>
                  <strong className="text-sm text-[var(--sesi-black)]">{progresso}% concluído</strong>
                </div>
                {erroScorm && (
                  <p role="alert" className="border-b border-[var(--sesi-gray)] px-4 py-3 text-sm text-[var(--sesi-red)]">
                    {erroScorm}
                  </p>
                )}
                {!scormResolvido || !playerScormAtivo ? (
                  <div className="grid min-h-[420px] place-items-center text-sm text-[var(--sesi-muted)]">
                    {reiniciandoScorm ? "Reiniciando o conteúdo SCORM..." : "Carregando o conteúdo SCORM..."}
                  </div>
                ) : (
                  <iframe
                    key={versaoPlayerScorm}
                    data-player-scorm
                    src={urlPlayerScorm(pacoteScorm, perfil.email)}
                    title={`Conteúdo SCORM do curso ${curso?.nomeBreve ?? "do aluno"}`}
                    className="h-[70vh] min-h-[420px] w-full border-0"
                    allow="fullscreen"
                  />
                )}
              </section>
            </>
          ) : erroScorm ? (
            <div role="alert" className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 p-6 text-sm text-red-800">
              Não foi possível verificar se este curso tem conteúdo SCORM. {erroScorm}
            </div>
          ) : !scormResolvido ? (
            <div className="grid min-h-[320px] place-items-center text-sm text-[var(--sesi-muted)]">
              Verificando conteúdo do curso...
            </div>
          ) : (
            <>
              <div data-banner-ava className="relative overflow-hidden rounded-lg">
                <img src={bannerAva} alt="" className="h-[140px] w-full object-cover sm:h-[220px] lg:h-[320px]" />
                <img
                  src={logoWhite}
                  alt="SESI Indústria"
                  className="absolute left-4 top-4 z-10 h-8 w-auto drop-shadow-md sm:left-6 sm:top-6 sm:h-10"
                />
              </div>

              <article data-ava-texto className="mt-8 w-full">
            {itemSelecionado.id === "boas-praticas" ? (
              <>
                <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">Boas práticas</h2>
                {boasPraticas.map((paragrafo) => (
                  <p key={paragrafo} className="mt-4 text-base leading-relaxed text-[var(--sesi-muted)]">
                    {paragrafo}
                  </p>
                ))}
                <h2 className="mt-8 font-['Open_Sans_Condensed',sans-serif] text-2xl font-bold sm:text-3xl">
                  {t("recommendations")}
                </h2>
                {recomendacoes.map((paragrafo) => (
                  <p key={paragrafo} className="mt-4 text-base leading-relaxed text-[var(--sesi-muted)]">
                    {paragrafo}
                  </p>
                ))}
              </>
            ) : itemSelecionado.tipo === "modulo" ? (
              <>
                <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">
                  {itemSelecionado.titulo}
                </h2>
                {itemSelecionado.modulo ? (
                  <>
                    <p className="mt-2 text-lg font-semibold text-[var(--sesi-black)]">{itemSelecionado.modulo.titulo}</p>
                    <p className="mt-4 text-base leading-relaxed text-[var(--sesi-muted)]">
                      {itemSelecionado.modulo.descricao}
                    </p>
                    {itemSelecionado.modulo.aulas.length > 0 && (
                      <>
                        <h3 className="mt-6 text-lg font-semibold text-[var(--sesi-black)]">Aulas deste módulo</h3>
                        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-base text-[var(--sesi-muted)]">
                          {itemSelecionado.modulo.aulas.map((aula) => (
                            <li key={aula.id}>{aula.titulo}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                ) : (
                  <p className="mt-4 text-base leading-relaxed text-[var(--sesi-muted)]">
                    Este módulo faz parte da trilha do curso e terá seu conteúdo detalhado em breve. Use este espaço
                    para acompanhar os próximos temas.
                  </p>
                )}
              </>
            ) : (
              <>
                <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">
                  {itemSelecionado.titulo}
                </h2>
                {(itemSelecionado.id === "introducao" ? TEXTO_INTRODUCAO : TEXTO_EXTRAS).map((paragrafo) => (
                  <p key={paragrafo} className="mt-4 text-base leading-relaxed text-[var(--sesi-muted)]">
                    {paragrafo}
                  </p>
                ))}
              </>
            )}
              </article>
            </>
          )}
        </Container>
      </main>
    </div>
  )
}
