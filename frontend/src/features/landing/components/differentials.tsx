import { Container } from "@/components/layout/container"
import cert from "@/assets/01-certificacao-red.svg"
import prof from "@/assets/02-professores-red.svg"
import support from "@/assets/03-suporte-red.svg"
import flex from "@/assets/04-flexibilidade-bege.svg"

const items = [
  { icon: cert, title: "Certificação SESI", text: "Cursos com a melhor certificação do mercado industrial reconhecidos pelo SESI." },
  { icon: prof, title: "Professores especialistas", text: "Contamos com professores reconhecidos por sua excelência no mercado." },
  { icon: support, title: "Suporte contínuo", text: "Você não está sozinho! Acompanhamento online durante todo o curso." },
  { icon: flex, title: "Flexibilidade", text: "Estude no seu ritmo, quando e onde quiser." },
]

export function Differentials() {
  return (
    <section className="bg-[#f8f9fa] py-16">
      <Container className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <article key={item.title} className="flex flex-col gap-4 rounded-[var(--radius-lg)] bg-white p-6 shadow-[var(--shadow-card)]">
            <img src={item.icon} alt="" className="h-12 w-12" />
            <h3 className="text-xl font-semibold">{item.title}</h3>
            <p className="text-[var(--sesi-muted)]">{item.text}</p>
          </article>
        ))}
      </Container>
    </section>
  )
}
