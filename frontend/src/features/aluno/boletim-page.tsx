import { useEffect, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { Container } from "@/components/layout/container"
import { MainLayout } from "@/components/layout/main-layout"
import { usePerfil } from "@/lib/auth/perfil"
import { obterBoletim, type Boletim } from "@/lib/api/academico"

const card = "rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5"

function corDaMedia(media: number) {
  if (media >= 7) return "text-green-700"
  if (media >= 5) return "text-amber-700"
  return "text-red-700"
}

export function BoletimPage() {
  const perfil = usePerfil()
  const [boletim, setBoletim] = useState<Boletim | null>(null)
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!perfil?.email) return
    let ativo = true
    setCarregando(true)
    obterBoletim(perfil.email)
      .then((dados) => ativo && setBoletim(dados))
      .catch((falha: unknown) => ativo && setErro(falha instanceof Error ? falha.message : "Não foi possível carregar o boletim."))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [perfil?.email])

  if (!perfil) return <Navigate to="/area-do-aluno" replace />

  return (
    <MainLayout>
      <section className="bg-[var(--sesi-black)] py-10 text-white">
        <Container className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-[var(--sesi-beige)]">Área do aluno</p>
            <h1 className="text-2xl font-bold sm:text-3xl">Meu boletim</h1>
            <p className="mt-1 text-sm text-white/60">{perfil.nome} · {perfil.email}</p>
          </div>
          <Link
            to="/area-do-aluno"
            className="rounded-[var(--radius-lg)] border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-[var(--sesi-black)]"
          >
            Voltar para a área do aluno
          </Link>
        </Container>
      </section>

      <section className="bg-[var(--sesi-white)] py-10">
        <Container>
          {erro && <p role="alert" className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
          {carregando && <p className="text-sm text-[var(--sesi-muted)]">Carregando boletim...</p>}

          {!carregando && boletim && boletim.cursos.length === 0 && (
            <div className={`${card} text-sm text-[var(--sesi-muted)]`}>
              Você ainda não possui matrículas.{" "}
              <Link to="/catalogo" className="font-semibold text-[var(--sesi-red)] hover:underline">Ver catálogo de cursos</Link>
            </div>
          )}

          <div className="grid gap-6">
            {boletim?.cursos.map((curso) => (
              <article key={curso.matriculaId} className={card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--sesi-black)]">{curso.cursoNome}</h2>
                    <p className="text-xs text-[var(--sesi-muted)]">
                      Turma {curso.turmaCodigo || "—"} · {curso.status}
                      {curso.concluido ? " · concluído" : ""} · progresso {curso.progresso}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-[var(--sesi-muted)]">Média final</p>
                    <p className={`text-2xl font-bold ${corDaMedia(curso.mediaFinal)}`}>
                      {curso.notas.length ? curso.mediaFinal.toFixed(1) : "—"}
                    </p>
                  </div>
                </div>

                {curso.notas.length === 0 ? (
                  <p className="mt-4 rounded-lg border border-dashed border-[var(--sesi-gray)] p-4 text-sm text-[var(--sesi-muted)]">
                    Nenhuma nota lançada ainda.
                  </p>
                ) : (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--sesi-gray)]">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="bg-[#F5F5F5] text-xs uppercase text-[var(--sesi-muted)]">
                        <tr>
                          <th className="px-4 py-2.5">Avaliação</th>
                          <th className="px-4 py-2.5">Tipo</th>
                          <th className="px-4 py-2.5">Data</th>
                          <th className="px-4 py-2.5">Nota</th>
                          <th className="px-4 py-2.5">Peso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {curso.notas.map((nota) => (
                          <tr key={nota.id} className="border-t border-[var(--sesi-gray)]">
                            <td className="px-4 py-2.5 font-medium">{nota.titulo}</td>
                            <td className="px-4 py-2.5">{nota.tipo}</td>
                            <td className="px-4 py-2.5">{new Date(nota.data).toLocaleDateString("pt-BR")}</td>
                            <td className="px-4 py-2.5">{nota.valor} / {nota.valorMaximo}</td>
                            <td className="px-4 py-2.5">{nota.peso}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to={`/area-do-aluno/curso/${curso.cursoSlug}`}
                    className="text-sm font-semibold text-[var(--sesi-red)] hover:underline"
                  >
                    Abrir o ambiente do curso
                  </Link>
                  {curso.turmaId > 0 && (
                    <Link
                      to={`/area-do-aluno/aulas/${curso.turmaId}`}
                      className="text-sm font-semibold text-[var(--sesi-red)] hover:underline"
                    >
                      Aulas ao vivo (semi-presencial)
                    </Link>
                  )}
                  {curso.turmaId > 0 && (
                    <Link
                      to={`/area-do-aluno/comunidade/${curso.turmaId}`}
                      className="text-sm font-semibold text-[var(--sesi-red)] hover:underline"
                    >
                      Comunidade da turma (fórum, chat, plantão)
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>
    </MainLayout>
  )
}
