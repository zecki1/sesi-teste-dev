import { Link } from "react-router-dom"
import { Container } from "./container"
import logoWhite from "@/assets/logo-sesi-industria-white.svg"
import facebook from "@/assets/icon-facebook-24px.svg"
import instagram from "@/assets/icon-instagram-24px.svg"
import linkedin from "@/assets/icon-linkedIn-24px.svg"

export function Footer() {
  return (
    <footer className="bg-[var(--sesi-black)] text-white">
      <Container className="grid gap-10 py-12 md:grid-cols-4">
        <div className="flex flex-col gap-4">
          <img src={logoWhite} alt="SESI Indústria" className="h-10 w-fit" />
          <div className="flex items-center gap-4">
            <a href="#" aria-label="Facebook"><img src={facebook} alt="" /></a>
            <a href="#" aria-label="Instagram"><img src={instagram} alt="" /></a>
            <a href="#" aria-label="LinkedIn"><img src={linkedin} alt="" /></a>
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-lg font-semibold">Navegação</h3>
          <ul className="flex flex-col gap-2">
            <li><Link to="/" className="hover:underline">Início</Link></li>
            <li><a href="#cursos" className="hover:underline">Certificação</a></li>
            <li><Link to="/catalogo" className="hover:underline">Cursos</Link></li>
            <li><a href="#impacto" className="hover:underline">Sobre</a></li>
            <li><a href="#" className="hover:underline">Blog</a></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-lg font-semibold">Cursos Populares</h3>
          <ul className="flex flex-col gap-2">
            <li><span className="text-white/90">Cultura Organizacional</span></li>
            <li><span className="text-white/90">Ferramentas Google para Produtividade</span></li>
            <li><span className="text-white/90">Excel Básico ao Avançado</span></li>
            <li><span className="text-white/90">Trabalho em Equipe e Colaboração</span></li>
            <li><span className="text-white/90">Gestão do Tempo e Produtividade</span></li>
            <li><span className="text-white/90">Comunicação Assertiva</span></li>
            <li><span className="text-white/90">Inteligência Emocional no Trabalho</span></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-lg font-semibold">Suporte</h3>
          <ul className="flex flex-col gap-2">
            <li><a href="#" className="hover:underline">Termos de Uso</a></li>
            <li><a href="#" className="hover:underline">Política de Privacidade</a></li>
            <li><a href="#" className="hover:underline">Trabalhe Conosco</a></li>
            <li><a href="#" className="hover:underline">Fale Conosco</a></li>
            <li><a href="#" className="hover:underline">Central de Ajuda</a></li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-white/10 py-6 text-center text-sm text-white/70">
        <Container>
          © {new Date().getFullYear()} SESI Indústria. Todos os direitos reservados.
        </Container>
      </div>
    </footer>
  )
}
