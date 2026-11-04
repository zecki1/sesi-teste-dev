import { API_URL } from "./catalogo"

/** Nota lançada em uma matrícula. */
export interface Nota {
  id: number
  matriculaId: number
  titulo: string
  tipo: string
  peso: number
  valor: number
  valorMaximo: number
  data: string
  observacao?: string | null
}

export interface SalvarNotaRequest {
  titulo: string
  tipo: string
  peso: number
  valor: number
  valorMaximo: number
  data?: string | null
  observacao?: string | null
}

/** Turma na visão administrativa. */
export interface TurmaAdmin {
  id: number
  cursoId: number
  codigo: string
  modalidadeId: number
  modalidadeNome: string
  dataInicio: string
  dataFim?: string | null
  diasSemana: string
  horarioInicio: string
  horarioFim: string
  vagas: number
  inscritos: number
  ativa: boolean
}

export interface SalvarTurmaRequest {
  cursoId: number
  modalidadeId: number
  codigo: string
  dataInicio: string
  dataFim?: string | null
  diasSemana: string
  horarioInicio: string
  horarioFim: string
  vagas: number
  ativa: boolean
}

/** Matrícula na visão administrativa. */
export interface MatriculaAdmin {
  id: number
  usuarioId: string
  usuarioNome?: string | null
  cursoId: number
  cursoSlug: string
  cursoNome: string
  turmaId: number
  turmaCodigo: string
  dataMatricula: string
  status: string
  progresso: number
  concluido: boolean
}

export interface SalvarMatriculaAdminRequest {
  usuarioId: string
  turmaId: number
  status?: string | null
  progresso?: number | null
  concluido?: boolean | null
}

/** Boletim de um curso do aluno. */
export interface BoletimCurso {
  matriculaId: number
  turmaId: number
  cursoSlug: string
  cursoNome: string
  turmaCodigo: string
  status: string
  progresso: number
  concluido: boolean
  notas: Nota[]
  mediaFinal: number
}

export interface Boletim {
  usuarioId: string
  cursos: BoletimCurso[]
}

async function requisitar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`${API_URL}/api/v1${caminho}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })
  if (!resposta.ok) {
    let mensagem = `Falha na requisição (${resposta.status}).`
    try {
      const corpo = (await resposta.json()) as { erro?: string }
      mensagem = corpo.erro ?? mensagem
    } catch {
      // A resposta pode não conter JSON.
    }
    throw new Error(mensagem)
  }
  if (resposta.status === 204) return undefined as T
  return (await resposta.json()) as T
}

// ---------- Turmas ----------

export function listarTurmasAdmin() {
  return requisitar<TurmaAdmin[]>("/gestao/turmas")
}

export function criarTurmaAdmin(dados: SalvarTurmaRequest) {
  return requisitar<TurmaAdmin>("/gestao/turmas", {
    method: "POST",
    body: JSON.stringify(dados),
  })
}

export function atualizarTurmaAdmin(id: number, dados: SalvarTurmaRequest) {
  return requisitar<TurmaAdmin>(`/gestao/turmas/${id}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  })
}

export function excluirTurmaAdmin(id: number) {
  return requisitar<void>(`/gestao/turmas/${id}`, { method: "DELETE" })
}

// ---------- Matrículas ----------

export function listarMatriculasAdmin(filtros?: { turmaId?: number; cursoSlug?: string }) {
  const params = new URLSearchParams()
  if (filtros?.turmaId) params.set("turmaId", String(filtros.turmaId))
  if (filtros?.cursoSlug) params.set("cursoSlug", filtros.cursoSlug)
  const query = params.toString()
  return requisitar<MatriculaAdmin[]>(`/gestao/matriculas${query ? `?${query}` : ""}`)
}

export function criarMatriculaAdmin(dados: SalvarMatriculaAdminRequest) {
  return requisitar<MatriculaAdmin>("/gestao/matriculas", {
    method: "POST",
    body: JSON.stringify(dados),
  })
}

export function atualizarMatriculaAdmin(id: number, dados: SalvarMatriculaAdminRequest) {
  return requisitar<MatriculaAdmin>(`/gestao/matriculas/${id}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  })
}

export function excluirMatriculaAdmin(id: number) {
  return requisitar<void>(`/gestao/matriculas/${id}`, { method: "DELETE" })
}

// ---------- Notas ----------

export function listarNotas(matriculaId: number) {
  return requisitar<Nota[]>(`/gestao/matriculas/${matriculaId}/notas`)
}

export function criarNota(matriculaId: number, dados: SalvarNotaRequest) {
  return requisitar<Nota>(`/gestao/matriculas/${matriculaId}/notas`, {
    method: "POST",
    body: JSON.stringify(dados),
  })
}

export function atualizarNota(matriculaId: number, id: number, dados: SalvarNotaRequest) {
  return requisitar<Nota>(`/gestao/matriculas/${matriculaId}/notas/${id}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  })
}

export function excluirNota(id: number) {
  return requisitar<void>(`/gestao/notas/${id}`, { method: "DELETE" })
}

// ---------- Boletim ----------

export function perguntarTutor(
  mensagem: string,
  usuarioId?: string,
  nomeAluno?: string,
  historico?: { papel: string; texto: string }[],
  contexto?: string,
) {
  return requisitar<{ resposta: string }>("/tutor", {
    method: "POST",
    body: JSON.stringify({ mensagem, usuarioId, nomeAluno, historico, contexto }),
  })
}

export function obterHistoricoTutor(usuarioId: string) {
  return requisitar<{ id: number; papel: string; texto: string; criadoEm: string }[]>(`/tutor/historico?usuarioId=${encodeURIComponent(usuarioId)}`)
}

export function limparHistoricoTutor(usuarioId: string) {
  return requisitar<void>(`/tutor/historico?usuarioId=${encodeURIComponent(usuarioId)}`, { method: "DELETE" })
}

export function obterBoletim(usuarioId: string) {
  return requisitar<Boletim>(`/boletim?usuarioId=${encodeURIComponent(usuarioId)}`)
}

// ---------- Comunidade da turma ----------

export interface MensagemComunidade {
  id: number
  turmaId: number
  usuarioId: string
  usuarioNome: string
  canal: "forum" | "chat" | "plantao"
  titulo?: string | null
  conteudo: string
  parentId?: number | null
  criadoEm: string
}

export interface EnviarMensagemComunidadeRequest {
  turmaId: number
  usuarioId: string
  usuarioNome: string
  canal: "forum" | "chat" | "plantao"
  titulo?: string | null
  conteudo: string
  parentId?: number | null
}

export function listarComunidade(turmaId: number, canal: "forum" | "chat" | "plantao") {
  return requisitar<MensagemComunidade[]>(`/gestao/turmas/${turmaId}/comunidade?canal=${canal}`)
}

export function enviarComunidade(dados: EnviarMensagemComunidadeRequest) {
  return requisitar<MensagemComunidade>(`/gestao/turmas/${dados.turmaId}/comunidade`, {
    method: "POST",
    body: JSON.stringify(dados),
  })
}

// ---------- Aulas ao vivo ----------
export interface AulaAoVivo {
  id: number
  turmaId: number
  titulo: string
  descricao?: string | null
  dataHora: string
  duracaoMinutos: number
  sala: string
  urlSala: string
  presentes: number
}

export interface SalvarAulaAoVivoRequest {
  turmaId: number
  titulo: string
  descricao?: string | null
  dataHora: string
  duracaoMinutos: number
}

export function listarAulasAoVivo(turmaId: number) {
  return requisitar<AulaAoVivo[]>(`/gestao/turmas/${turmaId}/aulas-ao-vivo`)
}

export function criarAulaAoVivo(dados: SalvarAulaAoVivoRequest) {
  return requisitar<AulaAoVivo>(`/gestao/turmas/${dados.turmaId}/aulas-ao-vivo`, {
    method: "POST",
    body: JSON.stringify(dados),
  })
}

export function registrarPresencaAula(aulaId: number, usuarioId: string, presente = true) {
  return requisitar<{ aulaAoVivoId: number; usuarioId: string; presente: boolean; registradoEm: string }>(
    `/gestao/aulas-ao-vivo/${aulaId}/presenca`,
    { method: "POST", body: JSON.stringify({ usuarioId, presente }) },
  )
}
