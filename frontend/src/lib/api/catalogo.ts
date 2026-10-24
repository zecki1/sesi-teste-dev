import { idiomaAtual } from "@/lib/i18n/idioma"

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
  perguntas?: PerguntaFrequenteDto[]
  avaliacao?: AvaliacaoResumoDto
}

/** Média e quantidade de avaliações publicadas de um curso. */
export interface AvaliacaoResumoDto {
  media: number
  total: number
}

/** Avaliação de um curso já publicada (home e página do curso). */
export interface AvaliacaoDto {
  id: number
  cursoSlug: string
  cursoNome: string
  nome: string
  nota: number
  depoimento: string
  notaPlataforma: number
  notaCurso: number
  notaAvaliacao: number
  notaAcessibilidade: number
  sugestao: string
  criadoEm: string
}

/** Nota + depoimento + pesquisa de satisfação enviados pelo aluno logado. */
export interface CriarAvaliacaoRequest {
  cursoSlug: string
  usuarioId: string
  nome: string
  nota: number
  depoimento?: string
  notaPlataforma: number
  notaCurso: number
  notaAvaliacao: number
  notaAcessibilidade: number
  sugestao?: string
  idioma?: string
}

/** Pergunta frequente já traduzida para o idioma atual da interface. */
export interface PerguntaFrequenteDto {
  id: number
  pergunta: string
  resposta: string
}

/** Pergunta frequente na visão da gestão, com os três idiomas. */
export interface PerguntaAdminDto {
  id: number
  ordem: number
  ativa: boolean
  perguntaPt: string
  respostaPt: string
  perguntaEn: string
  respostaEn: string
  perguntaEs: string
  respostaEs: string
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

/**
 * Idioma da interface no formato aceito pela API (pt-BR, en-US, es-ES).
 * Lido no momento da requisição para refletir a troca de idioma sem recarregar a página.
 */
function idiomaDaRequisicao(): string {
  const bruto = idiomaAtual().replace("_", "-").toLowerCase()
  if (bruto.startsWith("en")) return "en-US"
  if (bruto.startsWith("es")) return "es-ES"
  return "pt-BR"
}

/**
 * Cabeçalhos que informam o idioma desejado para a API.
 * `Accept-Language` é um cabeçalho liberado pelo CORS, então não gera preflight.
 */
function cabecalhosIdioma(extras?: HeadersInit): HeadersInit {
  return {
    "Accept-Language": idiomaDaRequisicao(),
    ...(extras ?? {}),
  }
}

export async function listarCursos(params: Record<string, string | number | undefined> = {}): Promise<PaginaDto<CursoResumoDto>> {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value))
  })
  const res = await fetch(`${API_URL}/api/v1/cursos?${search.toString()}`, {
    headers: cabecalhosIdioma(),
  })
  if (!res.ok) throw new ApiError("Falha ao listar cursos", res.status)
  return res.json()
}

export async function obterCurso(slug: string): Promise<CursoDetalheDto> {
  const res = await fetch(`${API_URL}/api/v1/cursos/${encodeURIComponent(slug)}`, {
    headers: cabecalhosIdioma(),
  })
  if (!res.ok) throw new ApiError("Falha ao obter curso", res.status)
  return res.json()
}

export async function obterFacetas(): Promise<FacetasDto> {
  const res = await fetch(`${API_URL}/api/v1/facetas`, { headers: cabecalhosIdioma() })
  if (!res.ok) throw new ApiError("Falha ao obter facetas", res.status)
  return res.json()
}

export async function listarAvaliacoes(
  params: { cursoSlug?: string; limite?: number } = {},
): Promise<AvaliacaoDto[]> {
  const search = new URLSearchParams()
  if (params.cursoSlug) search.set("cursoSlug", params.cursoSlug)
  if (params.limite) search.set("limite", String(params.limite))
  const res = await fetch(`${API_URL}/api/v1/avaliacoes?${search.toString()}`, {
    headers: cabecalhosIdioma(),
  })
  if (!res.ok) throw new ApiError("Falha ao listar avaliações", res.status)
  return res.json()
}

export function criarAvaliacao(payload: CriarAvaliacaoRequest): Promise<AvaliacaoDto> {
  return requisitar<AvaliacaoDto>(`${API_URL}/api/v1/avaliacoes`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

async function requisitar<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: cabecalhosIdioma({
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    }),
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

export function listarPerguntasCurso(slug: string): Promise<PerguntaAdminDto[]> {
  return requisitar<PerguntaAdminDto[]>(
    `${API_URL}/api/v1/cursos/${encodeURIComponent(slug)}/perguntas`,
  )
}

export function salvarPerguntasCurso(
  slug: string,
  perguntas: PerguntaAdminDto[],
): Promise<PerguntaAdminDto[]> {
  return requisitar<PerguntaAdminDto[]>(
    `${API_URL}/api/v1/cursos/${encodeURIComponent(slug)}/perguntas`,
    { method: "PUT", body: JSON.stringify({ perguntas }) },
  )
}

export interface CategoriaAdminDto {
  id: number
  nome: string
  slug: string
  iconeUrl: string
  cor: string
  ordem: number
  cursos: number
  nomeEn: string
  nomeEs: string
}

export interface CategoriaSalvarRequest {
  nome: string
  slug?: string | null
  cor?: string | null
  iconeUrl?: string | null
  ordem?: number | null
  nomeEn?: string | null
  nomeEs?: string | null
}

export interface CategoriaSimilarDto {
  id: number
  nome: string
  slug: string
  cor: string
  similaridade: number
}

export function listarCategoriasAdmin(): Promise<CategoriaAdminDto[]> {
  return requisitar<CategoriaAdminDto[]>(`${API_URL}/api/v1/categorias`)
}

export function criarCategoria(payload: CategoriaSalvarRequest): Promise<CategoriaAdminDto> {
  return requisitar<CategoriaAdminDto>(`${API_URL}/api/v1/categorias`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function atualizarCategoria(
  id: number,
  payload: CategoriaSalvarRequest,
): Promise<CategoriaAdminDto> {
  return requisitar<CategoriaAdminDto>(`${API_URL}/api/v1/categorias/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export function excluirCategoria(id: number): Promise<void> {
  return requisitar<void>(`${API_URL}/api/v1/categorias/${id}`, { method: "DELETE" })
}

export function buscarCategoriasSimilares(
  nome: string,
  ignorarId?: number,
): Promise<CategoriaSimilarDto[]> {
  const params = new URLSearchParams({ nome })
  if (ignorarId) params.set("ignorarId", String(ignorarId))
  return requisitar<CategoriaSimilarDto[]>(
    `${API_URL}/api/v1/categorias/similares?${params.toString()}`,
  )
}
