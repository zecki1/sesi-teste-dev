using Microsoft.EntityFrameworkCore;
using Sesi.Catalogo.Domain.Entities;

namespace Sesi.Catalogo.Infrastructure.Data;

/// <summary>
/// Cria 10 perguntas frequentes básicas por curso, nos três idiomas.
/// Idempotente: só preenche cursos que ainda não têm nenhuma pergunta cadastrada,
/// preservando o que a gestão já editou.
/// </summary>
public static class CatalogoPerguntasSeeder
{
    private sealed record Traducao(string Pergunta, string Resposta);

    private static readonly (Traducao Pt, Traducao En, Traducao Es)[] Perguntas =
    [
        (
            new("Como funciona a matrícula neste curso?",
                "Escolha uma turma disponível na página do curso e confirme a matrícula. Se preferir, use o formulário \"Fale com a gente\" para receber orientação."),
            new("How does enrollment work for this course?",
                "Choose an available class on the course page and confirm your enrollment. If you prefer, use the \"Talk to us\" form to get guidance."),
            new("¿Cómo funciona la matrícula en este curso?",
                "Elige una clase disponible en la página del curso y confirma la matrícula. Si lo prefieres, usa el formulario \"Habla con nosotros\" para recibir orientación.")
        ),
        (
            new("Qual é a carga horária e o prazo para concluir?",
                "A carga horária aparece no topo desta página. O curso fica disponível na Área do Aluno e você pode estudar no seu ritmo dentro do período da turma."),
            new("What is the workload and the deadline to finish?",
                "The workload is shown at the top of this page. The course is available in the Student Area and you can study at your own pace within the class period."),
            new("¿Cuál es la carga horaria y el plazo para concluir?",
                "La carga horaria aparece en la parte superior de esta página. El curso está disponible en el Área del Alumno y puedes estudiar a tu ritmo dentro del período de la clase.")
        ),
        (
            new("O curso emite certificado?",
                "Sim. Ao concluir as atividades e atingir o aproveitamento mínimo, o certificado é emitido pelo SESI e fica disponível na Área do Aluno."),
            new("Does the course issue a certificate?",
                "Yes. Once you complete the activities and reach the minimum score, SESI issues the certificate and it becomes available in the Student Area."),
            new("¿El curso emite certificado?",
                "Sí. Al concluir las actividades y alcanzar el aprovechamiento mínimo, el SESI emite el certificado y queda disponible en el Área del Alumno.")
        ),
        (
            new("Preciso ter conhecimento prévio?",
                "Não é obrigatório. O conteúdo foi organizado para acompanhar você desde os primeiros conceitos, com materiais de apoio em cada módulo."),
            new("Do I need previous knowledge?",
                "It is not required. The content is organized to guide you from the first concepts, with support materials in each module."),
            new("¿Necesito conocimientos previos?",
                "No es obligatorio. El contenido está organizado para acompañarte desde los primeros conceptos, con materiales de apoyo en cada módulo.")
        ),
        (
            new("Quais são os requisitos técnicos para acompanhar as aulas?",
                "Você precisa de um computador ou celular com internet, navegador atualizado e fones de ouvido para as videoaulas."),
            new("What are the technical requirements to follow the lessons?",
                "You need a computer or phone with internet access, an updated browser and headphones for the video lessons."),
            new("¿Cuáles son los requisitos técnicos para seguir las clases?",
                "Necesitas un computador o celular con internet, un navegador actualizado y auriculares para las videoclases.")
        ),
        (
            new("Como acesso o conteúdo depois de matriculado?",
                "O conteúdo fica na Área do Aluno, em Meus Cursos. Basta entrar com o seu login para retomar de onde parou."),
            new("How do I access the content after enrolling?",
                "The content is in the Student Area, under My Courses. Just sign in to pick up where you left off."),
            new("¿Cómo accedo al contenido después de matricularme?",
                "El contenido está en el Área del Alumno, en Mis Cursos. Solo tienes que iniciar sesión para continuar donde lo dejaste.")
        ),
        (
            new("Posso estudar pelo celular?",
                "Sim. A Área do Aluno e as aulas são responsivas e funcionam em celulares e tablets, além do computador."),
            new("Can I study on my phone?",
                "Yes. The Student Area and the lessons are responsive and work on phones and tablets, as well as on computers."),
            new("¿Puedo estudiar desde el celular?",
                "Sí. El Área del Alumno y las clases son responsivas y funcionan en celulares y tablets, además del computador.")
        ),
        (
            new("O que acontece se eu não terminar no prazo?",
                "O acesso permanece enquanto a turma estiver ativa. Se precisar de mais prazo, fale com a gente para avaliar a melhor alternativa."),
            new("What happens if I do not finish on time?",
                "Access remains available while the class is active. If you need more time, talk to us so we can evaluate the best option."),
            new("¿Qué pasa si no termino en el plazo?",
                "El acceso permanece disponible mientras la clase esté activa. Si necesitas más plazo, habla con nosotros para evaluar la mejor alternativa.")
        ),
        (
            new("Como tiro dúvidas durante o curso?",
                "Cada curso tem um canal de contato no fim da página. Sua mensagem é registrada com protocolo e respondida por e-mail."),
            new("How do I ask questions during the course?",
                "Each course has a contact channel at the bottom of the page. Your message is recorded with a ticket number and answered by email."),
            new("¿Cómo resuelvo dudas durante el curso?",
                "Cada curso tiene un canal de contacto al final de la página. Tu mensaje se registra con un protocolo y se responde por correo electrónico.")
        ),
        (
            new("Existe algum custo para participar?",
                "O valor e as condições aparecem na página do curso e na confirmação da matrícula. Cursos gratuitos são identificados na oferta."),
            new("Is there any cost to participate?",
                "The price and conditions are shown on the course page and at enrollment confirmation. Free courses are identified in the offer."),
            new("¿Existe algún costo para participar?",
                "El valor y las condiciones aparecen en la página del curso y en la confirmación de la matrícula. Los cursos gratuitos se identifican en la oferta.")
        ),
    ];

    public static async Task SemearAsync(CatalogoDbContext db, CancellationToken ct = default)
    {
        var cursosComPerguntas = await db.CursosPerguntas.AsNoTracking()
            .Select(p => p.CursoId)
            .Distinct()
            .ToListAsync(ct);

        var cursos = await db.Cursos.AsNoTracking()
            .Where(c => c.Ativo && !cursosComPerguntas.Contains(c.Id))
            .Select(c => c.Id)
            .ToListAsync(ct);

        if (cursos.Count == 0)
            return;

        foreach (var cursoId in cursos)
        {
            for (var i = 0; i < Perguntas.Length; i++)
            {
                var (pt, en, es) = Perguntas[i];
                db.CursosPerguntas.Add(new CursoPergunta
                {
                    CursoId = cursoId,
                    Ordem = i,
                    Ativa = true,
                    Traducoes =
                    [
                        new CursoPerguntaTraducao { Idioma = "pt-BR", Pergunta = pt.Pergunta, Resposta = pt.Resposta },
                        new CursoPerguntaTraducao { Idioma = "en-US", Pergunta = en.Pergunta, Resposta = en.Resposta },
                        new CursoPerguntaTraducao { Idioma = "es-ES", Pergunta = es.Pergunta, Resposta = es.Resposta },
                    ]
                });
            }
        }

        await db.SaveChangesAsync(ct);
    }
}
