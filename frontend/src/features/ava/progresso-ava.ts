/**
 * Progresso da jornada no AVA, por aluno e curso.
 *
 * O percentual é sempre monotônico (maior valor alcançado): revisitar um
 * conteúdo já visto não pode diminuir o progresso. Para cursos sem pacote
 * SCORM, fica no navegador e é agregado ao progresso de matrícula no dashboard.
 */
export interface ProgressoAva {
  visitados: string[]
  ultimo: string | null
  percentualMaximo: number
  atualizadoEm: string
}

const PREFIXO = "sesi.ava.progresso."

export function chaveProgressoAva(slug: string, usuarioId: string) {
  return `${PREFIXO}${slug}::${usuarioId.trim().toLowerCase()}`
}

export function carregarProgressoAva(slug: string, usuarioId: string): ProgressoAva | null {
  if (!slug || !usuarioId || typeof window === "undefined") return null

  try {
    const bruto = window.localStorage.getItem(chaveProgressoAva(slug, usuarioId))
    if (!bruto) return null

    const dados = JSON.parse(bruto) as Partial<ProgressoAva>
    if (!Array.isArray(dados.visitados)) return null

    return {
      visitados: dados.visitados.filter((item): item is string => typeof item === "string"),
      ultimo: typeof dados.ultimo === "string" ? dados.ultimo : null,
      percentualMaximo: Math.max(0, Math.min(100, Number(dados.percentualMaximo) || 0)),
      atualizadoEm: dados.atualizadoEm || new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function salvarProgressoAva(
  slug: string,
  usuarioId: string,
  dados: Pick<ProgressoAva, "visitados" | "ultimo" | "percentualMaximo">,
): ProgressoAva | null {
  if (!slug || !usuarioId || typeof window === "undefined") return null

  const anterior = carregarProgressoAva(slug, usuarioId)
  const visitados = Array.from(new Set([...(anterior?.visitados ?? []), ...dados.visitados]))
  const percentualMaximo = Math.max(anterior?.percentualMaximo ?? 0, dados.percentualMaximo, 0)

  const progresso: ProgressoAva = {
    visitados,
    ultimo: dados.ultimo ?? anterior?.ultimo ?? null,
    percentualMaximo: Math.min(100, percentualMaximo),
    atualizadoEm: new Date().toISOString(),
  }

  try {
    window.localStorage.setItem(chaveProgressoAva(slug, usuarioId), JSON.stringify(progresso))
  } catch {
    return progresso
  }

  return progresso
}

/** Calcula o percentual da jornada sem permitir regressão. */
export function calcularPercentualAva(
  totalItens: number,
  visitados: Iterable<string>,
  percentualMaximo: number,
): number {
  const quantidade = new Set(visitados).size
  const atual = totalItens > 0 ? Math.round((quantidade / totalItens) * 100) : 0
  return Math.min(100, Math.max(0, percentualMaximo, atual))
}
