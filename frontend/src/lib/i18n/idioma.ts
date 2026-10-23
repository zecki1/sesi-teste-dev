import i18n from "@/i18n"
import type { Idioma } from "@/lib/auth/perfil"

const CHAVE = "sesi.idioma"
const CHAVE_MANUAL = "sesi.idioma.manual"

/** Fusos dos Estados Unidos/Canadá (inglês) e da América do Sul de língua portuguesa. */
const FUSOS_INGLES = /^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Honolulu|Detroit|Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Mexico_City|Monterrey|Tijuana|Regina|Whitehorse|Yellowknife|Nuuk)$/
const FUSOS_PORTUGUES = /^America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Manaus|Belem|Cuiaba|Campo_Grande|Porto_Velho|Rio_Branco|Boa_Vista|Maceio|Aracaju|Salvador|Noronha)$/

export function idiomaSalvo(): Idioma | null {
  if (typeof window === "undefined") return null
  const salvo = window.localStorage.getItem(CHAVE)
  return salvo === "pt-BR" || salvo === "en-US" || salvo === "es-ES" ? salvo : null
}

export function idiomaFoiEscolhidoManualmente() {
  return window.localStorage.getItem(CHAVE_MANUAL) === "1"
}

/**
 * Idioma pelo fuso horário: Europa → espanhol, EUA/Canadá → inglês, Brasil → português.
 * Sem fuso reconhecido, usa o idioma do navegador e, por último, português.
 */
export function detectarIdioma(): Idioma {
  if (typeof window === "undefined") return "pt-BR"

  const salvo = idiomaSalvo()
  if (salvo) return salvo

  const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  if (fuso.startsWith("Europe/")) return "es-ES"
  if (FUSOS_INGLES.test(fuso)) return "en-US"
  if (FUSOS_PORTUGUES.test(fuso)) return "pt-BR"
  if (fuso.startsWith("America/")) return "en-US"

  const navegador = (navigator.language || "").toLowerCase()
  if (navegador.startsWith("en")) return "en-US"
  if (navegador.startsWith("es")) return "es-ES"
  return "pt-BR"
}

export function aplicarIdioma(idioma: Idioma) {
  void i18n.changeLanguage(idioma)
  document.documentElement.lang = idioma
  window.localStorage.setItem(CHAVE, idioma)
}

export function idiomaAtual(): Idioma {
  const atual = i18n.language
  return atual === "en-US" || atual === "es-ES" ? atual : "pt-BR"
}

/** Detecta e aplica o idioma no primeiro acesso e guarda a escolha automática. */
export function iniciarIdioma() {
  if (!idiomaFoiEscolhidoManualmente()) aplicarIdioma(detectarIdioma())
  else aplicarIdioma(idiomaSalvo() ?? "pt-BR")
}
