import { Container } from "@/components/layout/container"

const indicators = [
  { value: "25.000+", label: "Profissionais Capacitados" },
  { value: "500+", label: "Empresas parceiras" },
  { value: "4.8/5", label: "Avaliação média" },
  { value: "2.5M+", label: "Horas de capacitação" },
]

export function Impact() {
  return (
    <section id="impacto" className="py-16">
      <Container className="flex flex-col gap-10">
        <div className="max-w-3xl">
          <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">Impacto transformador</h2>
          <p className="mt-3 text-lg text-[var(--sesi-muted)]">Resultados que demonstram o sucesso da nossa metodologia de capacitação contínua para a indústria</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {indicators.map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] p-8 text-center shadow-[var(--shadow-card)]">
              <span className="font-['Open_Sans_Condensed',sans-serif] text-4xl font-extrabold text-[var(--sesi-red)]">{item.value}</span>
              <span className="text-[var(--sesi-muted)]">{item.label}</span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
