export type ConsentimentoCookies = "aceito" | "recusado"

const CHAVE = "sesi.cookies.consent.v1"
const COOKIE = "sesi_cookies"
const VALIDADE_SEGUNDOS = 60 * 60 * 24 * 365

function lerCookie(): ConsentimentoCookies | null {
  if (typeof document === "undefined") return null
  const item = document.cookie
    .split(";")
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${COOKIE}=`))
  const valor = item?.split("=")[1]
  return valor === "aceito" || valor === "recusado" ? valor : null
}

export function lerConsentimento(): ConsentimentoCookies | null {
  if (typeof window === "undefined") return null
  try {
    const bruto = window.localStorage.getItem(CHAVE)
    if (bruto) {
      const salvo = JSON.parse(bruto) as { status?: ConsentimentoCookies }
      if (salvo.status === "aceito" || salvo.status === "recusado") return salvo.status
    }
  } catch {
    // localStorage indisponível: tenta o cookie
  }
  return lerCookie()
}

export function salvarConsentimento(status: ConsentimentoCookies) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(CHAVE, JSON.stringify({ status, data: new Date().toISOString() }))
  if (typeof document !== "undefined") {
    document.cookie = `${COOKIE}=${status}; path=/; max-age=${VALIDADE_SEGUNDOS}; SameSite=Lax`
  }
}
