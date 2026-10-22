import { Link } from "react-router-dom"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import heroImage from "@/assets/hero-image.png"

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <img src={heroImage} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(196,30,58,0.9)_0%,rgba(196,30,58,0.85)_100%)]" />
      <Container className="flex min-h-[560px] flex-col justify-center gap-6 py-16 text-white">
        <h1 className="max-w-4xl font-['Open_Sans_Condensed',sans-serif] text-4xl font-extrabold uppercase tracking-tight sm:text-5xl lg:text-6xl">
          Impulsione sua carreira na indústria
        </h1>
        <p className="max-w-2xl text-lg sm:text-xl">
          Amplie seus conhecimentos com excelência na melhor plataforma de estudos da indústria brasileira
        </p>
        <div>
          <Link to="/catalogo">
            <Button variant="secondary" className="border-white text-white hover:bg-white/10" withArrow>
              Conhecer cursos
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  )
}
