import { API_URL } from "./catalogo"
import type { CursoResumoDto } from "./catalogo"

export const PAPEIS = ["Aluno", "Suporte", "Monitor", "Tutor", "Administrador", "Gestor", "Editor", "Convidado"] as const
export type PapelGestao = (typeof PAPEIS)[number]
export const gestaoLocalHabilitada =
  import.meta.env.DEV &&
  (API_URL.startsWith("http://localhost:") ||
    API_URL.startsWith("http://127.0.0.1:") ||
    API_URL.startsWith("https://localhost:") ||
    API_URL.startsWith("https://127.0.0.1:"))

export interface UsuarioGestao {
  id: string
  nome: string
  email: string
  papel: PapelGestao
  ativo: boolean
  criadoEm: string
}

export interface PermissaoPapel {
  papel: PapelGestao
  criar: boolean
  editar: boolean
  excluir: boolean
  visualizar: boolean
}

export interface Chamado {
  id: string
  protocolo: string
  nome: string
  email: string
  categoria: string
  descricao: string
  pagina: string
  capturaTela?: string | null
  status: "Aberto" | "Em atendimento" | "Resolvido"
  resposta: string | null
  criadoEm: string
  atualizadoEm: string | null
}

export interface EnvioChamado {
  chamado: Chamado
  suporteEnviado: boolean
  alunoEnviado: boolean
  erro: string | null
}

export interface MarcoCurso {
  cursoSlug: string
  usuarioId: string
  iniciadoEm: string | null
  concluidoEm: string | null
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

export function listarUsuariosGestao() {
  return requisitar<UsuarioGestao[]>("/gestao/usuarios")
}

export function autenticarAdministrador(email: string, senha: string) {
  return requisitar<UsuarioGestao>("/gestao/sessao", {
    method: "POST",
    body: JSON.stringify({ email, senha }),
  })
}

export function encerrarSessaoAdministrador() {
  return requisitar<void>("/gestao/sessao", { method: "DELETE" })
}

export async function obterUsuarioGestaoPorEmail(email: string): Promise<UsuarioGestao | null> {
  const resposta = await fetch(`${API_URL}/api/v1/gestao/usuarios/perfil?email=${encodeURIComponent(email)}`, {
    credentials: "include",
  })
  if (resposta.status === 404) return null
  if (!resposta.ok) {
    let mensagem = `Falha ao consultar o usuário (${resposta.status}).`
    try {
      const corpo = (await resposta.json()) as { erro?: string }
      mensagem = corpo.erro ?? mensagem
    } catch {
      // A resposta pode não conter JSON.
    }
    throw new Error(mensagem)
  }
  return (await resposta.json()) as UsuarioGestao
}

export function salvarUsuarioGestao(
  usuario: Pick<UsuarioGestao, "nome" | "email" | "papel" | "ativo">,
  id?: string,
) {
  return requisitar<UsuarioGestao>(`/gestao/usuarios${id ? `/${encodeURIComponent(id)}` : ""}`, {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(usuario),
  })
}

export function excluirUsuarioGestao(id: string) {
  return requisitar<void>(`/gestao/usuarios/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export function obterPermissoesGestao() {
  return requisitar<PermissaoPapel[]>("/gestao/permissoes")
}

export function salvarPermissoesGestao(permissoes: PermissaoPapel[]) {
  return requisitar<PermissaoPapel[]>("/gestao/permissoes", {
    method: "PUT",
    body: JSON.stringify(permissoes),
  })
}

export function listarChamadosGestao() {
  return requisitar<Chamado[]>("/gestao/chamados")
}

export function atualizarChamadoGestao(
  id: string,
  dados: Pick<Chamado, "status" | "resposta">,
) {
  return requisitar<Chamado>(`/gestao/chamados/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  })
}

export function criarChamado(dados: {
  nome: string
  email: string
  categoria: string
  descricao: string
  pagina: string
  capturaTela?: string | null
}) {
  return requisitar<EnvioChamado>("/chamados", {
    method: "POST",
    body: JSON.stringify(dados),
  })
}

export function registrarAlunoGestao(nome: string, email: string) {
  return requisitar<UsuarioGestao>("/gestao/usuarios/registro", {
    method: "POST",
    body: JSON.stringify({ nome, email }),
  })
}

export function listarCursosAdministracao(): Promise<CursoResumoDto[]> {
  return requisitar<CursoResumoDto[]>("/gestao/cursos")
}

export function registrarAlunoComSenhaGestao(nome: string, email: string, senha: string) {
  return requisitar<UsuarioGestao>("/gestao/usuarios/registro-com-senha", {
    method: "POST",
    body: JSON.stringify({ nome, email, senha }),
  })
}

export function autenticarAlunoGestao(email: string, senha: string) {
  return requisitar<UsuarioGestao>("/gestao/usuarios/autenticar", {
    method: "POST",
    body: JSON.stringify({ email, senha }),
  })
}

export function obterMarcosCurso(usuarioId: string) {
  return requisitar<MarcoCurso[]>(`/gestao/marcos?usuarioId=${encodeURIComponent(usuarioId)}`)
}

export function registrarMarcoCurso(
  cursoSlug: string,
  usuarioId: string,
  marco: "inicio" | "conclusao",
  percentual = 0,
) {
  return requisitar<MarcoCurso>("/gestao/marcos", {
    method: "POST",
    body: JSON.stringify({ cursoSlug, usuarioId, marco, percentual }),
  })
}
