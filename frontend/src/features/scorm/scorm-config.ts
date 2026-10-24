import type { CursoDetalheDto } from "@/lib/api/catalogo"

/**
 * Dados da página pública de um curso entregue como pacote SCORM.
 *
 * O backend do catálogo ainda não tem esses campos, então a configuração é
 * demonstrativa e fica no navegador (uma chave por slug). A página sempre
 * funciona: campo vazio cai de volta nos dados reais da API.
 */
export interface ScormPaginaConfig {
  titulo: string
  subtitulo: string
  descricao: string
  bannerUrl: string
  imagemUrl: string
  cargaHoraria: number
  versao: "1.2" | "2004"
  arquivo: string
  tamanho: number
  urlLancamento: string
  botaoTexto: string
  /** Idiomas em que o pacote SCORM foi disponibilizado (pt-BR, en-US, es-ES). */
  idiomas: string[]
  /** Idioma exibido quando o visitante escolhe um idioma ainda não traduzido. */
  idiomaPadrao: string
}

export type CursoScormBase = Pick<
  CursoDetalheDto,
  "slug" | "nomeCompleto" | "nomeBreve" | "descricao" | "cargaHoraria" | "imagemUrl"
>

const PREFIXO = "sesi.scorm.pagina."

export function chaveConfigScorm(slug: string) {
  return `${PREFIXO}${slug}`
}

export function configScormPadrao(curso: CursoScormBase): ScormPaginaConfig {
  return {
    titulo: curso.nomeCompleto,
    subtitulo: "",
    descricao: curso.descricao,
    bannerUrl: "",
    imagemUrl: curso.imagemUrl,
    cargaHoraria: curso.cargaHoraria,
    versao: "1.2",
    arquivo: "",
    tamanho: 0,
    urlLancamento: "",
    botaoTexto: "Iniciar curso",
    idiomas: ["pt-BR"],
    idiomaPadrao: "pt-BR",
  }
}

export function carregarConfigScorm(slug: string): ScormPaginaConfig | null {
  if (!slug || typeof window === "undefined") return null

  try {
    const bruto = window.localStorage.getItem(chaveConfigScorm(slug))
    if (!bruto) return null
    const dados = JSON.parse(bruto) as Partial<ScormPaginaConfig>
    return { ...configScormPadrao({ slug, nomeCompleto: "", nomeBreve: "", descricao: "", cargaHoraria: 0, imagemUrl: "" }), ...dados }
  } catch {
    return null
  }
}

export function salvarConfigScorm(slug: string, config: ScormPaginaConfig) {
  if (!slug || typeof window === "undefined") return

  try {
    window.localStorage.setItem(chaveConfigScorm(slug), JSON.stringify(config))
  } catch {
    // Armazenamento indisponível (modo privado/cota): a página usa os dados da API.
  }
}

/** Junta o que foi configurado no admin com os dados reais do curso. */
export function configScormEfetiva(
  curso: CursoDetalheDto,
  configuracaoRemota?: Partial<ScormPaginaConfig> | null,
): ScormPaginaConfig {
  const padrao = configScormPadrao(curso)
  const salvo = configuracaoRemota ?? carregarConfigScorm(curso.slug)
  if (!salvo) return padrao

  return {
    ...padrao,
    ...salvo,
    titulo: salvo.titulo?.trim() || padrao.titulo,
    subtitulo: salvo.subtitulo?.trim() ?? padrao.subtitulo,
    descricao: salvo.descricao?.trim() || padrao.descricao,
    imagemUrl: salvo.imagemUrl?.trim() || padrao.imagemUrl,
    cargaHoraria: typeof salvo.cargaHoraria === "number" && salvo.cargaHoraria > 0 ? salvo.cargaHoraria : padrao.cargaHoraria,
    botaoTexto: salvo.botaoTexto?.trim() || padrao.botaoTexto,
    idiomas: Array.isArray(salvo.idiomas) && salvo.idiomas.length > 0 ? salvo.idiomas : padrao.idiomas,
    idiomaPadrao: salvo.idiomaPadrao?.trim() || padrao.idiomaPadrao,
  }
}
