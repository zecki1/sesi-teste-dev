import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { MainLayout } from "@/components/layout/main-layout"
import { Container } from "@/components/layout/container"
import { LoginModal } from "./components/login-modal"
import { useCursos, useMatriculas } from "@/hooks/use-catalogo"
import type { MatriculaDto } from "@/lib/api/catalogo"
import { imagemDoCurso } from "@/lib/ui/imagens-cursos"
import {
  atualizarPerfil,
  papelDeGestao,
  sair,
  usePerfil,
  type Idioma,
  type Matricula,
  type PerfilAluno,
} from "@/lib/auth/perfil"
import { carregarProgressoAva } from "@/features/ava/progresso-ava"
import { obterProgressoScorm } from "@/features/scorm/scorm-api"
import {
  encerrarSessaoAdministrador,
  gestaoLocalHabilitada,
  obterMarcosCurso,
  obterUsuarioGestaoPorEmail,
  type MarcoCurso,
} from "@/lib/api/gestao"

const NOMES_IDIOMAS: Record<Idioma, string> = {
  "pt-BR": "Português",
  "en-US": "English",
  "es-ES": "Español",
}

function iniciais(perfil: PerfilAluno) {
  return `${perfil.nome.charAt(0)}${perfil.sobrenome.charAt(0)}`.toUpperCase()
}

function formatarData(iso: string, idioma: string) {
  if (!iso) return "—"
  const data = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(data.getTime())) return iso
  return data.toLocaleDateString(idioma, { day: "2-digit", month: "2-digit", year: "numeric" })
}

/** Próximas terças e quintas, a partir de amanhã. */
function proximasAulas(quantidade = 4) {
  const datas: Date[] = []
  const cursor = new Date()
  cursor.setHours(19, 0, 0, 0)
  while (datas.length < quantidade) {
    cursor.setDate(cursor.getDate() + 1)
    if (cursor.getDay() === 2 || cursor.getDay() === 4) datas.push(new Date(cursor))
  }
  return datas
}

function tituloDaAula(matricula: Matricula | undefined) {
  return matricula?.proximaAula || ""
}

function matriculaDoBackend(matricula: MatriculaDto): Matricula {
  return {
    slug: matricula.curso.slug,
    progresso: matricula.progresso,
    matriculadoEm: matricula.dataMatricula.slice(0, 10),
    proximaAula: `${matricula.turma.diasSemana} · ${matricula.turma.horarioInicio}`,
    concluido: matricula.concluido,
  }
}

const DIAS_DA_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

/** Gera as próximas ocorrências das turmas matriculadas, respeitando dias e horário. */
function aulasDasMatriculas(matriculas: MatriculaDto[], limite = 8): Date[] {
  const agora = new Date()
  const aulas: Date[] = []

  for (const matricula of matriculas) {
    const [hora, minuto] = matricula.turma.horarioInicio.split(":").map(Number)
    const dias = matricula.turma.diasSemana.split(",").map((dia) => dia.trim())
    const inicio = new Date(`${matricula.turma.dataInicio}T00:00:00`)
    const cursor = new Date(Math.max(inicio.getTime(), agora.getTime()))
    cursor.setHours(hora, minuto, 0, 0)
    if (cursor < agora) cursor.setDate(cursor.getDate() + 1)

    for (let tentativa = 0; tentativa < 120 && aulas.length < limite; tentativa++) {
      if (dias.includes(DIAS_DA_SEMANA[cursor.getDay()])) aulas.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  return aulas.sort((a, b) => a.getTime() - b.getTime()).slice(0, limite)
}

function aulasNoMes(matriculas: MatriculaDto[], ano: number, mes: number): Date[] {
  const aulas: Date[] = []
  const quantidadeDias = new Date(ano, mes + 1, 0).getDate()

  for (const matricula of matriculas) {
    const [hora, minuto] = matricula.turma.horarioInicio.split(":").map(Number)
    const dias = matricula.turma.diasSemana.split(",").map((dia) => dia.trim())
    const inicio = new Date(`${matricula.turma.dataInicio}T00:00:00`)
    const fim = matricula.turma.dataFim ? new Date(`${matricula.turma.dataFim}T23:59:59`) : null

    for (let dia = 1; dia <= quantidadeDias; dia++) {
      const data = new Date(ano, mes, dia, hora, minuto)
      if (data < inicio || (fim && data > fim) || !dias.includes(DIAS_DA_SEMANA[data.getDay()])) continue
      aulas.push(data)
    }
  }

  return aulas.sort((a, b) => a.getTime() - b.getTime())
}

export function AlunoPage() {
  const { t, i18n } = useTranslation(["student", "common"])
  const perfil = usePerfil()
  const [modalAberto, setModalAberto] = useState(false)
  const [progressoScorm, setProgressoScorm] = useState<Record<string, number>>({})
  const [erroProgressoScorm, setErroProgressoScorm] = useState("")
  const [marcos, setMarcos] = useState<Record<string, MarcoCurso>>({})
  const [erroMarcos, setErroMarcos] = useState("")
  const [erroUsuario, setErroUsuario] = useState("")
  const [mesCalendario, setMesCalendario] = useState(() => new Date())
  const { data } = useCursos({ tamanho: 48 })
  const { data: matriculasApi } = useMatriculas(perfil?.email)

  const aoSair = async () => {
    if (perfil?.papel === "admin" && !gestaoLocalHabilitada) {
      try {
        await encerrarSessaoAdministrador()
      } catch (falha) {
        setErroUsuario(falha instanceof Error ? falha.message : "Não foi possível encerrar a sessão administrativa.")
        return
      }
    }
    sair()
  }

  useEffect(() => {
    if (!perfil) setModalAberto(true)
  }, [perfil])

  useEffect(() => {
    if (!gestaoLocalHabilitada || !perfil?.email) return

    let ativo = true
    setErroUsuario("")
    obterUsuarioGestaoPorEmail(perfil.email)
      .then((usuario) => {
        if (!ativo || !usuario) return
        const nomeCompleto = usuario.nome.trim()
        const [nome, ...sobrenome] = nomeCompleto.split(/\s+/)
        const papel = papelDeGestao(usuario.papel)
        if (
          nomeCompleto &&
          (perfil.nome !== nome || perfil.sobrenome !== sobrenome.join(" ") || perfil.papel !== papel)
        ) {
          atualizarPerfil({ nome, sobrenome: sobrenome.join(" "), papel })
        }
      })
      .catch((falha: unknown) => {
        if (ativo) {
          setErroUsuario(
            falha instanceof Error ? falha.message : "Não foi possível sincronizar seu perfil com a conta local.",
          )
        }
      })
    return () => {
      ativo = false
    }
  }, [perfil?.email])

  useEffect(() => {
    if (!perfil?.email) {
      setProgressoScorm({})
      return
    }

    let ativo = true
    const slugs = new Set([
      ...(perfil.matriculas ?? []).map((matricula) => matricula.slug),
      ...(matriculasApi ?? []).map((matricula) => matricula.curso.slug),
    ])

    setErroProgressoScorm("")
    Promise.all(
      Array.from(slugs, async (slug) => ({
        slug,
        percentual: (await obterProgressoScorm(slug, perfil.email))?.percentual ?? 0,
      })),
    )
      .then((resultados) => {
        if (ativo) setProgressoScorm(Object.fromEntries(resultados.map(({ slug, percentual }) => [slug, percentual])))
      })
      .catch((falha: unknown) => {
        if (ativo) {
          setErroProgressoScorm(
            falha instanceof Error ? falha.message : "Não foi possível atualizar o progresso dos cursos SCORM.",
          )
        }
      })

    return () => {
      ativo = false
    }
  }, [perfil?.email, perfil?.matriculas, matriculasApi])

  useEffect(() => {
    if (!gestaoLocalHabilitada || !perfil?.email) {
      setMarcos({})
      return
    }

    let ativo = true
    setErroMarcos("")
    obterMarcosCurso(perfil.email)
      .then((lista) => {
        if (ativo) setMarcos(Object.fromEntries(lista.map((marco) => [marco.cursoSlug, marco])))
      })
      .catch((falha: unknown) => {
        if (ativo) setErroMarcos(falha instanceof Error ? falha.message : "Não foi possível carregar as datas dos cursos.")
      })
    return () => {
      ativo = false
    }
  }, [perfil?.email])

  const cursos = data?.itens ?? []
  const porSlug = new Map(cursos.map((curso) => [curso.slug, curso]))
  const matriculas: Matricula[] = (perfil?.matriculas ?? []).map((matricula) => {
    const daApi = matriculasApi?.find((item) => item.curso.slug === matricula.slug)
    const marco = marcos[matricula.slug]
    const progressoLocal = perfil?.email
      ? carregarProgressoAva(matricula.slug, perfil.email)?.percentualMaximo ?? 0
      : 0
    const progressoDoScorm = progressoScorm[matricula.slug] ?? 0

    return daApi
      ? {
          ...matricula,
          progresso: Math.max(matricula.progresso, daApi.progresso, progressoLocal, progressoDoScorm),
          matriculadoEm: daApi.dataMatricula.slice(0, 10),
          iniciadoEm: marco?.iniciadoEm?.slice(0, 10),
          concluidoEm: marco?.concluidoEm?.slice(0, 10),
          concluido: matricula.concluido || daApi.concluido || Boolean(marco?.concluidoEm),
        }
      : {
          ...matricula,
          progresso: Math.max(matricula.progresso, progressoLocal, progressoDoScorm),
          iniciadoEm: marco?.iniciadoEm?.slice(0, 10),
          concluidoEm: marco?.concluidoEm?.slice(0, 10),
          concluido: matricula.concluido || Boolean(marco?.concluidoEm),
        }
  })

  for (const daApi of matriculasApi ?? []) {
    if (!matriculas.some((matricula) => matricula.slug === daApi.curso.slug)) {
      const nova = matriculaDoBackend(daApi)
      const marco = marcos[daApi.curso.slug]
      const progressoLocal = perfil?.email
        ? carregarProgressoAva(daApi.curso.slug, perfil.email)?.percentualMaximo ?? 0
        : 0
      nova.progresso = Math.max(nova.progresso, progressoLocal, progressoScorm[daApi.curso.slug] ?? 0)
      nova.iniciadoEm = marco?.iniciadoEm?.slice(0, 10)
      nova.concluidoEm = marco?.concluidoEm?.slice(0, 10)
      nova.concluido = nova.concluido || Boolean(marco?.concluidoEm)
      matriculas.push(nova)
    }
  }

  const emAndamento = matriculas.filter((matricula) => !matricula.concluido)
  const aulas = matriculasApi?.length ? aulasDasMatriculas(matriculasApi, 8) : proximasAulas(4)
  const diasNoMes = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + 1, 0).getDate()
  const inicioMes = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth(), 1).getDay()
  const aulasDoMes = matriculasApi?.length
    ? aulasNoMes(matriculasApi, mesCalendario.getFullYear(), mesCalendario.getMonth())
    : aulas.filter((aula) =>
        aula.getFullYear() === mesCalendario.getFullYear() && aula.getMonth() === mesCalendario.getMonth(),
      )
  const eventosMarco = matriculas.flatMap((matricula) => {
    const curso = porSlug.get(matricula.slug)
    return [
      ...(matricula.iniciadoEm ? [{ data: matricula.iniciadoEm, titulo: `Início: ${curso?.nomeBreve ?? matricula.slug}`, tipo: "início" as const }] : []),
      ...(matricula.concluidoEm ? [{ data: matricula.concluidoEm, titulo: `Conclusão: ${curso?.nomeBreve ?? matricula.slug}`, tipo: "conclusão" as const }] : []),
    ]
  })
  const eventosMarcoDoMes = eventosMarco.filter((evento) => {
    const data = new Date(`${evento.data}T00:00:00`)
    return data.getFullYear() === mesCalendario.getFullYear() && data.getMonth() === mesCalendario.getMonth()
  })
  const eventosCalendario = [
    ...aulasDoMes.map((data, indice) => ({
      data,
      titulo: tituloDaAula(emAndamento[indice % Math.max(emAndamento.length, 1)]) || t("student:calendar.nextClasses"),
      tipo: "Aula",
    })),
    ...eventosMarcoDoMes.map((evento) => ({
      data: new Date(`${evento.data}T00:00:00`),
      titulo: evento.titulo,
      tipo: evento.tipo,
    })),
  ].sort((a, b) => a.data.getTime() - b.data.getTime())
  const mesAtual = mesCalendario.toLocaleDateString(i18n.language, { month: "long", year: "numeric" })
  const alterarMesCalendario = (quantidade: number) =>
    setMesCalendario((atual) => new Date(atual.getFullYear(), atual.getMonth() + quantidade, 1))

  if (!perfil) {
    return (
      <MainLayout>
        <section className="relative overflow-hidden bg-[var(--sesi-black)] py-20 text-white sm:py-28">
          <div
            className="pointer-events-none absolute -right-24 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full opacity-20 blur-3xl"
            style={{ background: "var(--sesi-red)" }}
            aria-hidden="true"
          />
          <Container className="relative grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--sesi-beige)]">
                {t("student:areaTitle")}
              </p>
              <h1 className="font-['Open_Sans_Condensed',sans-serif] text-4xl font-bold leading-tight sm:text-5xl">
                {t("student:loginCta")}
              </h1>
              <p className="mt-4 max-w-lg text-lg text-white/75">{t("student:loginDescription")}</p>
              <button
                type="button"
                onClick={() => setModalAberto(true)}
                className="mt-8 inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)]"
              >
                {t("student:loginCta")}
                <span aria-hidden="true">→</span>
              </button>
              <p className="mt-4 text-sm text-white/50">{t("student:demoHint")}</p>
            </div>
            <ul className="grid gap-3">
              {[
                { titulo: t("student:courses.inProgress"), descricao: t("student:loginDescription"), icone: "▶" },
                { titulo: t("student:certificates.title"), descricao: t("student:certificates.empty"), icone: "★" },
                { titulo: t("student:calendar.title"), descricao: t("student:calendar.nextClasses"), icone: "▦" },
              ].map((item) => (
                <li key={item.titulo} className="flex gap-4 rounded-[var(--radius-lg)] border border-white/15 bg-white/5 p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--sesi-red)] text-sm" aria-hidden="true">
                    {item.icone}
                  </span>
                  <div>
                    <p className="font-semibold">{item.titulo}</p>
                    <p className="text-sm text-white/60">{item.descricao}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Container>
        </section>
        <LoginModal aberto={modalAberto} onFechar={() => setModalAberto(false)} onEntrou={() => setModalAberto(false)} />
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <section className="bg-[var(--sesi-black)] py-10 text-white">
        <Container className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--sesi-red)] text-xl font-bold" aria-hidden="true">
              {iniciais(perfil)}
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-[var(--sesi-beige)]">{t("student:areaTitle")}</p>
              <h1 className="text-2xl font-bold sm:text-3xl">{t("student:greeting", { nome: perfil.nome })}</h1>
              <p className="text-sm text-white/60">
                {perfil.email}
                {perfil.papel === "admin" && <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">Admin</span>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/catalogo"
              className="rounded-[var(--radius-lg)] border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-[var(--sesi-black)]"
            >
              {t("student:courses.viewCatalog")}
            </Link>
            <button
              type="button"
              onClick={() => void aoSair()}
              className="rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)]"
            >
              {t("student:logout")}
            </button>
          </div>
        </Container>
      </section>

      <section className="bg-[var(--sesi-white)] py-10">
        <Container className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {erroProgressoScorm && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 lg:col-span-2">
              {erroProgressoScorm}
            </p>
          )}
          {erroMarcos && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 lg:col-span-2">
              {erroMarcos}
            </p>
          )}
          {erroUsuario && (
            <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 lg:col-span-2">
              {erroUsuario}
            </p>
          )}
          <div className="flex flex-col gap-10">
            <section aria-labelledby="cursos-andamento">
              <div className="mb-4 flex items-center justify-between">
                <h2 id="cursos-andamento" className="text-xl font-bold text-[var(--sesi-black)]">
                  {t("student:courses.inProgress")}
                </h2>
                <span className="text-sm text-[var(--sesi-muted)]">
                  {emAndamento.length}/{matriculas.length}
                </span>
              </div>

              {emAndamento.length === 0 ? (
                <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--sesi-gray)] p-6 text-sm text-[var(--sesi-muted)]">
                  {t("student:courses.empty")}{" "}
                  <Link to="/catalogo" className="font-semibold text-[var(--sesi-red)] hover:underline">
                    {t("student:courses.viewCatalog")}
                  </Link>
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {emAndamento.map((matricula) => {
                    const curso = porSlug.get(matricula.slug)
                    return (
                      <article
                        key={matricula.slug}
                        className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white "
                      >
                        {curso && <img src={imagemDoCurso(curso)} alt="" loading="lazy" decoding="async" className="h-32 w-full object-cover" />}
                        <div className="flex flex-1 flex-col gap-3 p-4">
                          <span className="w-fit rounded-full bg-[var(--sesi-red)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--sesi-red)]">
                            {curso?.categoria.nome ?? t("student:areaTitle")}
                          </span>
                          <h3 className="font-semibold leading-snug text-[var(--sesi-black)]">
                            {curso?.nomeBreve ?? matricula.slug}
                          </h3>
                          {matricula.proximaAula && (
                            <p className="text-xs text-[var(--sesi-muted)]">
                              {t("student:courses.nextLesson", { aula: tituloDaAula(matricula) })}
                            </p>
                          )}
                          <div className="mt-auto">
                            <div className="mb-1 flex items-center justify-between text-xs text-[var(--sesi-muted)]">
                              <span>{t("student:courses.progress")}</span>
                              <span className="font-semibold text-[var(--sesi-black)]">{matricula.progresso}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--sesi-gray)]">
                              <div className="h-full rounded-full bg-[var(--sesi-red)]" style={{ width: `${matricula.progresso}%` }} />
                            </div>
                          </div>
                          <Link
                            to={`/area-do-aluno/curso/${matricula.slug}`}
                            className="mt-2 inline-flex items-center justify-center rounded-[var(--radius-lg)] bg-[var(--sesi-black)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red)]"
                          >
                            {t("student:courses.continue")}
                          </Link>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            <section aria-labelledby="matriculados">
              <h2 id="matriculados" className="mb-4 text-xl font-bold text-[var(--sesi-black)]">
                {t("student:courses.enrolled")}
              </h2>
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F5F5F5] text-xs uppercase tracking-wide text-[var(--sesi-muted)]">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        {t("student:courses.course")}
                      </th>
                      <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">
                        {t("student:courses.modality")}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">
                        {t("student:courses.progress")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {matriculas.map((matricula) => {
                      const curso = porSlug.get(matricula.slug)
                      return (
                        <tr key={matricula.slug} className="border-t border-[var(--sesi-gray)]">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-[var(--sesi-black)]">{curso?.nomeBreve ?? matricula.slug}</p>
                            <p className="text-xs text-[var(--sesi-muted)]">
                              {t("student:courses.since", { data: formatarData(matricula.matriculadoEm, i18n.language) })}
                            </p>
                            {matricula.iniciadoEm && <p className="text-xs text-[var(--sesi-muted)]">Iniciado em {formatarData(matricula.iniciadoEm, i18n.language)}</p>}
                            {matricula.concluidoEm && <p className="text-xs text-green-700">Concluído em {formatarData(matricula.concluidoEm, i18n.language)}</p>}
                          </td>
                          <td className="hidden px-4 py-3 text-[var(--sesi-muted)] sm:table-cell">
                            {curso?.modalidade.nome ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {matricula.concluido ? (
                              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                                {t("student:courses.completed")}
                              </span>
                            ) : (
                              <span className="font-semibold text-[var(--sesi-black)]">{matricula.progresso}%</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="calendario">
              <h2 id="calendario" className="mb-4 text-xl font-bold text-[var(--sesi-black)]">
                {t("student:calendar.title")}
              </h2>
              <div className="grid gap-6 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5 sm:grid-cols-[1fr_240px]">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => alterarMesCalendario(-1)}
                      aria-label="Mês anterior"
                      className="grid h-9 w-9 place-items-center rounded-full border border-[var(--sesi-gray)] text-lg hover:border-[var(--sesi-red)]"
                    >
                      ‹
                    </button>
                    <p aria-live="polite" className="text-sm font-semibold capitalize text-[var(--sesi-black)]">{mesAtual}</p>
                    <button
                      type="button"
                      onClick={() => alterarMesCalendario(1)}
                      aria-label="Próximo mês"
                      className="grid h-9 w-9 place-items-center rounded-full border border-[var(--sesi-gray)] text-lg hover:border-[var(--sesi-red)]"
                    >
                      ›
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--sesi-muted)]" aria-hidden="true">
                    {t("student:calendar.weekdays").split(",").map((dia) => (
                      <span key={dia} className="py-1 font-semibold">
                        {dia}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-sm">
                    {Array.from({ length: inicioMes }).map((_, indice) => (
                      <span key={`vazio-${indice}`} />
                    ))}
                    {Array.from({ length: diasNoMes }).map((_, indice) => {
                      const dia = indice + 1
                      const data = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth(), dia)
                      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
                      const temAula = aulas.some((aula) => {
                        const chaveAula = `${aula.getFullYear()}-${String(aula.getMonth() + 1).padStart(2, "0")}-${String(aula.getDate()).padStart(2, "0")}`
                        return chaveAula === chave
                      })
                      const marcoDia = eventosMarcoDoMes.filter((evento) => evento.data === chave)
                      const hoje = data.toDateString() === new Date().toDateString()
                      const temMarco = marcoDia.length > 0
                      return (
                        <span
                          key={chave}
                          aria-label={[
                            data.toLocaleDateString(i18n.language),
                            ...(temAula ? [t("student:calendar.nextClasses")] : []),
                            ...marcoDia.map((evento) => evento.titulo),
                          ].join(", ")}
                          className={`grid aspect-square place-items-center rounded-full text-sm ${
                            temAula || temMarco
                              ? "bg-[var(--sesi-red)] font-semibold text-white"
                              : hoje
                                ? "border border-[var(--sesi-black)] font-semibold text-[var(--sesi-black)]"
                                : "text-[var(--sesi-black)]"
                          }`}
                          title={temAula || temMarco ? [...(temAula ? [t("student:calendar.nextClasses")] : []), ...marcoDia.map((evento) => evento.titulo)].join(" · ") : undefined}
                        >
                          <span>{dia}</span>
                          {temMarco && <span className="sr-only">Curso: {marcoDia.map((evento) => evento.tipo).join(", ")}</span>}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <div className="border-t border-[var(--sesi-gray)] pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                  <p className="mb-3 text-sm font-bold text-[var(--sesi-black)]">Eventos do mês</p>
                  {eventosCalendario.length > 0 ? <ul className="flex flex-col gap-3">
                    {eventosCalendario.map((evento, indice) => {
                      return (
                        <li key={`${evento.tipo}-${evento.data.toISOString()}-${indice}`} className="flex gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-lg)] bg-[#F5F5F5] text-xs font-bold text-[var(--sesi-red)]">
                            {evento.data.getDate().toString().padStart(2, "0")}/{(evento.data.getMonth() + 1).toString().padStart(2, "0")}
                          </span>
                          <div>
                            <p className="text-sm font-semibold leading-tight text-[var(--sesi-black)]">{evento.titulo}</p>
                            <p className="text-xs text-[var(--sesi-muted)]">
                              {evento.tipo === "Aula"
                                ? evento.data.toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" })
                                : evento.tipo}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul> : <p className="text-sm text-[var(--sesi-muted)]">Nenhum evento neste mês.</p>}
                </div>
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
              <h2 className="mb-4 text-lg font-bold text-[var(--sesi-black)]">{t("student:profile.title")}</h2>
              <dl className="flex flex-col gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--sesi-muted)]">{t("student:profile.name")}</dt>
                  <dd className="font-semibold text-[var(--sesi-black)]">
                    {perfil.nome} {perfil.sobrenome}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--sesi-muted)]">{t("student:profile.email")}</dt>
                  <dd className="break-all font-medium text-[var(--sesi-black)]">{perfil.email}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--sesi-muted)]">{t("student:profile.phone")}</dt>
                  <dd className="font-medium text-[var(--sesi-black)]">{perfil.telefone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--sesi-muted)]">{t("student:profile.birthDate")}</dt>
                  <dd className="font-medium text-[var(--sesi-black)]">{formatarData(perfil.dataNascimento, i18n.language)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--sesi-muted)]">{t("student:profile.language")}</dt>
                  <dd className="font-medium text-[var(--sesi-black)]">{NOMES_IDIOMAS[perfil.idioma]}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
              <h2 className="mb-4 text-lg font-bold text-[var(--sesi-black)]">{t("student:certificates.title")}</h2>
              {perfil.certificados.length === 0 && !matriculas.some((matricula) => matricula.concluidoEm) ? (
                <p className="text-sm text-[var(--sesi-muted)]">{t("student:certificates.empty")}</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {perfil.certificados.map((certificado) => (
                    <li key={certificado.id} className="flex gap-3 border-b border-[var(--sesi-gray)] pb-4 last:border-0 last:pb-0">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--sesi-beige)] text-lg" aria-hidden="true">
                        ★
                      </span>
                      <div>
                        <p className="text-sm font-semibold leading-tight text-[var(--sesi-black)]">{certificado.curso}</p>
                        <p className="text-xs text-[var(--sesi-muted)]">
                          {t("student:certificates.hours", { count: certificado.cargaHoraria })} ·{" "}
                          {t("student:certificates.issued", { data: formatarData(certificado.concluidoEm, i18n.language) })}
                        </p>
                      </div>
                    </li>
                  ))}
                  {matriculas.filter((matricula) => matricula.concluidoEm).map((matricula) => {
                    const curso = porSlug.get(matricula.slug)
                    return (
                      <li key={`marco-${matricula.slug}`} className="flex gap-3 border-b border-[var(--sesi-gray)] pb-4 last:border-0 last:pb-0">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--sesi-beige)] text-lg" aria-hidden="true">★</span>
                        <div>
                          <p className="text-sm font-semibold leading-tight text-[var(--sesi-black)]">{curso?.nomeBreve ?? matricula.slug}</p>
                          <p className="text-xs text-[var(--sesi-muted)]">
                            {t("student:certificates.hours", { count: curso?.cargaHoraria ?? 0 })} · {t("student:certificates.issued", { data: formatarData(matricula.concluidoEm ?? "", i18n.language) })}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-[#F5F5F5] p-5">
              <h2 className="text-lg font-bold text-[var(--sesi-black)]">{t("student:accessibility.title")}</h2>
              <p className="mt-1 text-sm text-[var(--sesi-muted)]">{t("student:accessibility.description")}</p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("sesi:abrir-acessibilidade"))}
                className="mt-4 w-full rounded-[var(--radius-lg)] bg-[var(--sesi-black)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red)]"
              >
                {t("student:accessibility.open")}
              </button>
            </section>

            {perfil.papel === "admin" && (
              <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-red)] bg-[var(--sesi-red)]/5 p-5">
                <h2 className="text-lg font-bold text-[var(--sesi-black)]">{t("student:admin.title")}</h2>
                <p className="mt-1 text-sm text-[var(--sesi-muted)]">{t("student:admin.description")}</p>
                <Link
                  to="/admin/cursos"
                  className="mt-4 block w-full rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)]"
                >
                  {t("student:admin.open")}
                </Link>
                <Link
                  to="/admin/gestao"
                  className="mt-2 block w-full rounded-[var(--radius-lg)] border border-[var(--sesi-red)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--sesi-red)] transition hover:bg-[var(--sesi-red)] hover:text-white"
                >
                  Usuários, permissões e chamados
                </Link>
              </section>
            )}
          </aside>
        </Container>
      </section>

      <LoginModal aberto={modalAberto} onFechar={() => setModalAberto(false)} onEntrou={() => setModalAberto(false)} />
    </MainLayout>
  )
}
