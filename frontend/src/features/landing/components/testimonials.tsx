import { useState } from "react"
import { Container } from "@/components/layout/container"
import arrowPrev from "@/assets/arrow-navigation-1.svg"
import arrowNext from "@/assets/arrow-navigation.svg"

const testimonials = [
  { name: "Lucas Pereira", role: "Analista na Empresa X", text: "A experiência do curso foi incrível! As aulas foram muito bem estruturadas e o cronograma foi cuidadosamente planejado, facilitando muito o aprendizado." },
  { name: "Mariana Costa", role: "Gestora na Empresa X", text: "Concluir o curso foi uma jornada enriquecedora. As aulas eram dinâmicas e o horário foi organizado para maximizar nosso tempo de estudo." },
  { name: "Thiago Almeida", role: "Técnico na Empresa X", text: "O curso superou minhas expectativas! As aulas foram bem elaboradas e o planejamento do horário ajudou a manter o foco e a produtividade." },
  { name: "Fernanda Silva", role: "Analista na Empresa X", text: "Finalizar o curso foi uma experiência motivadora. As aulas foram muito bem preparadas e o cronograma foi ideal para o aprendizado." },
  { name: "Gabriel Santos", role: "Analista na Empresa X", text: "A conclusão do curso foi uma etapa muito gratificante. As aulas eram bem organizadas e o horário foi pensado para facilitar nosso aprendizado." },
]

export function Testimonials() {
  const [index, setIndex] = useState(0)
  const item = testimonials[index]

  const prev = () => setIndex((i) => (i === 0 ? testimonials.length - 1 : i - 1))
  const next = () => setIndex((i) => (i === testimonials.length - 1 ? 0 : i + 1))

  return (
    <section className="py-16">
      <Container className="flex flex-col gap-10">
        <div>
          <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">Depoimentos</h2>
          <p className="mt-2 text-lg text-[var(--sesi-muted)]">Quem fez recomendações</p>
        </div>
        <div className="relative mx-auto max-w-3xl rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] p-8 shadow-[var(--shadow-card)]">
          <p className="text-lg italic">“{item.text}”</p>
          <div className="mt-6">
            <p className="font-semibold">{item.name}</p>
            <p className="text-[var(--sesi-muted)]">{item.role}</p>
          </div>
          <button onClick={prev} aria-label="Depoimento anterior" className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow">
            <img src={arrowPrev} alt="" />
          </button>
          <button onClick={next} aria-label="Próximo depoimento" className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow">
            <img src={arrowNext} alt="" />
          </button>
        </div>
      </Container>
    </section>
  )
}
