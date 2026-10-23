import { useEffect, useState } from "react"

export type Idioma = "pt-BR" | "en-US" | "es-ES"
export type Papel = "aluno" | "admin" | "suporte" | "monitor" | "tutor" | "gestor" | "editor" | "convidado"
export type FiltroDaltonismo = "none" | "protanopia" | "deuteranopia" | "tritanopia" | "monocromia"
export type TamanhoFonte = "small" | "normal" | "large" | "xlarge"
export type Tema = "claro" | "escuro"

export interface ConfigAcessibilidade {
  filtro: FiltroDaltonismo
  tamanhoFonte: TamanhoFonte
  dislexia: boolean
  tema: Tema
  vlibras: boolean
}

export interface Certificado {
  id: string
  curso: string
  cargaHoraria: number
  concluidoEm: string
}

export interface Matricula {
  slug: string
  progresso: number
  matriculadoEm: string
  iniciadoEm?: string
  concluidoEm?: string
  proximaAula: string
  concluido: boolean
}

export interface PerfilAluno {
  nome: string
  sobrenome: string
  email: string
  telefone: string
  dataNascimento: string
  idioma: Idioma
  papel: Papel
  acessibilidade: ConfigAcessibilidade
  certificados: Certificado[]
  matriculas: Matricula[]
}

const CHAVE_PERFIL = "sesi.perfil.v1"
const CHAVE_SESSAO = "sesi.sessao.v1"

export const EMAIL_ADMIN = "admin@sesindustria.com.br"
export const EMAIL_TESTE = "aluno@teste.com"

export const ACESSIBILIDADE_PADRAO: ConfigAcessibilidade = {
  filtro: "none",
  tamanhoFonte: "normal",
  dislexia: false,
  tema: "claro",
  vlibras: true,
}

export function ehEmailAdmin(email: string) {
  const normalizado = email.trim().toLowerCase()
  return normalizado === EMAIL_ADMIN
}

export function papelDeGestao(papel: string): Papel {
  const papeis: Record<string, Papel> = {
    Aluno: "aluno",
    Suporte: "suporte",
    Monitor: "monitor",
    Tutor: "tutor",
    Administrador: "admin",
    Gestor: "gestor",
    Editor: "editor",
    Convidado: "convidado",
  }
  return papeis[papel] ?? "aluno"
}

function perfilDemo(email: string, papel: Papel): PerfilAluno {
  const admin = papel === "admin"
  const demo = email === EMAIL_TESTE
  const alunoDemo = papel === "aluno" && demo
  const nomeDeEmail = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letra) => letra.toUpperCase())

  return {
    nome: admin ? "Admin" : demo ? "Ana" : nomeDeEmail || "Aluno",
    sobrenome: admin ? "SESI" : demo ? "Souza" : "",
    email,
    telefone: "(11) 99999-0000",
    dataNascimento: "1994-05-18",
    idioma: "pt-BR",
    papel,
    acessibilidade: { ...ACESSIBILIDADE_PADRAO },
    certificados: !alunoDemo
      ? []
      : [
          { id: "cert-1", curso: "Prevenção e Combate a Incêndios", cargaHoraria: 16, concluidoEm: "2025-11-20" },
          { id: "cert-2", curso: "Liderança e Comunicação Organizacional", cargaHoraria: 24, concluidoEm: "2026-01-12" },
        ],
    matriculas: !alunoDemo
      ? []
      : [
          {
            slug: "matematica-para-a-precisao-medidas-e-escalas-na-metalurgia",
            progresso: 35,
            matriculadoEm: "2026-01-05",
            proximaAula: "Proporção e escala",
            concluido: false,
          },
          {
            slug: "estatistica-e-controle-de-qualidade-na-producao",
            progresso: 10,
            matriculadoEm: "2026-02-02",
            proximaAula: "Medidas de tendência central",
            concluido: false,
          },
          {
            slug: "quimica-e-sustentabilidade",
            progresso: 0,
            matriculadoEm: "2026-02-16",
            proximaAula: "Ácidos e bases",
            concluido: false,
          },
          {
            slug: "prevencao-e-combate-a-incendios",
            progresso: 100,
            matriculadoEm: "2025-10-01",
            proximaAula: "",
            concluido: true,
          },
        ],
  }
}

export function lerPerfil(): PerfilAluno | null {
  if (typeof window === "undefined") return null
  try {
    const bruto = window.localStorage.getItem(CHAVE_PERFIL)
    return bruto ? (JSON.parse(bruto) as PerfilAluno) : null
  } catch {
    return null
  }
}

export function salvarPerfil(perfil: PerfilAluno) {
  window.localStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil))
  window.localStorage.setItem(CHAVE_SESSAO, perfil.email)
  notificar()
}

export function atualizarPerfil(parcial: Partial<PerfilAluno>) {
  const atual = lerPerfil()
  if (!atual) return
  salvarPerfil({ ...atual, ...parcial })
}

export function sair() {
  window.localStorage.removeItem(CHAVE_SESSAO)
  window.localStorage.removeItem(CHAVE_PERFIL)
  notificar()
}

export function entrar(email: string, papelPersistido?: Papel): PerfilAluno {
  const normalizado = email.trim().toLowerCase()
  const existente = lerPerfil()
  const papel = papelPersistido ?? (ehEmailAdmin(normalizado) ? "admin" : "aluno")
  const perfil =
    existente && existente.email.toLowerCase() === normalizado
      ? { ...existente, papel }
      : perfilDemo(normalizado, papel)

  salvarPerfil(perfil)
  return perfil
}

export function criarConta(
  dados: Pick<PerfilAluno, "nome" | "sobrenome" | "email" | "telefone" | "dataNascimento">,
  papelPersistido?: Papel,
): PerfilAluno {
  const email = dados.email.trim().toLowerCase()
  const perfil: PerfilAluno = {
    ...perfilDemo(email, papelPersistido ?? (ehEmailAdmin(email) ? "admin" : "aluno")),
    ...dados,
    email,
    certificados: [],
    matriculas: [],
  }
  salvarPerfil(perfil)
  return perfil
}

export function definirIdioma(idioma: Idioma) {
  const perfil = lerPerfil()
  window.localStorage.setItem("sesi.idioma", idioma)
  window.localStorage.setItem("sesi.idioma.manual", "1")
  if (perfil) salvarPerfil({ ...perfil, idioma })
  else notificar()
}

const ouvintes = new Set<() => void>()

function notificar() {
  ouvintes.forEach((ouvinte) => ouvinte())
}

export function assinarPerfil(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  const aoMudarStorage = (evento: StorageEvent) => {
    if (evento.key === CHAVE_PERFIL) ouvinte()
  }
  window.addEventListener("storage", aoMudarStorage)
  return () => {
    ouvintes.delete(ouvinte)
    window.removeEventListener("storage", aoMudarStorage)
  }
}

export function usePerfil() {
  const [perfil, setPerfil] = useState<PerfilAluno | null>(() => lerPerfil())

  useEffect(() => assinarPerfil(() => setPerfil(lerPerfil())), [])

  return perfil
}
