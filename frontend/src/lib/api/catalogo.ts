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

export interface PaginaDto<T> {
  itens: T[]
  total: number
  pagina: number
  tamanho: number
  facetas: FacetasDto
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5077"

export async function listarCursos(params: Record<string, string | number | undefined> = {}): Promise<PaginaDto<CursoResumoDto>> {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value))
  })
  const res = await fetch(`${API_URL}/api/v1/cursos?${search.toString()}`)
  if (!res.ok) throw new Error("Falha ao listar cursos")
  return res.json()
}

export async function obterCurso(slug: string): Promise<CursoDetalheDto> {
  const res = await fetch(`${API_URL}/api/v1/cursos/${slug}`)
  if (!res.ok) throw new Error("Falha ao obter curso")
  return res.json()
}

export async function obterFacetas(): Promise<FacetasDto> {
  const res = await fetch(`${API_URL}/api/v1/facetas`)
  if (!res.ok) throw new Error("Falha ao obter facetas")
  return res.json()
}
