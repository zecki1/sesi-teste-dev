import { API_URL } from "@/lib/api/catalogo"
import type { ScormPaginaConfig } from "./scorm-config"

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

export interface ScormConfiguracaoDto {
  limiteUploadMb: number
}

export interface ScormPaginaConfigDto {
  titulo: string
  subtitulo: string
  descricao: string
  bannerUrl: string
  imagemUrl: string
  cargaHoraria: number
  botaoTexto: string
}

const mensagemErro = async (resposta: Response, padrao: string) => {
  const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null
  return corpo?.erro ?? padrao
}

/** Converte os caminhos relativos devolvidos pela API em URL absoluta do backend. */
export function urlBackend(caminho: string) {
  if (!caminho) return caminho
  if (/^https?:\/\//i.test(caminho)) return caminho
  return `${API_URL}${caminho.startsWith("/") ? "" : "/"}${caminho}`
}

export async function obterConfiguracaoScorm(): Promise<ScormConfiguracaoDto> {
  const resposta = await fetch(`${API_URL}/api/v1/scorm/configuracoes`)
  if (!resposta.ok) throw new Error(await mensagemErro(resposta, "Não foi possível consultar o limite de upload SCORM."))
  return (await resposta.json()) as ScormConfiguracaoDto
}

export async function salvarLimiteScorm(limiteUploadMb: number): Promise<ScormConfiguracaoDto> {
  const resposta = await fetch(`${API_URL}/api/v1/scorm/configuracoes`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limiteUploadMb }),
  })
  if (!resposta.ok) throw new Error(await mensagemErro(resposta, "Não foi possível salvar o limite de upload SCORM."))
  return (await resposta.json()) as ScormConfiguracaoDto
}

export async function obterConfiguracaoPaginaScorm(cursoSlug: string): Promise<ScormPaginaConfigDto | null> {
  const resposta = await fetch(`${API_URL}/api/v1/scorm/paginas/${encodeURIComponent(cursoSlug)}`)
  if (resposta.status === 404) return null
  if (!resposta.ok) throw new Error(await mensagemErro(resposta, "Não foi possível consultar a página SCORM."))
  return (await resposta.json()) as ScormPaginaConfigDto
}

export async function salvarConfiguracaoPaginaScorm(
  cursoSlug: string,
  configuracao: ScormPaginaConfig,
): Promise<ScormPaginaConfigDto> {
  const corpo: ScormPaginaConfigDto = {
    titulo: configuracao.titulo,
    subtitulo: configuracao.subtitulo,
    descricao: configuracao.descricao,
    bannerUrl: configuracao.bannerUrl,
    imagemUrl: configuracao.imagemUrl,
    cargaHoraria: configuracao.cargaHoraria,
    botaoTexto: configuracao.botaoTexto,
  }
  const resposta = await fetch(`${API_URL}/api/v1/scorm/paginas/${encodeURIComponent(cursoSlug)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  })
  if (!resposta.ok) throw new Error(await mensagemErro(resposta, "Não foi possível salvar a página SCORM."))
  return (await resposta.json()) as ScormPaginaConfigDto
}

export async function obterPacoteScorm(cursoSlug: string): Promise<PacoteScormDto | null> {
  const resposta = await fetch(`${API_URL}/api/v1/scorm/pacotes/${encodeURIComponent(cursoSlug)}`)
  if (resposta.status === 404) return null
  if (!resposta.ok) throw new Error("Não foi possível consultar o pacote SCORM.")
  return (await resposta.json()) as PacoteScormDto
}

export async function listarPacotesScorm(): Promise<PacoteScormDto[]> {
  const resposta = await fetch(`${API_URL}/api/v1/scorm/pacotes`)
  if (!resposta.ok) throw new Error(await mensagemErro(resposta, "Não foi possível listar os pacotes SCORM."))
  return (await resposta.json()) as PacoteScormDto[]
}

export function urlDownloadScorm(pacote: PacoteScormDto) {
  return `${API_URL}/api/v1/scorm/pacotes/${encodeURIComponent(pacote.id)}/download`
}

export async function enviarPacoteScorm(
  cursoSlug: string,
  arquivo: File,
  versao: "1.2" | "2004",
  onProgress?: (percentual: number) => void,
): Promise<PacoteScormDto> {
  const formulario = new FormData()
  formulario.append("arquivo", arquivo)
  formulario.append("cursoSlug", cursoSlug)
  formulario.append("versao", versao)

  return new Promise((resolve, reject) => {
    const requisicao = new XMLHttpRequest()
    requisicao.open("POST", `${API_URL}/api/v1/scorm/pacotes`)
    requisicao.upload.onprogress = (evento) => {
      if (evento.lengthComputable) {
        onProgress?.(Math.round((evento.loaded / evento.total) * 100))
      }
    }
    requisicao.onload = () => {
      if (requisicao.status < 200 || requisicao.status >= 300) {
        let mensagem = "Falha ao enviar o pacote SCORM."
        try {
          const corpo = JSON.parse(requisicao.responseText) as { erro?: string }
          mensagem = corpo.erro ?? mensagem
        } catch {
          if (requisicao.statusText) mensagem = `${mensagem} (${requisicao.statusText})`
        }
        reject(new Error(mensagem))
        return
      }

      try {
        resolve(JSON.parse(requisicao.responseText) as PacoteScormDto)
      } catch {
        reject(new Error("A API recebeu o pacote, mas retornou uma resposta inválida."))
      }
    }
    requisicao.onerror = () => reject(new Error("Falha de conexão ao enviar o pacote SCORM."))
    requisicao.onabort = () => reject(new Error("O envio do pacote SCORM foi interrompido."))
    requisicao.send(formulario)
  })
}

export async function obterProgressoScorm(
  cursoSlug: string,
  usuarioId: string,
): Promise<ProgressoScormDto | null> {
  const url = new URL(`${API_URL}/api/v1/scorm/progresso`)
  url.searchParams.set("cursoSlug", cursoSlug)
  url.searchParams.set("usuarioId", usuarioId)

  const resposta = await fetch(url)
  if (resposta.status === 204 || resposta.status === 404) return null
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
