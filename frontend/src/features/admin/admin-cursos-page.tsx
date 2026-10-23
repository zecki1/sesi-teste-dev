import { useEffect, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { MainLayout } from "@/components/layout/main-layout"
import { Container } from "@/components/layout/container"
import { useCursos, useFacetas } from "@/hooks/use-catalogo"
import { atualizarCurso, criarCurso, excluirCurso } from "@/lib/api/catalogo"
import {
  carregarConfigScorm,
  configScormPadrao,
  salvarConfigScorm as salvarConfigScormLocal,
} from "@/features/scorm/scorm-config"
import {
  enviarPacoteScorm,
  listarPacotesScorm,
  obterConfiguracaoPaginaScorm,
  obterConfiguracaoScorm,
  salvarConfiguracaoPaginaScorm,
  salvarLimiteScorm as salvarLimiteUploadScorm,
} from "@/features/scorm/scorm-api"
import { usePerfil } from "@/lib/auth/perfil"
import { criarCursoVazio, cursoDaApi, paraPayload, type CursoAdmin } from "./store"
import { CursoEditor } from "./components/curso-editor"

const CORES_STATUS: Record<string, string> = {
  Disponível: "bg-green-100 text-green-800",
  "Inscrições abertas": "bg-amber-100 text-amber-800",
  "Em breve": "bg-[#F5F5F5] text-[var(--sesi-muted)]",
}

function GraficoBarras({ titulo, itens }: { titulo: string; itens: { rotulo: string; valor: number }[] }) {
  const maiorValor = Math.max(...itens.map((item) => item.valor), 1)

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
      <h3 className="text-base font-bold text-[var(--sesi-black)]">{titulo}</h3>
      {itens.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-4">
          {itens.map((item) => (
            <li key={item.rotulo}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-[var(--sesi-muted)]">{item.rotulo}</span>
                <span className="font-semibold tabular-nums text-[var(--sesi-black)]">{item.valor}</span>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-[#F1F1F1]"
                role="img"
                aria-label={`${item.rotulo}: ${item.valor}`}
              >
                <div
                  className="h-full rounded-full bg-[var(--sesi-red)]"
                  style={{ width: `${item.valor > 0 ? Math.max(4, (item.valor / maiorValor) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-[var(--sesi-muted)]">Nenhum curso cadastrado.</p>
      )}
    </section>
  )
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
  const [progressoUploadScorm, setProgressoUploadScorm] = useState<number | null>(null)
  const [carregandoEditor, setCarregandoEditor] = useState(false)
  const [limiteUploadMb, setLimiteUploadMb] = useState(100)
  const [limiteUploadRascunho, setLimiteUploadRascunho] = useState(100)
  const [carregandoConfiguracaoScorm, setCarregandoConfiguracaoScorm] = useState(true)
  const [salvandoLimiteScorm, setSalvandoLimiteScorm] = useState(false)
  const pacotesQuery = useQuery({
    queryKey: ["scorm-pacotes"],
    queryFn: listarPacotesScorm,
    enabled: perfil?.papel === "admin",
  })

  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(() => setAviso(""), 4000)
    return () => window.clearTimeout(timer)
  }, [aviso])

  useEffect(() => {
    if (perfil?.papel !== "admin") return

    let ativo = true
    setCarregandoConfiguracaoScorm(true)
    obterConfiguracaoScorm()
      .then(({ limiteUploadMb: limite }) => {
        if (ativo) {
          setLimiteUploadMb(limite)
          setLimiteUploadRascunho(limite)
        }
      })
      .catch((falha: unknown) => {
        if (ativo) setErro(falha instanceof Error ? falha.message : "Não foi possível carregar as configurações SCORM.")
      })
      .finally(() => {
        if (ativo) setCarregandoConfiguracaoScorm(false)
      })

    return () => {
      ativo = false
    }
  }, [perfil?.papel])

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

  const slugsScorm = new Set((pacotesQuery.data ?? []).map((pacote) => pacote.cursoSlug))
  const cursos = (data?.itens ?? []).map((curso) => {
    const cursoAdmin = cursoDaApi(curso)
    return { ...cursoAdmin, tipo: slugsScorm.has(cursoAdmin.slug) ? "scorm" as const : "blocos" as const }
  })
  const filtrados = cursos.filter((curso) =>
    `${curso.nomeCompleto} ${curso.categoria} ${curso.modalidade}`.toLowerCase().includes(busca.toLowerCase()),
  )
  const totalBlocos = cursos.filter((curso) => curso.tipo === "blocos").length
  const totalScorm = cursos.filter((curso) => curso.tipo === "scorm").length
  const cargaHorariaTotal = cursos.reduce((total, curso) => total + curso.cargaHoraria, 0)
  const cursosPorCategoria = Array.from(
    cursos.reduce((contagens, curso) => {
      contagens.set(curso.categoria || "Sem categoria", (contagens.get(curso.categoria || "Sem categoria") ?? 0) + 1)
      return contagens
    }, new Map<string, number>()),
    ([rotulo, valor]) => ({ rotulo, valor }),
  ).sort((a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo))
  const cursosPorStatus = Array.from(
    cursos.reduce((contagens, curso) => {
      contagens.set(curso.status || "Sem status", (contagens.get(curso.status || "Sem status") ?? 0) + 1)
      return contagens
    }, new Map<string, number>()),
    ([rotulo, valor]) => ({ rotulo, valor }),
  ).sort((a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo))

  const recarregar = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cursos"] }),
      queryClient.invalidateQueries({ queryKey: ["facetas"] }),
      queryClient.invalidateQueries({ queryKey: ["curso"] }),
      queryClient.invalidateQueries({ queryKey: ["turmas"] }),
      queryClient.invalidateQueries({ queryKey: ["scorm-pacotes"] }),
    ])
  }

  const aoSalvar = async (curso: CursoAdmin, arquivoPacote?: File) => {
    if (salvando) return
    setSalvando(true)
    setProgressoUploadScorm(null)
    setErro("")
    let cursoSalvo = false
    const cursoPersistido =
      curso.origem === "api" ? curso : { ...curso, origem: "api" as const, slugOriginal: curso.slug }
    try {
      const payload = paraPayload(curso, facetas)
      if (curso.origem === "api") {
        await atualizarCurso(curso.slugOriginal ?? curso.slug, payload)
      } else {
        await criarCurso(payload)
      }
      cursoSalvo = true
      if (curso.tipo === "scorm" && curso.scorm) {
        await salvarConfiguracaoPaginaScorm(curso.slug, curso.scorm)
        salvarConfigScormLocal(curso.slug, curso.scorm)
      }
      if (curso.tipo === "scorm" && arquivoPacote) {
        setProgressoUploadScorm(0)
        await enviarPacoteScorm(
          curso.slug,
          arquivoPacote,
          curso.scorm?.versao ?? "1.2",
          setProgressoUploadScorm,
        )
      }
      await recarregar()
      setEditando(null)
      setAviso(`Curso "${curso.nomeBreve}" gravado na API com sucesso.`)
    } catch (falha) {
      const detalhe = falha instanceof Error ? falha.message : "Falha inesperada ao gravar o curso."
      if (cursoSalvo && curso.origem !== "api") setEditando(cursoPersistido)
      setErro(
        cursoSalvo
          ? `Os dados do curso foram salvos, mas houve um problema ao salvar a página ou o pacote SCORM: ${detalhe}${arquivoPacote ? " O ZIP selecionado não foi mantido; selecione-o novamente para tentar o envio." : ""}`
          : detalhe,
      )
    } finally {
      setSalvando(false)
      setProgressoUploadScorm(null)
    }
  }

  const abrirEditor = async (curso: CursoAdmin) => {
    setErro("")
    setAviso("")
    setEditando(null)
    setCarregandoEditor(true)

    let scorm = curso.tipo === "scorm" ? configScormPadrao(curso) : undefined
    if (scorm) {
      const local = carregarConfigScorm(curso.slug)
      if (local) scorm = { ...scorm, ...local }
      try {
        const salva = await obterConfiguracaoPaginaScorm(curso.slug)
        if (salva) scorm = { ...scorm, ...salva }
      } catch (falha) {
        setErro(falha instanceof Error ? falha.message : "Não foi possível consultar a página SCORM.")
      }
    }

    setEditando({ ...curso, scorm })
    setCarregandoEditor(false)
  }

  const salvarLimite = async () => {
    setSalvandoLimiteScorm(true)
    setErro("")
    try {
      const salvo = await salvarLimiteUploadScorm(limiteUploadRascunho)
      setLimiteUploadMb(salvo.limiteUploadMb)
      setLimiteUploadRascunho(salvo.limiteUploadMb)
      setAviso(`Limite de upload SCORM atualizado para ${salvo.limiteUploadMb} MB.`)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar o limite de upload SCORM.")
    } finally {
      setSalvandoLimiteScorm(false)
    }
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

          <section className="flex flex-wrap items-end justify-between gap-5 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
            <div className="max-w-xl">
              <h2 className="text-lg font-bold text-[var(--sesi-black)]">Limite de upload SCORM</h2>
              <p className="mt-1 text-sm text-[var(--sesi-muted)]">
                O limite é aplicado pela API a cada arquivo .zip. Opções disponíveis: 20, 50, 80, 100 ou 200 MB.
                O padrão é 100 MB. A mudança é persistida no backend.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--sesi-muted)]">
                Tamanho máximo
                <select
                  id="limite-pacote-scorm"
                  value={limiteUploadRascunho}
                  disabled={carregandoConfiguracaoScorm || salvandoLimiteScorm}
                  onChange={(evento) => setLimiteUploadRascunho(Number(evento.target.value))}
                  className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white px-3 py-2.5 text-sm font-normal text-[var(--sesi-black)]"
                >
                  {[20, 50, 80, 100, 200].map((limite) => (
                    <option key={limite} value={limite}>{limite} MB</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={carregandoConfiguracaoScorm || salvandoLimiteScorm || limiteUploadMb === limiteUploadRascunho}
                onClick={salvarLimite}
                className="rounded-[var(--radius-lg)] bg-[var(--sesi-black)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {salvandoLimiteScorm ? "Salvando..." : `Salvar (${limiteUploadMb} MB atual)`}
              </button>
            </div>
          </section>

          {pacotesQuery.isError && (
            <p role="alert" className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {pacotesQuery.error instanceof Error ? pacotesQuery.error.message : "Não foi possível identificar os cursos SCORM."}
            </p>
          )}

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

          {carregandoEditor ? (
            <p role="status" className="py-8 text-center text-sm text-[var(--sesi-muted)]">Carregando configurações do curso...</p>
          ) : editando ? (
            <CursoEditor
              key={`${editando.id}-${editando.origem}`}
              curso={editando}
              facetas={facetas}
              salvando={salvando}
              progressoUploadScorm={progressoUploadScorm}
              limitePacoteMb={limiteUploadMb}
              onSalvar={aoSalvar}
              onCancelar={() => setEditando(null)}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { rotulo: "Cursos no catálogo", valor: data?.total ?? 0 },
                  { rotulo: "Cursos em blocos", valor: totalBlocos },
                  { rotulo: "Pacotes SCORM", valor: totalScorm },
                  { rotulo: "Carga horária cadastrada", valor: `${cargaHorariaTotal}h` },
                ].map((item) => (
                  <div key={item.rotulo} className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sesi-muted)]">{item.rotulo}</p>
                    <p className="mt-1 text-3xl font-bold text-[var(--sesi-black)]">{item.valor}</p>
                  </div>
                ))}
              </div>

              <section aria-labelledby="dashboard-cursos-titulo">
                <div className="mb-4">
                  <h2 id="dashboard-cursos-titulo" className="text-xl font-bold text-[var(--sesi-black)]">
                    Dashboard de cursos
                  </h2>
                  <p className="mt-1 text-sm text-[var(--sesi-muted)]">
                    Distribuição dos cursos carregados no catálogo por categoria e status.
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  <GraficoBarras
                    titulo="Cursos por formato"
                    itens={[
                      { rotulo: "Blocos", valor: totalBlocos },
                      { rotulo: "SCORM", valor: totalScorm },
                    ]}
                  />
                  <GraficoBarras titulo="Cursos por categoria" itens={cursosPorCategoria.slice(0, 6)} />
                  <GraficoBarras titulo="Cursos por status" itens={cursosPorStatus} />
                </div>
              </section>

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
