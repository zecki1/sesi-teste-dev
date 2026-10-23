import { useQuery } from "@tanstack/react-query"
import {
  ApiError,
  listarCursos,
  listarMatriculas,
  listarTurmas,
  obterCurso,
  obterFacetas,
} from "@/lib/api/catalogo"

export function useCursos(params: Record<string, string | number | undefined> = {}) {
  return useQuery({
    queryKey: ["cursos", params],
    queryFn: () => listarCursos(params),
  })
}

export function useCurso(slug: string) {
  return useQuery({
    queryKey: ["curso", slug],
    queryFn: () => obterCurso(slug),
    enabled: !!slug,
    // 404 é definitivo: não faz sentido repetir a requisição.
    retry: (tentativas, erro) => !(erro instanceof ApiError && erro.status === 404) && tentativas < 3,
  })
}

export function useFacetas() {
  return useQuery({
    queryKey: ["facetas"],
    queryFn: obterFacetas,
  })
}

export function useTurmas(slug: string, enabled = true) {
  return useQuery({
    queryKey: ["turmas", slug],
    queryFn: () => listarTurmas(slug),
    enabled: enabled && !!slug,
  })
}

export function useMatriculas(usuarioId?: string) {
  return useQuery({
    queryKey: ["matriculas", usuarioId],
    queryFn: () => listarMatriculas(usuarioId!),
    enabled: !!usuarioId,
  })
}
