type Listener = (altura: number) => void

let alturaAtual = 0
const listeners = new Set<Listener>()

/**
 * Mede a altura do banner de cookies para que outros elementos fixos
 * (como o botão de acessibilidade) não fiquem por cima dele.
 */
export function definirAlturaBannerCookie(altura: number) {
  alturaAtual = altura
  listeners.forEach((listener) => listener(altura))
}

export function assinarAlturaBannerCookie(listener: Listener) {
  listeners.add(listener)
  listener(alturaAtual)
  return () => {
    listeners.delete(listener)
  }
}
