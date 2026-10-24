export interface Categoria {
  id: number
  nome: string
  slug: string
  iconeUrl: string
  cor: string
  ordem: number
}

export interface Modalidade {
  id: number
  nome: string
  slug: string
}

export interface StatusCurso {
  id: number
  nome: string
  slug: string
}

export interface AulaDto {
  id: number
  moduloId: number
  ordem: number
  titulo: string
  descricao: string
  duracaoMinutos: number
  videoUrl?: string
}

export interface ModuloDto {
  id: number
  cursoId: number
  ordem: number
  titulo: string
  descricao: string
  aulas: AulaDto[]
}

export interface CursoResumoDto {
  id: number
  nomeCompleto: string
  nomeBreve: string
  slug: string
  descricao: string
  cargaHoraria: number
  publicoAlvo: string
  imagemUrl: string
  dataDisponibilizacao?: string
  dataPublicacao?: string | null
  dataLiberacaoMatricula?: string | null
  etapaDesenvolvimento: "Rascunho" | "Homologado" | "Publicado"
  destaque: boolean
  categoria: Categoria
  modalidade: Modalidade
  status: StatusCurso
}

export interface CursoDetalheDto extends CursoResumoDto {
  modulos: ModuloDto[]
}

export interface FacetasDto {
  categorias: Categoria[]
  modalidades: Modalidade[]
  status: StatusCurso[]
}

export interface TurmaDto {
  id: number
  cursoId: number
  codigo: string
  modalidade: Modalidade
  dataInicio: string
  dataFim?: string
  diasSemana: string
  horarioInicio: string
  horarioFim: string
  vagas: number
  inscritos: number
  ativa: boolean
}

export interface MatriculaDto {
  id: number
  usuarioId: string
  dataMatricula: string
  status: string
  progresso: number
  concluido: boolean
  curso: CursoResumoDto
  turma: TurmaDto
}

export interface ModuloSalvarDto {
  titulo: string
  descricao?: string
  aulas: string[]
}

export interface CursoSalvarRequest {
  nomeCompleto: string
  nomeBreve: string
  slug: string
  descricao: string
  cargaHoraria: number
  publicoAlvo: string
  imagemUrl: string
  dataDisponibilizacao?: string | null
  dataPublicacao?: string | null
  dataLiberacaoMatricula?: string | null
  etapaDesenvolvimento: "Rascunho" | "Homologado" | "Publicado"
  destaque: boolean
  categoriaSlug: string
  modalidadeSlug: string
  statusSlug: string
  modulos?: ModuloSalvarDto[]
}

export interface PaginaDto<T> {
  itens: T[]
  total: number
  pagina: number
  tamanho: number
  facetas: FacetasDto
}

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5077"

/** Erro com o status HTTP, para diferenciar "não encontrado" de "sem conexão". */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = "ApiError"
  }
}

export async function listarCursos(params: Record<string, string | number | undefined> = {}): Promise<PaginaDto<CursoResumoDto>> {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value))
  })
  const res = await fetch(`${API_URL}/api/v1/cursos?${search.toString()}`)
  if (!res.ok) throw new ApiError("Falha ao listar cursos", res.status)
  return res.json()
}

export async function obterCurso(slug: string): Promise<CursoDetalheDto> {
  const res = await fetch(`${API_URL}/api/v1/cursos/${slug}`)
  if (!res.ok) throw new ApiError("Falha ao obter curso", res.status)
  return res.json()
}

export async function obterFacetas(): Promise<FacetasDto> {
  const res = await fetch(`${API_URL}/api/v1/facetas`)
  if (!res.ok) throw new ApiError("Falha ao obter facetas", res.status)
  return res.json()
}

async function requisitar<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    let mensagem = `Falha na requisição (${res.status})`
    try {
      const corpo = (await res.json()) as { erro?: string }
      if (corpo.erro) mensagem = corpo.erro
    } catch {
      // resposta sem JSON: mantém a mensagem padrão
    }
    throw new ApiError(mensagem, res.status)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export function listarTurmas(slug: string): Promise<TurmaDto[]> {
  return requisitar<TurmaDto[]>(`${API_URL}/api/v1/cursos/${encodeURIComponent(slug)}/turmas`)
}

export function criarMatricula(payload: {
  cursoSlug: string
  turmaId: number
  usuarioId: string
}): Promise<MatriculaDto> {
  return requisitar<MatriculaDto>(`${API_URL}/api/v1/matriculas`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function listarMatriculas(usuarioId: string): Promise<MatriculaDto[]> {
  return requisitar<MatriculaDto[]>(
    `${API_URL}/api/v1/matriculas?usuarioId=${encodeURIComponent(usuarioId)}`,
  )
}

export function criarCurso(payload: CursoSalvarRequest): Promise<CursoDetalheDto> {
  return requisitar<CursoDetalheDto>(`${API_URL}/api/v1/cursos`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function atualizarCurso(slug: string, payload: CursoSalvarRequest): Promise<CursoDetalheDto> {
  return requisitar<CursoDetalheDto>(`${API_URL}/api/v1/cursos/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export function excluirCurso(slug: string): Promise<void> {
  return requisitar<void>(`${API_URL}/api/v1/cursos/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  })
}
