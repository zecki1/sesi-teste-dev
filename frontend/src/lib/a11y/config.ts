import { ACESSIBILIDADE_PADRAO, type ConfigAcessibilidade } from "@/lib/auth/perfil"

export const CHAVE_ACESSIBILIDADE = "sesi.a11y.v1"

/** Lê as preferências de acessibilidade salvas, preenchendo campos novos com o padrão. */
export function lerConfig(): ConfigAcessibilidade {
  if (typeof window === "undefined") return { ...ACESSIBILIDADE_PADRAO }

  try {
    const bruto = window.localStorage.getItem(CHAVE_ACESSIBILIDADE)
    if (!bruto) return { ...ACESSIBILIDADE_PADRAO }
    return { ...ACESSIBILIDADE_PADRAO, ...(JSON.parse(bruto) as Partial<ConfigAcessibilidade>) }
  } catch {
    return { ...ACESSIBILIDADE_PADRAO }
  }
}

/**
 * Aplica as preferências no elemento raiz. O tema também é aplicado aqui para
 * valer antes da primeira pintura (chamado em `main.tsx`).
 */
export function aplicarNaRaiz(config: ConfigAcessibilidade) {
  const root = document.documentElement

  if (config.filtro === "none") root.removeAttribute("data-color-filter")
  else root.setAttribute("data-color-filter", config.filtro)

  root.setAttribute("data-font-size", config.tamanhoFonte)
  root.setAttribute("data-theme", config.tema)

  if (config.dislexia) root.setAttribute("data-font", "opendyslexic")
  else root.removeAttribute("data-font")

  root.setAttribute("data-vlibras", config.vlibras ? "on" : "off")
}

export function salvarConfig(config: ConfigAcessibilidade) {
  window.localStorage.setItem(CHAVE_ACESSIBILIDADE, JSON.stringify(config))
  window.dispatchEvent(new CustomEvent("sesi:acessibilidade-atualizada", { detail: config }))
}
