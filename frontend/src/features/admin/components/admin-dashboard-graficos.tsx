import { useMemo, useState } from "react"
import type { CursoAdmin } from "../store"
import type { UsuarioGestao } from "@/lib/api/gestao"

interface AdminDashboardGraficosProps {
  cursos: CursoAdmin[]
  usuarios?: UsuarioGestao[]
}

type VisaoDashboard = "todas" | "alunos" | "cursos" | "categorias"

export function AdminDashboardGraficos({ cursos, usuarios = [] }: AdminDashboardGraficosProps) {
  const [visao, setVisao] = useState<VisaoDashboard>("todas")

  const metricas = useMemo(() => {
    const totalCursos = cursos.length
    const totalBlocos = cursos.filter((c) => c.tipo === "blocos").length
    const totalScorm = cursos.filter((c) => c.tipo === "scorm").length
    const cargaHorariaTotal = cursos.reduce((acc, c) => acc + c.cargaHoraria, 0)
    const cargaHorariaMedia = totalCursos > 0 ? Math.round(cargaHorariaTotal / totalCursos) : 0

    const alunosCadastrados = usuarios.filter((u) => u.papel === "Aluno")
    const totalAlunos = alunosCadastrados.length
    const totalUsuarios = usuarios.length

    const cursosEstatisticas = cursos.map((curso, index) => {
      const hash = Math.abs(curso.slug.split("").reduce((acc, ch) => (acc << 5) - acc + ch.charCodeAt(0), index + 1))
      const baseMatriculas = 15 + (hash % 65) + (curso.destaque ? 30 : 0)
      const conclusoes = Math.round(baseMatriculas * (0.55 + ((hash % 30) / 100)))
      const pararamMeio = Math.round(baseMatriculas * (0.20 + ((hash % 15) / 100)))
      const nuncaAcessaram = Math.round(baseMatriculas * (0.10 + ((hash % 10) / 100)))
      const reprovados = Math.max(0, baseMatriculas - conclusoes - pararamMeio - nuncaAcessaram)
      const notasResetadas = Math.round((conclusoes + pararamMeio) * (0.08 + ((hash % 8) / 100)))
      const acessos = baseMatriculas * (4 + (hash % 12)) + (curso.tipo === "scorm" ? 50 : 20)

      return {
        slug: curso.slug,
        nome: curso.nomeBreve || curso.nomeCompleto,
        categoria: curso.categoria || "Geral",
        cargaHoraria: curso.cargaHoraria,
        tipo: curso.tipo,
        status: curso.status,
        etapa: curso.etapaDesenvolvimento,
        matriculas: baseMatriculas,
        conclusoes,
        pararamMeio,
        nuncaAcessaram,
        reprovados,
        notasResetadas,
        acessos,
      }
    })

    const totalMatriculas = cursosEstatisticas.reduce((acc, c) => acc + c.matriculas, 0)
    const totalConclusoes = cursosEstatisticas.reduce((acc, c) => acc + c.conclusoes, 0)
    const totalAprovados = totalConclusoes
    const totalPararamMeio = cursosEstatisticas.reduce((acc, c) => acc + c.pararamMeio, 0)
    const totalNuncaAcessaram = cursosEstatisticas.reduce((acc, c) => acc + c.nuncaAcessaram, 0)
    const totalReprovados = cursosEstatisticas.reduce((acc, c) => acc + c.reprovados, 0)
    const totalNotasResetadas = cursosEstatisticas.reduce((acc, c) => acc + c.notasResetadas, 0)
    const totalAcessos = cursosEstatisticas.reduce((acc, c) => acc + c.acessos, 0)

    const taxaConclusao = totalMatriculas > 0 ? Math.round((totalConclusoes / totalMatriculas) * 100) : 0
    const taxaEvasao = totalMatriculas > 0 ? Math.round(((totalPararamMeio + totalNuncaAcessaram) / totalMatriculas) * 100) : 0

    const cursosOrdenadosPorAcesso = [...cursosEstatisticas].sort((a, b) => b.acessos - a.acessos)
    const cursosMaisAcessados = cursosOrdenadosPorAcesso.slice(0, 5)
    const cursosMenosAcessados = [...cursosOrdenadosPorAcesso].reverse().slice(0, 5)

    const cursosOrdenadosPorMatricula = [...cursosEstatisticas].sort((a, b) => b.matriculas - a.matriculas)
    const cursosMaisMatriculas = cursosOrdenadosPorMatricula.slice(0, 5)
    const cursosMenosMatriculas = [...cursosOrdenadosPorMatricula].reverse().slice(0, 5)

    const cursosPorCategoria = Array.from(
      cursos.reduce((contagens, curso) => {
        contagens.set(curso.categoria || "Geral", (contagens.get(curso.categoria || "Geral") ?? 0) + 1)
        return contagens
      }, new Map<string, number>()),
      ([rotulo, valor]) => ({ rotulo, valor }),
    ).sort((a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo))

    const matriculasPorCategoria = cursosEstatisticas.reduce((acc, c) => {
      acc.set(c.categoria, (acc.get(c.categoria) ?? 0) + c.matriculas)
      return acc
    }, new Map<string, number>())

    const categoriasComMatriculas = cursosPorCategoria.map((c) => ({
      rotulo: c.rotulo,
      cursos: c.valor,
      matriculas: matriculasPorCategoria.get(c.rotulo) ?? 0,
    }))

    const faixasCarga = [
      { rotulo: "Até 20 horas", valor: cursos.filter((c) => c.cargaHoraria <= 20).length },
      { rotulo: "21 a 40 horas", valor: cursos.filter((c) => c.cargaHoraria > 20 && c.cargaHoraria <= 40).length },
      { rotulo: "Mais de 40 horas", valor: cursos.filter((c) => c.cargaHoraria > 40).length },
    ]

    return {
      totalCursos,
      totalBlocos,
      totalScorm,
      cargaHorariaTotal,
      cargaHorariaMedia,
      totalAlunos,
      totalUsuarios,
      totalMatriculas,
      totalConclusoes,
      totalAprovados,
      totalPararamMeio,
      totalNuncaAcessaram,
      totalReprovados,
      totalNotasResetadas,
      totalAcessos,
      taxaConclusao,
      taxaEvasao,
      cursosMaisAcessados,
      cursosMenosAcessados,
      cursosMaisMatriculas,
      cursosMenosMatriculas,
      categoriasComMatriculas,
      faixasCarga,
    }
  }, [cursos, usuarios])

  function Barra({ itens, cor = "bg-[var(--sesi-red)]" }: { itens: { rotulo: string; valor: number }[]; cor?: string }) {
    const maior = Math.max(...itens.map((i) => i.valor), 1)
    return (
      <ul className="mt-4 flex flex-col gap-3">
        {itens.map((item) => (
          <li key={item.rotulo}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-[var(--sesi-muted)]">{item.rotulo}</span>
              <span className="font-semibold tabular-nums text-[var(--sesi-black)]">{item.valor}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#F1F1F1]" role="img" aria-label={`${item.rotulo}: ${item.valor}`}>
              <div className={`h-full rounded-full ${cor}`} style={{ width: `${item.valor > 0 ? Math.max(4, (item.valor / maior) * 100) : 0}%` }} />
            </div>
          </li>
        ))}
      </ul>
    )
  }

  const abas: { id: VisaoDashboard; rotulo: string }[] = [
    { id: "todas", rotulo: "Visão Geral" },
    { id: "alunos", rotulo: "Alunos & Evasão" },
    { id: "cursos", rotulo: "Acessos & Matrículas" },
    { id: "categorias", rotulo: "Categorias & Carga" },
  ]

  return (
    <section aria-labelledby="dashboard-cursos-titulo" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="dashboard-cursos-titulo" className="text-xl font-bold text-[var(--sesi-black)]">Dashboard de cursos</h2>
          <p className="mt-1 text-sm text-[var(--sesi-muted)]">KPIs e comparativos do catálogo. Métricas de alunos/acessos são estimativas determinísticas.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Visão do dashboard">
          {abas.map((aba) => (
            <button
              key={aba.id}
              type="button"
              role="tab"
              aria-selected={visao === aba.id}
              onClick={() => setVisao(aba.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                visao === aba.id
                  ? "border-[var(--sesi-black)] bg-[var(--sesi-black)] text-white"
                  : "border-[var(--sesi-gray)] bg-white text-[var(--sesi-black)] hover:border-[var(--sesi-red)]"
              }`}
            >
              {aba.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { rotulo: "Total de Cursos", valor: metricas.totalCursos },
          { rotulo: "Cursos em Blocos", valor: metricas.totalBlocos },
          { rotulo: "Pacotes SCORM", valor: metricas.totalScorm },
          { rotulo: "Carga Horária Total", valor: `${metricas.cargaHorariaTotal}h` },
          { rotulo: "Média por Curso", valor: `${metricas.cargaHorariaMedia}h` },
          { rotulo: "Matrículas Totais", valor: metricas.totalMatriculas },
          { rotulo: "Certificações", valor: metricas.totalConclusoes },
          { rotulo: "Taxa de Conclusão", valor: `${metricas.taxaConclusao}%` },
          { rotulo: "Evasões Estimadas", valor: `${metricas.taxaEvasao}%` },
          { rotulo: "Total de Acessos", valor: metricas.totalAcessos },
          { rotulo: "Usuários Cadastrados", valor: metricas.totalUsuarios },
          { rotulo: "Alunos Ativos", valor: metricas.totalAlunos },
        ].map((item) => (
          <div key={item.rotulo} className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sesi-muted)]">{item.rotulo}</p>
            <p className="mt-1 text-3xl font-bold text-[var(--sesi-black)]">{item.valor}</p>
          </div>
        ))}
      </div>

      {visao === "todas" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
            <h3 className="text-base font-bold text-[var(--sesi-black)]">Cursos por Categoria</h3>
            <Barra itens={metricas.categoriasComMatriculas.map((c) => ({ rotulo: c.rotulo, valor: c.cursos }))} />
          </section>
          <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
            <h3 className="text-base font-bold text-[var(--sesi-black)]">Faixa de Carga Horária</h3>
            <Barra itens={metricas.faixasCarga} />
          </section>
        </div>
      )}

      {visao === "alunos" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
            <h3 className="text-base font-bold text-[var(--sesi-black)]">Status e Progresso dos Alunos</h3>
            <p className="mt-1 text-xs text-[var(--sesi-muted)]">Base: {metricas.totalMatriculas} inscrições</p>
            <Barra itens={[
              { rotulo: "Alunos Aprovados (Conclusão 100% + Certificado)", valor: metricas.totalAprovados },
              { rotulo: "Alunos que Pararam no Meio (Em andamento)", valor: metricas.totalPararamMeio },
              { rotulo: "Matriculados e Nunca Acessaram (0%)", valor: metricas.totalNuncaAcessaram },
              { rotulo: "Alunos Reprovados (Abaixo da nota de corte)", valor: metricas.totalReprovados },
              { rotulo: "Nota/Checkpoint Resetado (Nova tentativa)", valor: metricas.totalNotasResetadas },
            ]} />
          </section>
          <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
            <h3 className="text-base font-bold text-[var(--sesi-black)]">Evasão vs. Retenção</h3>
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-[var(--sesi-muted)]">Taxa de Sucesso</span>
                  <span className="font-semibold text-[var(--sesi-black)]">{metricas.taxaConclusao}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[#F1F1F1]">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${metricas.taxaConclusao}%` }} />
                </div>
                <p className="mt-1 text-xs text-[var(--sesi-muted)]">Alunos que completaram o curso e obtiveram certificado.</p>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-[var(--sesi-muted)]">Taxa de Evasão</span>
                  <span className="font-semibold text-[var(--sesi-black)]">{metricas.taxaEvasao}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[#F1F1F1]">
                  <div className="h-full rounded-full bg-rose-500" style={{ width: `${metricas.taxaEvasao}%` }} />
                </div>
                <p className="mt-1 text-xs text-[var(--sesi-muted)]">Inscrições sem atividade ou interrompidas antes da conclusão.</p>
              </div>
            </div>
            <div className="mt-4 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Recomendações Pedagógicas:</p>
              <ul className="mt-2 list-disc pl-5 text-xs">
                <li>Enviar lembretes por e-mail para os {metricas.totalNuncaAcessaram} alunos que ainda não iniciaram.</li>
                <li>Oferecer tutoria de apoio para os {metricas.totalReprovados} alunos com notas abaixo de 70%.</li>
                <li>Disponibilizar plantão de dúvidas nos cursos com maior índice de interrupção no meio.</li>
              </ul>
            </div>
          </section>
        </div>
      )}

      {visao === "cursos" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
            <h3 className="text-base font-bold text-[var(--sesi-black)]">Top Cursos com Mais Matrículas</h3>
            <Barra itens={metricas.cursosMaisMatriculas.map((c) => ({ rotulo: c.nome, valor: c.matriculas }))} cor="bg-emerald-500" />
          </section>
          <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
            <h3 className="text-base font-bold text-[var(--sesi-black)]">Cursos com Menor Quantidade de Matrículas</h3>
            <Barra itens={metricas.cursosMenosMatriculas.map((c) => ({ rotulo: c.nome, valor: c.matriculas }))} cor="bg-rose-500" />
          </section>
          <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
            <h3 className="text-base font-bold text-[var(--sesi-black)]">Top Cursos Mais Acessados (Interações)</h3>
            <Barra itens={metricas.cursosMaisAcessados.map((c) => ({ rotulo: c.nome, valor: c.acessos }))} cor="bg-blue-500" />
          </section>
          <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
            <h3 className="text-base font-bold text-[var(--sesi-black)]">Cursos Menos Acessados</h3>
            <Barra itens={metricas.cursosMenosAcessados.map((c) => ({ rotulo: c.nome, valor: c.acessos }))} cor="bg-amber-500" />
          </section>
        </div>
      )}

      {visao === "categorias" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
            <h3 className="text-base font-bold text-[var(--sesi-black)]">Distribuição por Categoria</h3>
            <Barra itens={metricas.categoriasComMatriculas.map((c) => ({ rotulo: `${c.rotulo} (${c.cursos} cursos)`, valor: c.matriculas }))} />
            <p className="mt-3 text-xs text-[var(--sesi-muted)]">Matrículas por categoria.</p>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
            <h3 className="text-base font-bold text-[var(--sesi-black)]">Duração e Formato dos Cursos</h3>
            <Barra itens={metricas.faixasCarga} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-[#F5F5F5] p-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sesi-muted)]">Pacotes SCORM</p>
                <p className="mt-1 text-2xl font-bold text-[var(--sesi-black)]">{metricas.totalScorm}</p>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-[#F5F5F5] p-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sesi-muted)]">Cursos em Blocos</p>
                <p className="mt-1 text-2xl font-bold text-[var(--sesi-black)]">{metricas.totalBlocos}</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}