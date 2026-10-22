import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Container } from "./container"
import { Button } from "@/components/ui/button"
import logoWhite from "@/assets/logo-sesi-industria-white.svg"

export function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`
        transition-all duration-300 ${scrolled ? "bg-[var(--sesi-red)] text-white shadow-md" : "bg-transparent text-white"}
        ${!scrolled && "border-b border-white/20"}
      `}
    >
      <Container className="flex items-center justify-between gap-4 py-4">
        <Link to="/" className="flex items-center gap-2" aria-label="SESI Indústria - Início">
          <img src={logoWhite} alt="SESI Indústria" className="h-8" />
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegação principal">
          <Link to="/" className="hover:underline">Início</Link>
          <Link to="/catalogo" className="hover:underline">Cursos</Link>
          <a href="/#impacto" className="hover:underline">Sobre</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/area-do-aluno" className="hidden md:block">
            <Button variant="secondary" className="border-white text-white hover:bg-white/10 rounded-lg">Área do aluno</Button>
          </Link>
          <button onClick={() => setOpen(!open)} className="md:hidden" aria-label="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </Container>
    </header>
  )
}