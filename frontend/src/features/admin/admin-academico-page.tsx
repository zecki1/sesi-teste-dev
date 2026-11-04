import { FormEvent, useEffect, useMemo, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { Container } from "@/components/layout/container"
import { MainLayout } from "@/components/layout/main-layout"
import { usePerfil } from "@/lib/auth/perfil"
import { useFacetas } from "@/hooks/use-catalogo"
import { listarCursosAdministracao, listarUsuariosGestao, type UsuarioGestao } from "@/lib/api/gestao"
import type { CursoResumoDto } from "@/lib/api/catalogo"
import {
  atualizarMatriculaAdmin,
  atualizarNota,
  atualizarTurmaAdmin,
  criarMatriculaAdmin,
  criarNota,
  criarTurmaAdmin,
  excluirMatriculaAdmin,
  excluirNota,
  excluirTurmaAdmin,
  listarMatriculasAdmin,
  listarNotas,
  listarTurmasAdmin,
  type MatriculaAdmin,
  type Nota,
  type SalvarNotaRequest,
  type SalvarTurmaRequest,
  type TurmaAdmin,
} from "@/lib/api/academico"

type AbaAcademico = "turmas" | "matriculas" | "notas"

const campo =
  "w-full rounded-lg border border-[var(--sesi-gray)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--sesi-red)]"
const botao =
  "rounded-lg bg-[var(--sesi-red)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)] disabled:opacity-60"
const botaoSecundario =
  "rounded-lg border border-[var(--sesi-gray)] px-3 py-2.5 text-sm font-semibold hover:border-[var(--sesi-red)]"

const TIPOS_NOTA = ["Prova", "Trabalho", "Atividade", "Participação", "Projeto"]
const STATUS_MATRICULA = ["ativa", "trancada", "cancelada", "concluida"]
const DIAS = "Seg,Ter,Qua,Qui,Sex"

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function turmaVazia(): SalvarTurmaRequest {
  return {
    cursoId: 0,
    modalidadeId: 0,
    codigo: "",
    dataInicio: hoje(),
    dataFim: null,
    diasSemana: DIAS,
    horarioInicio: "19:00",
    horarioFim: "22:00",
    vagas: 30,
    ativa: true,
  }
}

function notaVazia(): SalvarNotaRequest {
  return {
    titulo: "",
    tipo: "Prova",
    peso: 1,
    valor: 0,
    valorMaximo: 10,
    data: hoje(),
    observacao: "",
  }
}

export function AdminAcademicoPage() {
  const perfil = usePerfil()
  const { data: facetas } = useFacetas()

  const [aba, setAba] = useState<AbaAcademico>("turmas")
  const [cursos, setCursos] = useState<CursoResumoDto[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioGestao[]>([])
  const [turmas, setTurmas] = useState<TurmaAdmin[]>([])
  const [matriculas, setMatriculas] = useState<MatriculaAdmin[]>([])
  const [notas, setNotas] = useState<Nota[]>([])

  const [turmaForm, setTurmaForm] = useState<SalvarTurmaRequest>(turmaVazia)
  const [turmaEditando, setTurmaEditando] = useState<number | null>(null)

  const [matriculaForm, setMatriculaForm] = useState({ usuarioId: "", turmaId: 0, status: "ativa", progresso: 0, concluido: false })
  const [matriculaEditando, setMatriculaEditando] = useState<number | null>(null)

  const [notaMatriculaId, setNotaMatriculaId] = useState<number | null>(null)
  const [notaForm, setNotaForm] = useState<SalvarNotaRequest>(notaVazia)
  const [notaEditando, setNotaEditando] = useState<number | null>(null)

  const [erro, setErro] = useState("")
  const [aviso, setAviso] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const nomeCurso = useMemo(() => {
    const mapa = new Map<number, string>()
    cursos.forEach((curso) => mapa.set(curso.id, curso.nomeBreve || curso.nomeCompleto))
    return mapa
  }, [cursos])

  const matriculaSelecionada = matriculas.find((item) => item.id === notaMatriculaId) ?? null

  const carregar = async () => {
    setCarregando(true)
    setErro("")
    try {
      const [listaCursos, listaUsuarios, listaTurmas, listaMatriculas] = await Promise.all([
        listarCursosAdministracao(),
        listarUsuariosGestao(),
        listarTurmasAdmin(),
        listarMatriculasAdmin(),
      ])
      setCursos(listaCursos)
      setUsuarios(listaUsuarios)
      setTurmas(listaTurmas)
      setMatriculas(listaMatriculas)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível carregar a gestão acadêmica.")
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (perfil?.papel === "admin") void carregar()
  }, [perfil?.papel])

  useEffect(() => {
    if (notaMatriculaId === null) {
      setNotas([])
      return
    }
    let ativo = true
    listarNotas(notaMatriculaId)
      .then((lista) => ativo && setNotas(lista))
      .catch((falha: unknown) => ativo && setErro(falha instanceof Error ? falha.message : "Falha ao carregar as notas."))
    return () => {
      ativo = false
    }
  }, [notaMatriculaId])

  if (!perfil) return <Navigate to="/area-do-aluno" replace />
  if (perfil.papel !== "admin") {
    return (
      <MainLayout>
        <Container className="py-16">
          <h1 className="text-2xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-[var(--sesi-muted)]">Entre com uma conta administrativa autorizada.</p>
        </Container>
      </MainLayout>
    )
  }

  const falha = (erroCapturado: unknown) =>
    setErro(erroCapturado instanceof Error ? erroCapturado.message : "Não foi possível concluir a operação.")

  // ---------- Turmas ----------
  const salvarTurma = async (evento: FormEvent) => {
    evento.preventDefault()
    setSalvando(true)
    setErro("")
    setAviso("")
    try {
      const dados: SalvarTurmaRequest = {
        ...turmaForm,
        cursoId: Number(turmaForm.cursoId),
        modalidadeId: Number(turmaForm.modalidadeId),
        vagas: Number(turmaForm.vagas) || 1,
        dataFim: turmaForm.dataFim ? turmaForm.dataFim : null,
      }
      if (!dados.cursoId || !dados.modalidadeId) throw new Error("Selecione o curso e a modalidade.")
      if (turmaEditando) await atualizarTurmaAdmin(turmaEditando, dados)
      else await criarTurmaAdmin(dados)
      setAviso(turmaEditando ? "Turma atualizada." : "Turma criada.")
      setTurmaForm(turmaVazia())
      setTurmaEditando(null)
      setTurmas(await listarTurmasAdmin())
    } catch (falhaCapturada) {
      falha(falhaCapturada)
    } finally {
      setSalvando(false)
    }
  }

  const editarTurma = (turma: TurmaAdmin) => {
    setTurmaEditando(turma.id)
    setTurmaForm({
      cursoId: turma.cursoId,
      modalidadeId: turma.modalidadeId,
      codigo: turma.codigo,
      dataInicio: turma.dataInicio,
      dataFim: turma.dataFim ?? null,
      diasSemana: turma.diasSemana,
      horarioInicio: turma.horarioInicio,
      horarioFim: turma.horarioFim,
      vagas: turma.vagas,
      ativa: turma.ativa,
    })
  }

  const removerTurma = async (turma: TurmaAdmin) => {
    if (!window.confirm(`Excluir a turma ${turma.codigo}?`)) return
    setErro("")
    setAviso("")
    try {
      await excluirTurmaAdmin(turma.id)
      setAviso("Turma excluída.")
      setTurmas(await listarTurmasAdmin())
    } catch (falhaCapturada) {
      falha(falhaCapturada)
    }
  }

  // ---------- Matrículas ----------
  const salvarMatricula = async (evento: FormEvent) => {
    evento.preventDefault()
    setSalvando(true)
    setErro("")
    setAviso("")
    try {
      if (!matriculaForm.usuarioId.trim() || !matriculaForm.turmaId) {
        throw new Error("Informe o aluno e a turma.")
      }
      const dados = {
        usuarioId: matriculaForm.usuarioId.trim(),
        turmaId: Number(matriculaForm.turmaId),
        status: matriculaForm.status,
        progresso: Number(matriculaForm.progresso) || 0,
        concluido: matriculaForm.concluido,
      }
      if (matriculaEditando) await atualizarMatriculaAdmin(matriculaEditando, dados)
      else await criarMatriculaAdmin(dados)
      setAviso(matriculaEditando ? "Matrícula atualizada." : "Matrícula criada.")
      setMatriculaForm({ usuarioId: "", turmaId: 0, status: "ativa", progresso: 0, concluido: false })
      setMatriculaEditando(null)
      setMatriculas(await listarMatriculasAdmin())
    } catch (falhaCapturada) {
      falha(falhaCapturada)
    } finally {
      setSalvando(false)
    }
  }

  const editarMatricula = (matricula: MatriculaAdmin) => {
    setMatriculaEditando(matricula.id)
    setMatriculaForm({
      usuarioId: matricula.usuarioId,
      turmaId: matricula.turmaId,
      status: matricula.status,
      progresso: matricula.progresso,
      concluido: matricula.concluido,
    })
  }

  const removerMatricula = async (matricula: MatriculaAdmin) => {
    if (!window.confirm(`Excluir a matrícula de ${matricula.usuarioNome ?? matricula.usuarioId}?`)) return
    setErro("")
    setAviso("")
    try {
      await excluirMatriculaAdmin(matricula.id)
      setAviso("Matrícula excluída.")
      if (notaMatriculaId === matricula.id) {
        setNotaMatriculaId(null)
        setNotas([])
      }
      setMatriculas(await listarMatriculasAdmin())
    } catch (falhaCapturada) {
      falha(falhaCapturada)
    }
  }

  // ---------- Notas ----------
  const salvarNota = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!notaMatriculaId) {
      setErro("Selecione uma matrícula para lançar notas.")
      return
    }
    setSalvando(true)
    setErro("")
    setAviso("")
    try {
      const dados: SalvarNotaRequest = {
        ...notaForm,
        peso: Number(notaForm.peso) || 1,
        valor: Number(notaForm.valor) || 0,
        valorMaximo: Number(notaForm.valorMaximo) || 10,
        data: notaForm.data || null,
        observacao: notaForm.observacao?.trim() || null,
      }
      if (notaEditando) await atualizarNota(notaMatriculaId, notaEditando, dados)
      else await criarNota(notaMatriculaId, dados)
      setAviso(notaEditando ? "Nota atualizada." : "Nota lançada.")
      setNotaForm(notaVazia())
      setNotaEditando(null)
      setNotas(await listarNotas(notaMatriculaId))
    } catch (falhaCapturada) {
      falha(falhaCapturada)
    } finally {
      setSalvando(false)
    }
  }

  const editarNota = (nota: Nota) => {
    setNotaEditando(nota.id)
    setNotaForm({
      titulo: nota.titulo,
      tipo: nota.tipo,
      peso: nota.peso,
      valor: nota.valor,
      valorMaximo: nota.valorMaximo,
      data: nota.data.slice(0, 10),
      observacao: nota.observacao ?? "",
    })
  }

  const removerNota = async (nota: Nota) => {
    if (!window.confirm(`Excluir a nota "${nota.titulo}"?`)) return
    setErro("")
    setAviso("")
    try {
      await excluirNota(nota.id)
      setAviso("Nota excluída.")
      if (notaMatriculaId) setNotas(await listarNotas(notaMatriculaId))
    } catch (falhaCapturada) {
      falha(falhaCapturada)
    }
  }

  const mediaDaMatricula = (matriculaId: number) => {
    if (matriculaId !== notaMatriculaId) return null
    if (notas.length === 0) return null
    const somaPeso = notas.reduce((total, nota) => total + Number(nota.peso), 0)
    if (somaPeso <= 0) return null
    const media =
      notas.reduce((total, nota) => total + (Number(nota.valor) / Number(nota.valorMaximo)) * 10 * Number(nota.peso), 0) /
      somaPeso
    return Math.round(media * 100) / 100
  }

  const abas: { id: AbaAcademico; label: string }[] = [
    { id: "turmas", label: `Turmas (${turmas.length})` },
    { id: "matriculas", label: `Matrículas (${matriculas.length})` },
    { id: "notas", label: "Notas" },
  ]

  return (
    <MainLayout>
      <Container className="py-10 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--sesi-red)]">Administração</p>
            <h1 className="mt-1 text-3xl font-bold text-[var(--sesi-black)]">Gestão acadêmica</h1>
            <p className="mt-2 text-sm text-[var(--sesi-muted)]">
              Turmas, matrículas e notas no estilo do Moodle. O boletim aparece na Área do aluno.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/gestao" className={botaoSecundario}>Usuários e suporte</Link>
            <Link to="/admin/cursos" className={botaoSecundario}>Administração de cursos</Link>
          </div>
        </div>

        {erro && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
        {aviso && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{aviso}</p>}

        <div className="mt-8 flex flex-wrap gap-2 border-b border-[var(--sesi-gray)]" role="tablist" aria-label="Seções acadêmicas">
          {abas.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={aba === item.id}
              onClick={() => setAba(item.id)}
              className={`border-b-2 px-4 py-3 text-sm font-semibold ${aba === item.id ? "border-[var(--sesi-red)] text-[var(--sesi-red)]" : "border-transparent text-[var(--sesi-muted)]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {carregando ? (
          <p className="py-10 text-sm text-[var(--sesi-muted)]">Carregando gestão acadêmica...</p>
        ) : (
          <>
            {aba === "turmas" && (
              <section role="tabpanel" className="mt-6">
                <form onSubmit={salvarTurma} className="grid gap-3 rounded-xl border border-[var(--sesi-gray)] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-sm font-semibold">Curso
                    <select
                      required
                      value={turmaForm.cursoId || ""}
                      onChange={(evento) => setTurmaForm((atual) => ({ ...atual, cursoId: Number(evento.target.value) }))}
                      className={`${campo} mt-1 font-normal`}
                    >
                      <option value="">Selecione</option>
                      {cursos.map((curso) => (
                        <option key={curso.id} value={curso.id}>{curso.nomeBreve || curso.nomeCompleto}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">Modalidade
                    <select
                      required
                      value={turmaForm.modalidadeId || ""}
                      onChange={(evento) => setTurmaForm((atual) => ({ ...atual, modalidadeId: Number(evento.target.value) }))}
                      className={`${campo} mt-1 font-normal`}
                    >
                      <option value="">Selecione</option>
                      {(facetas?.modalidades ?? []).map((modalidade) => (
                        <option key={modalidade.id} value={modalidade.id}>{modalidade.nome}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">Código da turma
                    <input required maxLength={40} value={turmaForm.codigo} placeholder="Ex.: T1-2026"
                      onChange={(evento) => setTurmaForm((atual) => ({ ...atual, codigo: evento.target.value }))}
                      className={`${campo} mt-1 font-normal`} />
                  </label>
                  <label className="text-sm font-semibold">Vagas
                    <input required type="number" min={1} max={500} value={turmaForm.vagas}
                      onChange={(evento) => setTurmaForm((atual) => ({ ...atual, vagas: Number(evento.target.value) }))}
                      className={`${campo} mt-1 font-normal`} />
                  </label>
                  <label className="text-sm font-semibold">Início
                    <input required type="date" value={turmaForm.dataInicio}
                      onChange={(evento) => setTurmaForm((atual) => ({ ...atual, dataInicio: evento.target.value }))}
                      className={`${campo} mt-1 font-normal`} />
                  </label>
                  <label className="text-sm font-semibold">Fim (opcional)
                    <input type="date" value={turmaForm.dataFim ?? ""}
                      onChange={(evento) => setTurmaForm((atual) => ({ ...atual, dataFim: evento.target.value || null }))}
                      className={`${campo} mt-1 font-normal`} />
                  </label>
                  <label className="text-sm font-semibold">Dias da semana
                    <input required maxLength={60} value={turmaForm.diasSemana} placeholder="Seg,Qua,Sex"
                      onChange={(evento) => setTurmaForm((atual) => ({ ...atual, diasSemana: evento.target.value }))}
                      className={`${campo} mt-1 font-normal`} />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm font-semibold">Início
                      <input required type="time" value={turmaForm.horarioInicio}
                        onChange={(evento) => setTurmaForm((atual) => ({ ...atual, horarioInicio: evento.target.value }))}
                        className={`${campo} mt-1 font-normal`} />
                    </label>
                    <label className="text-sm font-semibold">Término
                      <input required type="time" value={turmaForm.horarioFim}
                        onChange={(evento) => setTurmaForm((atual) => ({ ...atual, horarioFim: evento.target.value }))}
                        className={`${campo} mt-1 font-normal`} />
                    </label>
                  </div>
                  <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
                    <label className="flex items-center gap-2 pb-2.5 text-sm">
                      <input type="checkbox" checked={turmaForm.ativa}
                        onChange={(evento) => setTurmaForm((atual) => ({ ...atual, ativa: evento.target.checked }))}
                        className="h-4 w-4 accent-[var(--sesi-red)]" />
                      Turma ativa
                    </label>
                    <button type="submit" disabled={salvando} className={botao}>
                      {salvando ? "Salvando..." : turmaEditando ? "Atualizar turma" : "Criar turma"}
                    </button>
                    {turmaEditando && (
                      <button type="button" onClick={() => { setTurmaEditando(null); setTurmaForm(turmaVazia()) }} className={botaoSecundario}>
                        Cancelar edição
                      </button>
                    )}
                  </div>
                </form>

                <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--sesi-gray)] bg-white">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-[#F5F5F5] text-xs uppercase text-[var(--sesi-muted)]">
                      <tr>
                        <th className="px-4 py-3">Turma</th>
                        <th className="px-4 py-3">Curso</th>
                        <th className="px-4 py-3">Período</th>
                        <th className="px-4 py-3">Dias/Horário</th>
                        <th className="px-4 py-3">Vagas</th>
                        <th className="px-4 py-3">Situação</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {turmas.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-6 text-center text-[var(--sesi-muted)]">Nenhuma turma criada ainda.</td></tr>
                      )}
                      {turmas.map((turma) => (
                        <tr key={turma.id} className="border-t border-[var(--sesi-gray)]">
                          <td className="px-4 py-3"><strong>{turma.codigo}</strong><p className="text-xs text-[var(--sesi-muted)]">{turma.modalidadeNome}</p></td>
                          <td className="px-4 py-3">{nomeCurso.get(turma.cursoId) ?? `Curso ${turma.cursoId}`}</td>
                          <td className="px-4 py-3">{turma.dataInicio}{turma.dataFim ? ` → ${turma.dataFim}` : ""}</td>
                          <td className="px-4 py-3">{turma.diasSemana} · {turma.horarioInicio}–{turma.horarioFim}</td>
                          <td className="px-4 py-3">{turma.inscritos}/{turma.vagas}</td>
                          <td className="px-4 py-3">{turma.ativa ? "Ativa" : "Inativa"}</td>
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => editarTurma(turma)} className="px-2 font-semibold text-[var(--sesi-red)]">Editar</button>
                            <button type="button" onClick={() => void removerTurma(turma)} className="px-2 font-semibold text-red-700">Excluir</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {aba === "matriculas" && (
              <section role="tabpanel" className="mt-6">
                <form onSubmit={salvarMatricula} className="grid gap-3 rounded-xl border border-[var(--sesi-gray)] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-sm font-semibold">Aluno (e-mail)
                    <input required list="alunos-cadastrados" value={matriculaForm.usuarioId} placeholder="aluno@exemplo.com"
                      onChange={(evento) => setMatriculaForm((atual) => ({ ...atual, usuarioId: evento.target.value }))}
                      className={`${campo} mt-1 font-normal`} />
                    <datalist id="alunos-cadastrados">
                      {usuarios.map((usuario) => (
                        <option key={usuario.id} value={usuario.email}>{usuario.nome}</option>
                      ))}
                    </datalist>
                  </label>
                  <label className="text-sm font-semibold">Turma
                    <select required value={matriculaForm.turmaId || ""}
                      onChange={(evento) => setMatriculaForm((atual) => ({ ...atual, turmaId: Number(evento.target.value) }))}
                      className={`${campo} mt-1 font-normal`}>
                      <option value="">Selecione</option>
                      {turmas.map((turma) => (
                        <option key={turma.id} value={turma.id}>
                          {turma.codigo} · {nomeCurso.get(turma.cursoId) ?? turma.cursoId}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">Status
                    <select value={matriculaForm.status}
                      onChange={(evento) => setMatriculaForm((atual) => ({ ...atual, status: evento.target.value }))}
                      className={`${campo} mt-1 font-normal`}>
                      {STATUS_MATRICULA.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">Progresso (%)
                    <input type="number" min={0} max={100} value={matriculaForm.progresso}
                      onChange={(evento) => setMatriculaForm((atual) => ({ ...atual, progresso: Number(evento.target.value) }))}
                      className={`${campo} mt-1 font-normal`} />
                  </label>
                  <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
                    <label className="flex items-center gap-2 pb-2.5 text-sm">
                      <input type="checkbox" checked={matriculaForm.concluido}
                        onChange={(evento) => setMatriculaForm((atual) => ({ ...atual, concluido: evento.target.checked }))}
                        className="h-4 w-4 accent-[var(--sesi-red)]" />
                      Curso concluído
                    </label>
                    <button type="submit" disabled={salvando} className={botao}>
                      {salvando ? "Salvando..." : matriculaEditando ? "Atualizar matrícula" : "Matricular aluno"}
                    </button>
                    {matriculaEditando && (
                      <button type="button"
                        onClick={() => { setMatriculaEditando(null); setMatriculaForm({ usuarioId: "", turmaId: 0, status: "ativa", progresso: 0, concluido: false }) }}
                        className={botaoSecundario}>
                        Cancelar edição
                      </button>
                    )}
                  </div>
                </form>

                <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--sesi-gray)] bg-white">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-[#F5F5F5] text-xs uppercase text-[var(--sesi-muted)]">
                      <tr>
                        <th className="px-4 py-3">Aluno</th>
                        <th className="px-4 py-3">Curso / Turma</th>
                        <th className="px-4 py-3">Matrícula</th>
                        <th className="px-4 py-3">Progresso</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matriculas.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-6 text-center text-[var(--sesi-muted)]">Nenhuma matrícula registrada.</td></tr>
                      )}
                      {matriculas.map((matricula) => (
                        <tr key={matricula.id} className="border-t border-[var(--sesi-gray)]">
                          <td className="px-4 py-3">
                            <strong>{matricula.usuarioNome ?? matricula.usuarioId}</strong>
                            {matricula.usuarioNome && <p className="text-xs text-[var(--sesi-muted)]">{matricula.usuarioId}</p>}
                          </td>
                          <td className="px-4 py-3">{matricula.cursoNome}<p className="text-xs text-[var(--sesi-muted)]">Turma {matricula.turmaCodigo}</p></td>
                          <td className="px-4 py-3">{new Date(matricula.dataMatricula).toLocaleDateString("pt-BR")}</td>
                          <td className="px-4 py-3">{matricula.progresso}%{matricula.concluido ? " · concluído" : ""}</td>
                          <td className="px-4 py-3 capitalize">{matricula.status}</td>
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => { setAba("notas"); setNotaMatriculaId(matricula.id); setNotaEditando(null); setNotaForm(notaVazia()) }}
                              className="px-2 font-semibold text-[var(--sesi-red)]">Notas</button>
                            <button type="button" onClick={() => editarMatricula(matricula)} className="px-2 font-semibold text-[var(--sesi-red)]">Editar</button>
                            <button type="button" onClick={() => void removerMatricula(matricula)} className="px-2 font-semibold text-red-700">Excluir</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {aba === "notas" && (
              <section role="tabpanel" className="mt-6">
                <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                  <div className="rounded-xl border border-[var(--sesi-gray)] bg-white p-4">
                    <label className="text-sm font-semibold">Matrícula
                      <select value={notaMatriculaId ?? ""}
                        onChange={(evento) => {
                          const id = evento.target.value ? Number(evento.target.value) : null
                          setNotaMatriculaId(id)
                          setNotaEditando(null)
                          setNotaForm(notaVazia())
                        }}
                        className={`${campo} mt-1 font-normal`}>
                        <option value="">Selecione</option>
                        {matriculas.map((matricula) => (
                          <option key={matricula.id} value={matricula.id}>
                            {matricula.usuarioNome ?? matricula.usuarioId} · {matricula.turmaCodigo}
                          </option>
                        ))}
                      </select>
                    </label>

                    {matriculaSelecionada && (
                      <dl className="mt-4 space-y-1 text-sm">
                        <div><dt className="inline font-semibold">Curso: </dt><dd className="inline">{matriculaSelecionada.cursoNome}</dd></div>
                        <div><dt className="inline font-semibold">Aluno: </dt><dd className="inline">{matriculaSelecionada.usuarioNome ?? matriculaSelecionada.usuarioId}</dd></div>
                        <div><dt className="inline font-semibold">Média atual: </dt><dd className="inline">{mediaDaMatricula(matriculaSelecionada.id) ?? "sem notas"}</dd></div>
                      </dl>
                    )}
                  </div>

                  <div className="rounded-xl border border-[var(--sesi-gray)] bg-white p-4">
                    {!notaMatriculaId ? (
                      <p className="text-sm text-[var(--sesi-muted)]">Selecione uma matrícula para lançar e editar as notas.</p>
                    ) : (
                      <>
                        <form onSubmit={salvarNota} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <label className="text-sm font-semibold sm:col-span-2">Título
                            <input required maxLength={200} value={notaForm.titulo} placeholder="Prova bimestral"
                              onChange={(evento) => setNotaForm((atual) => ({ ...atual, titulo: evento.target.value }))}
                              className={`${campo} mt-1 font-normal`} />
                          </label>
                          <label className="text-sm font-semibold">Tipo
                            <select value={notaForm.tipo}
                              onChange={(evento) => setNotaForm((atual) => ({ ...atual, tipo: evento.target.value }))}
                              className={`${campo} mt-1 font-normal`}>
                              {TIPOS_NOTA.map((tipo) => <option key={tipo}>{tipo}</option>)}
                            </select>
                          </label>
                          <label className="text-sm font-semibold">Data
                            <input type="date" value={notaForm.data ?? ""}
                              onChange={(evento) => setNotaForm((atual) => ({ ...atual, data: evento.target.value }))}
                              className={`${campo} mt-1 font-normal`} />
                          </label>
                          <label className="text-sm font-semibold">Nota
                            <input required type="number" step="0.01" min={0} value={notaForm.valor}
                              onChange={(evento) => setNotaForm((atual) => ({ ...atual, valor: Number(evento.target.value) }))}
                              className={`${campo} mt-1 font-normal`} />
                          </label>
                          <label className="text-sm font-semibold">Valor máximo
                            <input required type="number" step="0.01" min={0.01} value={notaForm.valorMaximo}
                              onChange={(evento) => setNotaForm((atual) => ({ ...atual, valorMaximo: Number(evento.target.value) }))}
                              className={`${campo} mt-1 font-normal`} />
                          </label>
                          <label className="text-sm font-semibold">Peso
                            <input required type="number" step="0.1" min={0.1} value={notaForm.peso}
                              onChange={(evento) => setNotaForm((atual) => ({ ...atual, peso: Number(evento.target.value) }))}
                              className={`${campo} mt-1 font-normal`} />
                          </label>
                          <label className="text-sm font-semibold">Observação
                            <input maxLength={1000} value={notaForm.observacao ?? ""}
                              onChange={(evento) => setNotaForm((atual) => ({ ...atual, observacao: evento.target.value }))}
                              className={`${campo} mt-1 font-normal`} />
                          </label>
                          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
                            <button type="submit" disabled={salvando} className={botao}>
                              {salvando ? "Salvando..." : notaEditando ? "Atualizar nota" : "Lançar nota"}
                            </button>
                            {notaEditando && (
                              <button type="button" onClick={() => { setNotaEditando(null); setNotaForm(notaVazia()) }} className={botaoSecundario}>
                                Cancelar edição
                              </button>
                            )}
                          </div>
                        </form>

                        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--sesi-gray)]">
                          <table className="w-full min-w-[640px] text-left text-sm">
                            <thead className="bg-[#F5F5F5] text-xs uppercase text-[var(--sesi-muted)]">
                              <tr>
                                <th className="px-4 py-3">Título</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3">Nota</th>
                                <th className="px-4 py-3">Peso</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {notas.length === 0 && (
                                <tr><td colSpan={6} className="px-4 py-6 text-center text-[var(--sesi-muted)]">Nenhuma nota lançada.</td></tr>
                              )}
                              {notas.map((nota) => (
                                <tr key={nota.id} className="border-t border-[var(--sesi-gray)]">
                                  <td className="px-4 py-3"><strong>{nota.titulo}</strong>{nota.observacao && <p className="text-xs text-[var(--sesi-muted)]">{nota.observacao}</p>}</td>
                                  <td className="px-4 py-3">{nota.tipo}</td>
                                  <td className="px-4 py-3">{new Date(nota.data).toLocaleDateString("pt-BR")}</td>
                                  <td className="px-4 py-3">{nota.valor} / {nota.valorMaximo}</td>
                                  <td className="px-4 py-3">{nota.peso}</td>
                                  <td className="px-4 py-3 text-right">
                                    <button type="button" onClick={() => editarNota(nota)} className="px-2 font-semibold text-[var(--sesi-red)]">Editar</button>
                                    <button type="button" onClick={() => void removerNota(nota)} className="px-2 font-semibold text-red-700">Excluir</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </Container>
    </MainLayout>
  )
}
