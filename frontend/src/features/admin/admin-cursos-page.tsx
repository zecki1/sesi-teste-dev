import { useEffect, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { MainLayout } from "@/components/layout/main-layout"
import { Container } from "@/components/layout/container"
import { useCursos, useFacetas } from "@/hooks/use-catalogo"
import { atualizarCurso, criarCurso, excluirCurso } from "@/lib/api/catalogo"
import { carregarConfigScorm, salvarConfigScorm } from "@/features/scorm/scorm-config"
import { usePerfil } from "@/lib/auth/perfil"
import { criarCursoVazio, cursoDaApi, paraPayload, type CursoAdmin } from "./store"
import { CursoEditor } from "./components/curso-editor"

const CORES_STATUS: Record<string, string> = {
  Disponível: "bg-green-100 text-green-800",
  "Inscrições abertas": "bg-amber-100 text-amber-800",
  "Em breve": "bg-[#F5F5F5] text-[var(--sesi-muted)]",
}

export function AdminCursosPage() {
  const perfil = usePerfil()
  const queryClient = useQueryClient()
  const { data } = useCursos({ tamanho: 48 })
  const { data: facetas } = useFacetas()
  const [editando, setEditando] = useState<CursoAdmin | null>(null)
  const [busca, setBusca] = useState("")
  const [aviso, setAviso] = useState("")
  const [erro, setErro] = useState("")
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(() => setAviso(""), 4000)
    return () => window.clearTimeout(timer)
  }, [aviso])

  if (!perfil) return <Navigate to="/area-do-aluno" replace />

  if (perfil.papel !== "admin") {
    return (
      <MainLayout>
        <Container className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-20 text-center">
          <span className="text-5xl" aria-hidden="true">
            🔒
          </span>
          <h1 className="text-2xl font-bold text-[var(--sesi-black)]">Acesso restrito a administradores</h1>
          <p className="max-w-md text-sm text-[var(--sesi-muted)]">
            Entre com um e-mail de administrador para criar e gerenciar cursos.
          </p>
          <Link
            to="/area-do-aluno"
            className="rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Voltar para a área do aluno
          </Link>
        </Container>
      </MainLayout>
    )
  }

  const cursos = (data?.itens ?? []).map(cursoDaApi)
  const filtrados = cursos.filter((curso) =>
    `${curso.nomeCompleto} ${curso.categoria} ${curso.modalidade}`.toLowerCase().includes(busca.toLowerCase()),
  )
  const totalBlocos = cursos.filter((curso) => curso.tipo === "blocos").length
  const totalScorm = cursos.filter((curso) => curso.tipo === "scorm").length

  const recarregar = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cursos"] }),
      queryClient.invalidateQueries({ queryKey: ["facetas"] }),
      queryClient.invalidateQueries({ queryKey: ["curso"] }),
      queryClient.invalidateQueries({ queryKey: ["turmas"] }),
    ])
  }

  const aoSalvar = async (curso: CursoAdmin) => {
    if (salvando) return
    setSalvando(true)
    setErro("")
    try {
      const payload = paraPayload(curso, facetas)
      if (curso.origem === "api") {
        await atualizarCurso(curso.slugOriginal ?? curso.slug, payload)
      } else {
        await criarCurso(payload)
      }
      if (curso.scorm) salvarConfigScorm(curso.slug, curso.scorm)
      await recarregar()
      setEditando(null)
      setAviso(`Curso "${curso.nomeBreve}" gravado na API com sucesso.`)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível gravar o curso na API.")
    } finally {
      setSalvando(false)
    }
  }

  const abrirEditor = (curso: CursoAdmin) => {
    setErro("")
    setAviso("")
    setEditando({ ...curso, scorm: carregarConfigScorm(curso.slug) ?? undefined })
  }

  const aoExcluir = async (curso: CursoAdmin) => {
    if (!window.confirm(`Excluir o curso "${curso.nomeBreve}"? Ele será desativado no catálogo.`)) return
    setErro("")
    try {
      await excluirCurso(curso.slugOriginal ?? curso.slug)
      await recarregar()
      setAviso(`Curso "${curso.nomeBreve}" desativado no catálogo.`)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível excluir o curso.")
    }
  }

  return (
    <MainLayout>
      <section className="bg-[var(--sesi-black)] py-10 text-white">
        <Container className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--sesi-beige)]">Administração</p>
            <h1 className="text-3xl font-bold sm:text-4xl">Gerenciar cursos</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              Crie cursos em blocos (estilo Rise), envie pacotes SCORM e edite os metadados dos cursos do catálogo.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/area-do-aluno"
              className="rounded-[var(--radius-lg)] border border-white/30 px-4 py-2.5 text-sm font-semibold transition hover:bg-white hover:text-[var(--sesi-black)]"
            >
              Área do aluno
            </Link>
            <button
              type="button"
              onClick={() => {
                setErro("")
                setEditando(criarCursoVazio(facetas?.categorias[0]?.nome, facetas?.modalidades[0]?.nome, facetas?.status[0]?.nome))
                setAviso("")
              }}
              className="rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)]"
            >
              + Novo curso
            </button>
          </div>
        </Container>
      </section>

      <section className="py-10">
        <Container className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-[#F5F5F5] px-4 py-3 text-sm">
            <p className="text-[var(--sesi-muted)]">
              Os cursos são gravados na <strong>API do catálogo</strong>. Criação, edição e exclusão refletem no site público.
            </p>
            <button
              type="button"
              onClick={recarregar}
              className="font-semibold text-[var(--sesi-red)] hover:underline"
            >
              Recarregar da API
            </button>
          </div>

          {aviso && (
            <p role="status" className="rounded-[var(--radius-lg)] border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              {aviso}
            </p>
          )}

          {erro && (
            <p role="alert" className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {erro}
            </p>
          )}

          {editando ? (
            <CursoEditor
              curso={editando}
              facetas={facetas}
              salvando={salvando}
              onSalvar={aoSalvar}
              onCancelar={() => setEditando(null)}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { rotulo: "Cursos no catálogo", valor: cursos.length },
                  { rotulo: "Cursos em blocos", valor: totalBlocos },
                  { rotulo: "Pacotes SCORM", valor: totalScorm },
                ].map((item) => (
                  <div key={item.rotulo} className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sesi-muted)]">{item.rotulo}</p>
                    <p className="mt-1 text-3xl font-bold text-[var(--sesi-black)]">{item.valor}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[var(--sesi-black)]">Cursos cadastrados</h2>
                <input
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                  placeholder="Buscar por nome, categoria ou modalidade"
                  aria-label="Buscar cursos"
                  className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] px-3 py-2.5 text-sm outline-none focus:border-[var(--sesi-red)]"
                />
              </div>

              <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-[#F5F5F5] text-xs uppercase tracking-wide text-[var(--sesi-muted)]">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Curso
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Categoria
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Formato
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((curso) => (
                      <tr key={curso.id} className="border-t border-[var(--sesi-gray)] align-top">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            {curso.imagemUrl ? (
                              <img src={curso.imagemUrl} alt="" className="h-12 w-16 shrink-0 rounded object-cover" />
                            ) : (
                              <span className="grid h-12 w-16 shrink-0 place-items-center rounded bg-[#F5F5F5] text-xs text-[var(--sesi-muted)]">
                                sem capa
                              </span>
                            )}
                            <div>
                              <p className="font-semibold text-[var(--sesi-black)]">{curso.nomeBreve}</p>
                              <p className="text-xs text-[var(--sesi-muted)]">
                                {curso.cargaHoraria}h · {curso.modalidade}
                                {curso.destaque && <span className="ml-2 font-semibold text-[var(--sesi-red)]">Destaque</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--sesi-muted)]">{curso.categoria}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              curso.tipo === "scorm" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {curso.tipo === "scorm" ? "SCORM" : "Blocos"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CORES_STATUS[curso.status] ?? "bg-[#F5F5F5]"}`}>
                            {curso.status || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => abrirEditor(curso)}
                              className="text-xs font-semibold text-[var(--sesi-black)] underline-offset-4 hover:underline"
                            >
                              Editar
                            </button>
                            <Link
                              to={`/curso/${curso.slug}/scorm`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-[var(--sesi-black)] underline-offset-4 hover:underline"
                            >
                              Página SCORM ↗
                            </Link>
                            <button
                              type="button"
                              onClick={() => aoExcluir(curso)}
                              className="text-xs font-semibold text-[var(--sesi-red)] underline-offset-4 hover:underline"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtrados.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--sesi-muted)]">
                          Nenhum curso encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Container>
      </section>
    </MainLayout>
  )
}
