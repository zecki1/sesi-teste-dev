import { useQuery } from "@tanstack/react-query"
import { listarCursos, obterCurso, obterFacetas } from "@/lib/api/catalogo"

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
  })
}

export function useFacetas() {
  return useQuery({
    queryKey: ["facetas"],
    queryFn: obterFacetas,
  })
}
