import { useTranslation } from "react-i18next"
import { Container } from "@/components/layout/container"
import certificacao from "@/assets/beneficios/certificacao.svg"
import professores from "@/assets/beneficios/professores.svg"
import suporte from "@/assets/beneficios/suporte.svg"
import flexibilidade from "@/assets/beneficios/flexibilidade.svg"

const BENEFICIOS = [
  {
    icone: certificacao,
    titulo: "benefitCertificationTitle",
    texto: "benefitCertificationText",
  },
  {
    icone: professores,
    titulo: "benefitTeachersTitle",
    texto: "benefitTeachersText",
  },
  {
    icone: suporte,
    titulo: "benefitSupportTitle",
    texto: "benefitSupportText",
  },
  {
    icone: flexibilidade,
    titulo: "benefitFlexibilityTitle",
    texto: "benefitFlexibilityText",
  },
]

export function BeneficiosCurso() {
  const { t } = useTranslation("course")

  return (
    <section className="pb-12 sm:pb-16">
      <Container>
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4" data-aos="fade-up">
          {BENEFICIOS.map((item) => (
            <li key={item.titulo} className="flex flex-col gap-4">
              <img src={item.icone} alt="" aria-hidden="true" className="h-12 w-12" />
              <h2 className="text-lg font-semibold">{t(item.titulo)}</h2>
              <p className="text-[var(--sesi-muted)]">{t(item.texto)}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
