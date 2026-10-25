import { useMemo } from "react"
import type { CursoAdmin } from "../store"
import type { UsuarioGestao } from "@/lib/api/gestao"

interface AdminDashboardGraficosProps {
  cursos: CursoAdmin[]
  usuarios?: UsuarioGestao[]
}

export function AdminDashboardGraficos({ cursos, usuarios = [] }: AdminDashboardGraficosProps) {
  const metricas = useMemo(() => {
    const totalCursos = cursos.length
    const totalBlocos = cursos.filter((c) => c.tipo === "blocos").length
    const totalScorm = cursos.filter((c) => c.tipo === "scorm").length
    const cargaHorariaTotal = cursos.reduce((acc, c) => acc + c.cargaHoraria, 0)
    const cargaHorariaMedia = totalCursos > 0 ? Math.round(cargaHorariaTotal / totalCursos) : 0

    const totalUsuarios = usuarios.length
    const totalAlunos = usuarios.filter((u) => u.papel === "Aluno").length
    const usuariosAtivos = usuarios.filter((u) => u.ativo).length
    const totalAdmins = usuarios.filter((u) => u.papel === "Administrador").length

    const cursosPorCategoria = Array.from(
      cursos.reduce((contagens, curso) => {
        const chave = curso.categoria || "Sem categoria"
        contagens.set(chave, (contagens.get(chave) ?? 0) + 1)
        return contagens
      }, new Map<string, number>()),
      ([rotulo, valor]) => ({ rotulo, valor }),
    ).sort((a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo))

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
      totalUsuarios,
      totalAlunos,
      usuariosAtivos,
      totalAdmins,
      cursosPorCategoria,
      faixasCarga,
    }
  }, [cursos, usuarios])

  const maiorCategoria = Math.max(...metricas.cursosPorCategoria.map((c) => c.valor), 1)
  const maiorFaixa = Math.max(...metricas.faixasCarga.map((f) => f.valor), 1)

  return (
    <section aria-labelledby="dashboard-cursos-titulo" className="flex flex-col gap-6">
      <div>
        <h2 id="dashboard-cursos-titulo" className="text-xl font-bold text-[var(--sesi-black)]">Dashboard de cursos</h2>
        <p className="mt-1 text-sm text-[var(--sesi-muted)]">Dados reais do catálogo e dos usuários cadastrados na gestão.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { rotulo: "Total de Cursos", valor: metricas.totalCursos },
          { rotulo: "Cursos em Blocos", valor: metricas.totalBlocos },
          { rotulo: "Pacotes SCORM", valor: metricas.totalScorm },
          { rotulo: "Carga Horária Total", valor: `${metricas.cargaHorariaTotal}h` },
          { rotulo: "Média por Curso", valor: `${metricas.cargaHorariaMedia}h` },
          { rotulo: "Usuários Cadastrados", valor: metricas.totalUsuarios },
          { rotulo: "Alunos", valor: metricas.totalAlunos },
          { rotulo: "Administradores", valor: metricas.totalAdmins },
          { rotulo: "Usuários Ativos", valor: metricas.usuariosAtivos },
          { rotulo: "Categorias", valor: metricas.cursosPorCategoria.length },
        ].map((item) => (
          <div key={item.rotulo} className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sesi-muted)]">{item.rotulo}</p>
            <p className="mt-1 text-3xl font-bold text-[var(--sesi-black)]">{item.valor}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
          <h3 className="text-base font-bold text-[var(--sesi-black)]">Distribuição por Categoria</h3>
          {metricas.cursosPorCategoria.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-4">
              {metricas.cursosPorCategoria.map((item) => (
                <li key={item.rotulo}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-[var(--sesi-muted)]">{item.rotulo}</span>
                    <span className="font-semibold tabular-nums text-[var(--sesi-black)]">{item.valor} cursos</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#F1F1F1]" role="img" aria-label={`${item.rotulo}: ${item.valor}`}>
                    <div className="h-full rounded-full bg-[var(--sesi-red)]" style={{ width: `${Math.max(4, (item.valor / maiorCategoria) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-[var(--sesi-muted)]">Nenhum curso cadastrado.</p>
          )}
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
          <h3 className="text-base font-bold text-[var(--sesi-black)]">Faixa de Carga Horária</h3>
          <ul className="mt-4 flex flex-col gap-4">
            {metricas.faixasCarga.map((item) => (
              <li key={item.rotulo}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-[var(--sesi-muted)]">{item.rotulo}</span>
                  <span className="font-semibold tabular-nums text-[var(--sesi-black)]">{item.valor} cursos</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#F1F1F1]" role="img" aria-label={`${item.rotulo}: ${item.valor}`}>
                  <div className="h-full rounded-full bg-[var(--sesi-red)]" style={{ width: `${item.valor > 0 ? Math.max(4, (item.valor / maiorFaixa) * 100) : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  )
}