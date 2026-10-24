import { useTranslation } from "react-i18next"
import type { CursoDetalheDto } from "@/lib/api/catalogo"
import { Container } from "@/components/layout/container"
import { Accordion, AccordionItem } from "@/components/ui/accordion"

export function SobreCurso({ curso, descricao = curso.descricao }: { curso: CursoDetalheDto; descricao?: string }) {
  const { t } = useTranslation("course")
  const perguntas = curso.perguntas ?? []

  return (
    <section className="py-12 sm:py-16">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div data-aos="fade-up" className="flex flex-col gap-6 lg:col-span-4">
            <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">{t("aboutTitle")}</h2>
            <p className="whitespace-pre-line text-lg leading-relaxed text-[var(--sesi-muted)]">{descricao}</p>
          </div>

          <div data-aos="fade-up" data-aos-delay="120" className="lg:col-span-8">
            <Accordion>
              <AccordionItem title={t("modulesSection")}>
                <ol className="flex list-decimal flex-col gap-5 pl-5">
                  {curso.modulos.map((modulo) => (
                    <li key={modulo.id}>
                      <p className="font-semibold text-[var(--sesi-black)]">{modulo.titulo}</p>
                      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                        {modulo.aulas.map((aula) => (
                          <li key={aula.id}>{aula.titulo}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </AccordionItem>

              <AccordionItem title={t("onlineClassesSection")}>
                <p>{t("onlineClassesText")}</p>
                <ul className="mt-4 flex list-disc flex-col gap-2 pl-5">
                  <li>{t("onlineClassesBullet1")}</li>
                  <li>{t("onlineClassesBullet2")}</li>
                  <li>{t("onlineClassesBullet3")}</li>
                </ul>
              </AccordionItem>

              <AccordionItem title={t("faqSection")}>
                {perguntas.length === 0 ? (
                  <p className="text-[var(--sesi-muted)]">{t("faqEmpty")}</p>
                ) : (
                  <dl className="flex flex-col gap-4">
                    {perguntas.map((item, indice) => (
                      <div key={item.id}>
                        <dt className="font-semibold text-[var(--sesi-black)]">
                          {indice + 1}. {item.pergunta}
                        </dt>
                        <dd className="mt-1">{item.resposta}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </Container>
    </section>
  )
}
