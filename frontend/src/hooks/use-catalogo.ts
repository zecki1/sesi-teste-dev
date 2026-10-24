import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import {
  ApiError,
  listarAvaliacoes,
  listarCursos,
  listarMatriculas,
  listarTurmas,
  obterCurso,
  obterFacetas,
} from "@/lib/api/catalogo"

export function useCursos(params: Record<string, string | number | undefined> = {}) {
  const { i18n } = useTranslation()
  const lang = i18n.language || "pt-BR"
  return useQuery({
    queryKey: ["cursos", { ...params, lang }],
    queryFn: () => listarCursos(params),
  })
}

export function useCurso(slug: string) {
  const { i18n } = useTranslation()
  const lang = i18n.language || "pt-BR"
  return useQuery({
    queryKey: ["curso", slug, lang],
    queryFn: () => obterCurso(slug),
    enabled: !!slug,
    // 404 é definitivo: não faz sentido repetir a requisição.
    retry: import.meta.env.DEV
      ? false
      : (tentativas, erro) => !(erro instanceof ApiError && erro.status === 404) && tentativas < 3,
  })
}

export function useAvaliacoes(cursoSlug?: string, limite = 20) {
  const { i18n } = useTranslation()
  const lang = i18n.language || "pt-BR"
  return useQuery({
    queryKey: ["avaliacoes", cursoSlug ?? "todos", limite, lang],
    queryFn: () => listarAvaliacoes({ cursoSlug, limite }),
    // A avaliação é um extra da página: uma falha não deve quebrar a tela.
    retry: false,
  })
}

export function useFacetas() {
  const { i18n } = useTranslation()
  const lang = i18n.language || "pt-BR"
  return useQuery({
    queryKey: ["facetas", lang],
    queryFn: obterFacetas,
  })
}

export function useTurmas(slug: string, enabled = true) {
  const { i18n } = useTranslation()
  const lang = i18n.language || "pt-BR"
  return useQuery({
    queryKey: ["turmas", slug, lang],
    queryFn: () => listarTurmas(slug),
    enabled: enabled && !!slug,
  })
}

export function useMatriculas(usuarioId?: string) {
  const { i18n } = useTranslation()
  const lang = i18n.language || "pt-BR"
  return useQuery({
    queryKey: ["matriculas", usuarioId, lang],
    queryFn: () => listarMatriculas(usuarioId!),
    enabled: !!usuarioId,
  })
}
