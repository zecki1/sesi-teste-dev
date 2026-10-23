import { API_URL } from "@/lib/api/catalogo"

export interface PacoteScormDto {
  id: string
  cursoSlug: string
  nomeArquivo: string
  tamanho: number
  versao: string
  entryFile: string
  criadoEm: string
  conteudoUrl: string
  lancamentoUrl: string
}

export interface ProgressoScormDto {
  cursoSlug: string
  usuarioId: string
  suspendData?: string | null
  lessonStatus?: string | null
  lessonLocation?: string | null
  score?: number | null
  cmiDataJson?: string | null
  percentual: number
  atualizadoEm: string
}

/** Converte os caminhos relativos devolvidos pela API em URL absoluta do backend. */
export function urlBackend(caminho: string) {
  if (!caminho) return caminho
  if (/^https?:\/\//i.test(caminho)) return caminho
  return `${API_URL}${caminho.startsWith("/") ? "" : "/"}${caminho}`
}

export async function obterPacoteScorm(cursoSlug: string): Promise<PacoteScormDto | null> {
  const resposta = await fetch(`${API_URL}/api/v1/scorm/pacotes/${encodeURIComponent(cursoSlug)}`)
  if (resposta.status === 404) return null
  if (!resposta.ok) throw new Error("Não foi possível consultar o pacote SCORM.")
  return (await resposta.json()) as PacoteScormDto
}

export async function enviarPacoteScorm(
  cursoSlug: string,
  arquivo: File,
  versao: "1.2" | "2004",
): Promise<PacoteScormDto> {
  const formulario = new FormData()
  formulario.append("arquivo", arquivo)
  formulario.append("cursoSlug", cursoSlug)
  formulario.append("versao", versao)

  const resposta = await fetch(`${API_URL}/api/v1/scorm/pacotes`, {
    method: "POST",
    body: formulario,
  })

  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null
    throw new Error(corpo?.erro ?? "Falha ao enviar o pacote SCORM.")
  }

  return (await resposta.json()) as PacoteScormDto
}

export async function obterProgressoScorm(
  cursoSlug: string,
  usuarioId: string,
): Promise<ProgressoScormDto | null> {
  const url = new URL(`${API_URL}/api/v1/scorm/progresso`)
  url.searchParams.set("cursoSlug", cursoSlug)
  url.searchParams.set("usuarioId", usuarioId)

  const resposta = await fetch(url)
  if (resposta.status === 404) return null
  if (!resposta.ok) throw new Error("Não foi possível consultar o progresso SCORM.")
  return (await resposta.json()) as ProgressoScormDto
}

export async function reiniciarProgressoScorm(
  cursoSlug: string,
  usuarioId: string,
): Promise<ProgressoScormDto> {
  const url = new URL(`${API_URL}/api/v1/scorm/progresso/reiniciar`)
  url.searchParams.set("cursoSlug", cursoSlug)
  url.searchParams.set("usuarioId", usuarioId)

  const resposta = await fetch(url, { method: "POST" })
  if (!resposta.ok) throw new Error("Não foi possível reiniciar o conteúdo SCORM.")
  return (await resposta.json()) as ProgressoScormDto
}

export function urlPlayerScorm(pacote: PacoteScormDto, usuarioId: string) {
  const separador = pacote.lancamentoUrl.includes("?") ? "&" : "?"
  return urlBackend(
    `${pacote.lancamentoUrl}${separador}usuarioId=${encodeURIComponent(usuarioId || "anonimo")}`,
  )
}
