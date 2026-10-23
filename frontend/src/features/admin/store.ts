import type { CursoResumoDto, CursoSalvarRequest, FacetasDto } from "@/lib/api/catalogo"
import type { ScormPaginaConfig } from "@/features/scorm/scorm-config"

export type TipoCurso = "blocos" | "scorm"
export type TipoBloco = "texto" | "video" | "imagem" | "quiz"

export interface Bloco {
  id: string
  tipo: TipoBloco
  conteudo: string
}

export interface AulaAdmin {
  id: string
  titulo: string
  blocos: Bloco[]
}

export interface ModuloAdmin {
  id: string
  titulo: string
  aulas: AulaAdmin[]
}

export type ScormAdmin = ScormPaginaConfig

export interface CursoAdmin {
  id: string
  origem: "api" | "local"
  slug: string
  slugOriginal?: string
  nomeCompleto: string
  nomeBreve: string
  descricao: string
  cargaHoraria: number
  publicoAlvo: string
  imagemUrl: string
  dataDisponibilizacao?: string
  dataPublicacao?: string
  dataLiberacaoMatricula?: string
  etapaDesenvolvimento: "Rascunho" | "Homologado" | "Publicado"
  destaque: boolean
  categoria: string
  modalidade: string
  status: string
  tipo: TipoCurso
  modulos: ModuloAdmin[]
  scorm?: ScormAdmin
  criadoEm: string
}

export function novoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function gerarSlug(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function cursoDaApi(curso: CursoResumoDto): CursoAdmin {
  return {
    id: `api-${curso.id}`,
    origem: "api",
    slug: curso.slug,
    slugOriginal: curso.slug,
    nomeCompleto: curso.nomeCompleto,
    nomeBreve: curso.nomeBreve,
    descricao: curso.descricao,
    cargaHoraria: curso.cargaHoraria,
    publicoAlvo: curso.publicoAlvo,
    imagemUrl: curso.imagemUrl,
    dataDisponibilizacao: curso.dataDisponibilizacao,
    dataPublicacao: curso.dataPublicacao ?? "",
    dataLiberacaoMatricula: curso.dataLiberacaoMatricula ?? "",
    etapaDesenvolvimento: curso.etapaDesenvolvimento ?? "Publicado",
    destaque: curso.destaque,
    categoria: curso.categoria.nome,
    modalidade: curso.modalidade.nome,
    status: curso.status.nome,
    tipo: "blocos",
    modulos: [],
    criadoEm: "",
  }
}

export function criarCursoVazio(categoria = "", modalidade = "", status = ""): CursoAdmin {
  return {
    id: novoId(),
    origem: "local",
    slug: "",
    nomeCompleto: "",
    nomeBreve: "",
    descricao: "",
    cargaHoraria: 0,
    publicoAlvo: "",
    imagemUrl: "",
    dataDisponibilizacao: "",
    dataPublicacao: "",
    dataLiberacaoMatricula: "",
    etapaDesenvolvimento: "Rascunho",
    destaque: false,
    categoria,
    modalidade,
    status,
    tipo: "blocos",
    modulos: [
      {
        id: novoId(),
        titulo: "Módulo 1",
        aulas: [{ id: novoId(), titulo: "Aula 1", blocos: [{ id: novoId(), tipo: "texto", conteudo: "" }] }],
      },
    ],
    criadoEm: new Date().toISOString(),
  }
}

/** Converte o formulário do admin no contrato da API. */
export function paraPayload(curso: CursoAdmin, facetas: FacetasDto | undefined): CursoSalvarRequest {
  const slugPorNome = (lista: { nome: string; slug: string }[] | undefined, nome: string) =>
    lista?.find((item) => item.nome === nome || item.slug === nome)?.slug ?? gerarSlug(nome)

  return {
    nomeCompleto: curso.nomeCompleto.trim(),
    nomeBreve: curso.nomeBreve.trim(),
    slug: gerarSlug(curso.slug || curso.nomeBreve),
    descricao: curso.descricao.trim(),
    cargaHoraria: curso.cargaHoraria,
    publicoAlvo: curso.publicoAlvo.trim(),
    imagemUrl: curso.imagemUrl.trim(),
    dataDisponibilizacao: curso.dataDisponibilizacao || null,
    dataPublicacao: curso.dataPublicacao || null,
    dataLiberacaoMatricula: curso.dataLiberacaoMatricula || null,
    etapaDesenvolvimento: curso.etapaDesenvolvimento,
    destaque: curso.destaque,
    categoriaSlug: slugPorNome(facetas?.categorias, curso.categoria),
    modalidadeSlug: slugPorNome(facetas?.modalidades, curso.modalidade),
    statusSlug: slugPorNome(facetas?.status, curso.status),
    modulos:
      curso.modulos.length > 0
        ? curso.modulos
            .filter((modulo) => modulo.titulo.trim())
            .map((modulo) => ({
              titulo: modulo.titulo.trim(),
              aulas: modulo.aulas.map((aula) => aula.titulo.trim()).filter(Boolean),
            }))
        : undefined,
  }
}
