import { useTranslation } from "react-i18next"
import { Container } from "@/components/layout/container"
import cert from "@/assets/01-certificacao-red.svg"
import prof from "@/assets/02-professores-red.svg"
import support from "@/assets/03-suporte-red.svg"

const indicators = [
  { value: "25.000+", labelKey: "impactIndicatorGraduated" },
  { value: "500+", labelKey: "impactIndicatorPartners" },
  { value: "4.8/5", labelKey: "impactIndicatorRating" },
  { value: "2.5M+", labelKey: "impactIndicatorHours" },
]

const differentials = [
  {
    icon: cert,
    titleKey: "impactCertificationTitle",
    textKey: "impactCertificationText",
  },
  {
    icon: prof,
    titleKey: "impactTeachersTitle",
    textKey: "impactTeachersText",
  },
  {
    icon: support,
    titleKey: "impactSupportTitle",
    textKey: "impactSupportText",
  },
]

export function Impact() {
  const { t } = useTranslation("landing")

  return (
    <section id="impacto" className="scroll-mt-[88px] py-16 sm:py-20">
      <Container className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div data-aos="fade-up" className="lg:col-span-5">
          <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">
            {t("impactTitle")}
          </h2>
          <p className="mt-3 text-base text-[var(--sesi-black)] sm:text-lg">
            {t("impactSubtitle")}
          </p>
        </div>

        <div className="flex flex-col gap-14 lg:col-span-7">
          <dl className="flex flex-col">
            {indicators.map((item, index) => (
              <div key={item.labelKey} data-aos="fade-up" data-aos-delay={index * 60} className="flex flex-row-reverse items-center justify-between gap-4 border-b border-[var(--sesi-gray)] pb-5">
                <dt className="text-2xl font-regular text-[var(--sesi-black)]">{t(item.labelKey)}</dt>
                <dd className="font-['Open_Sans_Condensed',sans-serif] text-4xl font-bold text-[var(--sesi-black)] sm:text-6xl">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <ul className="grid gap-8 sm:grid-cols-3">
            {differentials.map((item, index) => (
              <li key={item.titleKey} data-aos="fade-up" data-aos-delay={index * 80} className="flex flex-col gap-3">
                <img src={item.icon} alt="" aria-hidden="true" className="h-11 w-11" />
                <h3 className="text-lg font-semibold text-[var(--sesi-black)]">{t(item.titleKey)}</h3>
                <p className="text-sm text-[var(--sesi-black)] sm:text-base">{t(item.textKey)}</p>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  )
}
