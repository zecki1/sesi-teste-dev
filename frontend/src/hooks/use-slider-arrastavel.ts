import { useEffect, useRef, useState } from "react"

/** Distância (px) que o ponteiro precisa percorrer para virar arrasto. */
const LIMIAR_ARRASTO = 6
/** Tempo (ms) em que o clique logo após o arrasto é ignorado. */
const JANELA_SUPRESSAO = 150
/** Duração (ms) do encaixe suave no card mais próximo depois do arrasto. */
const DURACAO_ENCAIXE = 420

/**
 * Arrastar com o mouse para rolar um trilho horizontal.
 *
 * - Clique simples continua navegando: o ponteiro só é capturado depois que o
 *   arrasto realmente começa, então o clique chega ao card.
 * - O snap do CSS é desligado durante o arrasto (evita o "tranco" a cada
 *   `scrollLeft`) e religado depois do encaixe suave no card mais próximo.
 * - No touch, deixa o scroll nativo do navegador agir; nas setas, o componente
 *   continua usando `scrollBy` normalmente.
 */
export function useSliderArrastavel<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [arrastando, setArrastando] = useState(false)
  const suprimirCliqueRef = useRef(false)

  useEffect(() => {
    const trilho = ref.current
    if (!trilho) return

    let pointerId: number | null = null
    let inicioX = 0
    let scrollInicial = 0
    let arrastou = false
    let pendenteX: number | null = null
    let quadro = 0
    let inercia = 0
    let encaixe = 0
    let snapOriginal = ""
    let ultimoX = 0
    let ultimoTempo = 0
    let velocidade = 0

    const cancelarQuadros = () => {
      if (quadro) cancelAnimationFrame(quadro)
      if (inercia) cancelAnimationFrame(inercia)
      if (encaixe) window.clearTimeout(encaixe)
      quadro = 0
      inercia = 0
      encaixe = 0
    }

    const desativarSnap = () => {
      if (snapOriginal) return
      snapOriginal = trilho.style.scrollSnapType
      trilho.style.scrollSnapType = "none"
    }

    const restaurarSnap = () => {
      trilho.style.scrollSnapType = snapOriginal
      snapOriginal = ""
    }

    const aplicarScroll = () => {
      quadro = 0
      if (pendenteX === null) return
      trilho.scrollLeft = scrollInicial - (pendenteX - inicioX)
      pendenteX = null
    }

    const agendarScroll = () => {
      if (quadro) return
      quadro = requestAnimationFrame(aplicarScroll)
    }

    /** Encaixa suavemente no card mais próximo (equivale ao snap-start). */
    const encaixarNoCard = () => {
      const cards = Array.from(trilho.querySelectorAll<HTMLElement>("[data-card]"))
      const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches

      if (cards.length === 0) {
        restaurarSnap()
        return
      }

      const recuo = parseFloat(getComputedStyle(trilho).scrollPaddingLeft) || 0
      const base = trilho.getBoundingClientRect().left
      const maximo = Math.max(0, trilho.scrollWidth - trilho.clientWidth)
      let alvo = trilho.scrollLeft
      let menorDistancia = Number.POSITIVE_INFINITY

      for (const card of cards) {
        const posicao = Math.min(
          Math.max(trilho.scrollLeft + card.getBoundingClientRect().left - base - recuo, 0),
          maximo,
        )
        const distancia = Math.abs(posicao - trilho.scrollLeft)
        if (distancia < menorDistancia) {
          menorDistancia = distancia
          alvo = posicao
        }
      }

      if (menorDistancia < 1) {
        restaurarSnap()
        return
      }

      trilho.scrollTo({ left: alvo, behavior: reduzir ? "auto" : "smooth" })
      encaixe = window.setTimeout(restaurarSnap, reduzir ? 0 : DURACAO_ENCAIXE)
    }

    /** Continua o movimento depois de soltar, perdendo velocidade aos poucos. */
    const iniciarInercia = () => {
      let passo = velocidade * 16

      if (Math.abs(passo) < 1) {
        encaixarNoCard()
        return
      }

      const quadroInercia = () => {
        passo *= 0.94
        trilho.scrollLeft -= passo

        if (Math.abs(passo) > 0.5) {
          inercia = requestAnimationFrame(quadroInercia)
          return
        }

        inercia = 0
        encaixarNoCard()
      }

      inercia = requestAnimationFrame(quadroInercia)
    }

    const aoPressionar = (evento: PointerEvent) => {
      if (evento.pointerType === "touch" || evento.button !== 0) return

      cancelarQuadros()
      pointerId = evento.pointerId
      inicioX = evento.clientX
      scrollInicial = trilho.scrollLeft
      ultimoX = evento.clientX
      ultimoTempo = performance.now()
      velocidade = 0
      arrastou = false
    }

    const aoMover = (evento: PointerEvent) => {
      if (pointerId !== evento.pointerId) return

      const deslocamento = evento.clientX - inicioX
      if (!arrastou) {
        if (Math.abs(deslocamento) < LIMIAR_ARRASTO) return

        arrastou = true
        desativarSnap()
        setArrastando(true)

        // Só captura o ponteiro depois do limiar: antes disso, capturar faria
        // o clique ser redirecionado ao trilho e o card não abriria.
        try {
          trilho.setPointerCapture(evento.pointerId)
        } catch {
          // Alguns navegadores não permitem capturar o ponteiro; o drag ainda funciona.
        }
      }

      const agora = performance.now()
      const intervalo = agora - ultimoTempo
      if (intervalo > 0) velocidade = (evento.clientX - ultimoX) / intervalo
      ultimoX = evento.clientX
      ultimoTempo = agora

      pendenteX = evento.clientX
      agendarScroll()
    }

    const finalizar = (evento: PointerEvent, cancelado = false) => {
      if (pointerId !== evento.pointerId) return

      pointerId = null

      if (!arrastou) {
        // Clique simples: nada foi capturado nem alterado; o link segue normal.
        return
      }

      arrastou = false
      aplicarScroll()

      if (trilho.hasPointerCapture(evento.pointerId)) {
        trilho.releasePointerCapture(evento.pointerId)
      }

      // O clique disparado logo depois do arrasto não deve abrir o card.
      suprimirCliqueRef.current = true
      window.setTimeout(() => {
        suprimirCliqueRef.current = false
      }, JANELA_SUPRESSAO)

      setArrastando(false)

      if (cancelado) encaixarNoCard()
      else iniciarInercia()
    }

    const aoSoltar = (evento: PointerEvent) => finalizar(evento)
    const aoCancelar = (evento: PointerEvent) => finalizar(evento, true)

    const aoClicar = (evento: MouseEvent) => {
      if (!suprimirCliqueRef.current) return
      evento.preventDefault()
      evento.stopPropagation()
      suprimirCliqueRef.current = false
    }

    // Sem isso, arrastar um card com <a>/<img> inicia o drag nativo do link
    // e o navegador cancela o pointermove que rola o trilho.
    const aoIniciarArrastar = (evento: DragEvent) => {
      evento.preventDefault()
    }

    trilho.addEventListener("pointerdown", aoPressionar)
    trilho.addEventListener("pointermove", aoMover)
    trilho.addEventListener("pointerup", aoSoltar)
    trilho.addEventListener("pointercancel", aoCancelar)
    trilho.addEventListener("click", aoClicar, true)
    trilho.addEventListener("dragstart", aoIniciarArrastar)

    return () => {
      cancelarQuadros()
      restaurarSnap()
      trilho.removeEventListener("pointerdown", aoPressionar)
      trilho.removeEventListener("pointermove", aoMover)
      trilho.removeEventListener("pointerup", aoSoltar)
      trilho.removeEventListener("pointercancel", aoCancelar)
      trilho.removeEventListener("click", aoClicar, true)
      trilho.removeEventListener("dragstart", aoIniciarArrastar)
    }
  }, [])

  return { ref, arrastando }
}
