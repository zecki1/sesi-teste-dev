import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import gsap from "gsap"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"

const heroImage = "/images/hero-image.webp"

export function Hero() {
  const scope = useRef<HTMLElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = gsap.context(() => {
      gsap.from("[data-hero]", {
        y: 28,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.05,
      })
    }, scope)
    return () => ctx.revert()
  }, [])

  return (
    <section id="hero" ref={scope} className="relative isolate -mt-[72px] overflow-hidden pt-[72px]">
      <img
        src={heroImage}
        alt=""
        aria-hidden="true"
        width="1600"
        height="900"
        fetchPriority="high"
        loading="eager"
        decoding="async"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(208,6,2,0.92)_0%,rgba(208,6,2,0.86)_100%)]" />
      <Container className="flex min-h-[560px]  flex-col justify-center gap-6 py-16 text-white">
        <h1 data-hero className="max-w-[400px] font-['Open_Sans_Condensed',sans-serif] text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Impulsione sua carreira na indústria
        </h1>
        <p data-hero className="max-w-2xl text-lg sm:text-xl">
          Amplie seus conhecimentos com excelência na melhor plataforma de estudos da indústria brasileira
        </p>
        <div data-hero>
          <Link to="/catalogo">
            <Button
              variant="secondary"
              className="rounded-lg border-transparent bg-white text-[var(--sesi-black)] hover:bg-white/85"
              withArrow
            >
              Conhecer cursos
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  )
}