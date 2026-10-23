import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import Lenis from "lenis"
import AOS from "aos"
import "lenis/dist/lenis.css"
import "aos/dist/aos.css"

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * Scroll suave (Lenis) + revelações no scroll (AOS).
 * Desliga os dois quando o usuário pede menos movimento no sistema operacional.
 */
export function SmoothScroll() {
  const { pathname } = useLocation()

  useEffect(() => {
    AOS.init({
      duration: 600,
      easing: "ease-out-cubic",
      offset: 60,
      once: true,
      disable: prefersReducedMotion,
    })
  }, [])

  // Cada rota nova começa no topo e recalcula o que já está visível.
  useEffect(() => {
    window.scrollTo(0, 0)
    AOS.refreshHard()
  }, [pathname])

  useEffect(() => {
    if (prefersReducedMotion()) return

    const lenis = new Lenis({ duration: 1.05, anchors: true, smoothWheel: true })
    let frame = 0
    let bloqueios = 0

    const travar = () => {
      bloqueios += 1
      lenis.stop()
    }
    const liberar = () => {
      bloqueios = Math.max(0, bloqueios - 1)
      if (bloqueios === 0) lenis.start()
    }

    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)
    window.addEventListener("sesi:travar-scroll", travar)
    window.addEventListener("sesi:liberar-scroll", liberar)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("sesi:travar-scroll", travar)
      window.removeEventListener("sesi:liberar-scroll", liberar)
      lenis.destroy()
    }
  }, [])

  return null
}
