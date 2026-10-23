import { Container } from "@/components/layout/container"
import cert from "@/assets/01-certificacao-red.svg"
import prof from "@/assets/02-professores-red.svg"
import support from "@/assets/03-suporte-red.svg"

const indicators = [
  { value: "25.000+", label: "Profissionais Capacitados" },
  { value: "500+", label: "Empresas parceiras" },
  { value: "4.8/5", label: "Avaliação média" },
  { value: "2.5M+", label: "Horas de capacitação" },
]

const differentials = [
  {
    icon: cert,
    title: "Certificação SESI",
    text: "Cursos com a melhor certificação do mercado industrial reconhecidos pelo SESI.",
  },
  {
    icon: prof,
    title: "Professores especialistas",
    text: "Contamos com professores reconhecidos por sua excelência no mercado.",
  },
  {
    icon: support,
    title: "Suporte contínuo",
    text: "Você não está sozinho! Acompanhamento online durante todo o curso.",
  },
]

export function Impact() {
  return (
    <section id="impacto" className="scroll-mt-[88px] py-16 sm:py-20">
      <Container className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div data-aos="fade-up" className="lg:col-span-5">
          <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">
            Impacto transformador
          </h2>
          <p className="mt-3 text-base text-[var(--sesi-black)] sm:text-lg">
            Resultados que demonstram o sucesso da nossa metodologia de capacitação contínua para a
            indústria
          </p>
        </div>

        <div className="flex flex-col gap-14 lg:col-span-7">
          <dl className="flex flex-col">
            {indicators.map((item, index) => (
              <div key={item.label} data-aos="fade-up" data-aos-delay={index * 60} className="flex flex-row-reverse items-center justify-between gap-4 border-b border-[var(--sesi-gray)] pb-5">
                <dt className="text-2xl font-regular text-[var(--sesi-black)]">{item.label}</dt>
                <dd className="font-['Open_Sans_Condensed',sans-serif] text-4xl font-bold text-[var(--sesi-black)] sm:text-6xl">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <ul className="grid gap-8 sm:grid-cols-3">
            {differentials.map((item, index) => (
              <li key={item.title} data-aos="fade-up" data-aos-delay={index * 80} className="flex flex-col gap-3">
                <img src={item.icon} alt="" aria-hidden="true" className="h-11 w-11" />
                <h3 className="text-lg font-semibold text-[var(--sesi-black)]">{item.title}</h3>
                <p className="text-sm text-[var(--sesi-black)] sm:text-base">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  )
}
