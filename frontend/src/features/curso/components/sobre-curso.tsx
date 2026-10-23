import type { CursoDetalheDto } from "@/lib/api/catalogo"
import { Container } from "@/components/layout/container"
import { Accordion, AccordionItem } from "@/components/ui/accordion"

const DUVIDAS = [
  {
    pergunta: "O curso é totalmente online?",
    resposta:
      "Sim. Todas as aulas, atividades e avaliações são realizadas pela plataforma digital, permitindo que o aluno estude de onde estiver, no seu próprio ritmo.",
  },
  {
    pergunta: "Preciso estar disponível em horários específicos?",
    resposta:
      "Não. As aulas são gravadas e ficam disponíveis 24 horas por dia. O aluno pode acessar o conteúdo quando for mais conveniente, respeitando os prazos de cada módulo.",
  },
  {
    pergunta: "Como são feitas as avaliações?",
    resposta:
      "As avaliações são realizadas diretamente na plataforma, por meio de provas objetivas, estudos de caso e atividades práticas. Algumas avaliações podem ter tempo limitado e exigem atenção às instruções.",
  },
  {
    pergunta: "O curso oferece certificado?",
    resposta:
      "Sim. Ao concluir todos os módulos e ser aprovado nas avaliações, o aluno recebe um certificado digital de conclusão, válido em todo o território nacional.",
  },
  {
    pergunta: "Quem são os professores?",
    resposta:
      "O corpo docente é formado por especialistas, engenheiros e professores com ampla experiência em segurança do trabalho e atuação direta na indústria. Os perfis dos docentes estão disponíveis na plataforma.",
  },
  {
    pergunta: "Há suporte para dúvidas durante o curso?",
    resposta:
      "Sim. Os alunos podem enviar dúvidas por meio dos fóruns de discussão, chats da plataforma ou durante os webinários ao vivo. A equipe pedagógica está disponível para auxiliar durante todo o curso.",
  },
  {
    pergunta: "O curso exige algum conhecimento prévio?",
    resposta:
      "Não é obrigatório, mas é recomendado que o aluno tenha interesse ou alguma familiaridade com o ambiente industrial. O curso foi estruturado para atender tanto iniciantes quanto profissionais em busca de atualização.",
  },
  {
    pergunta: "Posso acessar o curso pelo celular?",
    resposta:
      "Sim. A plataforma é responsiva e compatível com computadores, tablets e smartphones, garantindo uma experiência completa em qualquer dispositivo.",
  },
  {
    pergunta: "Quanto tempo tenho para concluir o curso?",
    resposta:
      "O prazo para conclusão varia conforme o plano escolhido. Em geral, o aluno tem entre 3 a 6 meses para finalizar todos os módulos e avaliações.",
  },
  {
    pergunta: "O curso é reconhecido por órgãos oficiais?",
    resposta:
      "O curso segue as diretrizes das Normas Regulamentadoras (NRs) e boas práticas da área, sendo reconhecido como formação complementar. Para certificações oficiais, é necessário verificar os requisitos específicos de cada órgão regulador.",
  },
]

export function SobreCurso({ curso, descricao = curso.descricao }: { curso: CursoDetalheDto; descricao?: string }) {
  return (
    <section className="py-12 sm:py-16">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div data-aos="fade-up" className="flex flex-col gap-6 lg:col-span-4">
            <h2 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">Sobre o curso</h2>
            <p className="whitespace-pre-line text-lg leading-relaxed text-[var(--sesi-muted)]">{descricao}</p>
          </div>

          <div data-aos="fade-up" data-aos-delay="120" className="lg:col-span-8">
            <Accordion>
              <AccordionItem title="Módulos">
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

              <AccordionItem title="Aulas online e avaliações">
                <p>
                  As aulas combinam videoaulas, materiais de apoio, provas e avaliações. Cada módulo termina com uma
                  avaliação curta, corrigida na hora, para você acompanhar a sua evolução.
                </p>
                <ul className="mt-4 flex list-disc flex-col gap-2 pl-5">
                  <li>Videoaulas e materiais complementares na Área do Aluno.</li>
                  <li>Provas e avaliações objetivas ao final de cada módulo.</li>
                  <li>Certificado emitido pelo SESI após a conclusão.</li>
                </ul>
              </AccordionItem>

              <AccordionItem title="Dúvidas frequentes">
                <dl className="flex flex-col gap-4">
                  {DUVIDAS.map((item, indice) => (
                    <div key={item.pergunta}>
                      <dt className="font-semibold text-[var(--sesi-black)]">
                        {indice + 1}. {item.pergunta}
                      </dt>
                      <dd className="mt-1">{item.resposta}</dd>
                    </div>
                  ))}
                </dl>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </Container>
    </section>
  )
}
