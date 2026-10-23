import { Container } from "@/components/layout/container"
import certificacao from "@/assets/beneficios/certificacao.svg"
import professores from "@/assets/beneficios/professores.svg"
import suporte from "@/assets/beneficios/suporte.svg"
import flexibilidade from "@/assets/beneficios/flexibilidade.svg"

const BENEFICIOS = [
  {
    icone: certificacao,
    titulo: "Certificação SESI",
    texto: "Cursos com a melhor certificação do mercado industrial reconhecidos pelo SESI.",
  },
  {
    icone: professores,
    titulo: "Professores especialistas",
    texto: "Contamos com professores reconhecidos por sua excelência no mercado.",
  },
  {
    icone: suporte,
    titulo: "Suporte contínuo",
    texto: "Você não está sozinho! Acompanhamento online durante todo o curso.",
  },
  {
    icone: flexibilidade,
    titulo: "Flexibilidade",
    texto: "Turmas presenciais e online com horários que se adaptam à sua rotina.",
  },
]

export function BeneficiosCurso() {
  return (
    <section className="pb-12 sm:pb-16">
      <Container>
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4" data-aos="fade-up">
          {BENEFICIOS.map((item) => (
            <li key={item.titulo} className="flex flex-col gap-4">
              <img src={item.icone} alt="" aria-hidden="true" className="h-12 w-12" />
              <h2 className="text-lg font-semibold">{item.titulo}</h2>
              <p className="text-[var(--sesi-muted)]">{item.texto}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
