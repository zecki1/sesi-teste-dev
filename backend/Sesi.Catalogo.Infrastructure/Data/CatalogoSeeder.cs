using Microsoft.EntityFrameworkCore;
using Sesi.Catalogo.Domain.Entities;
using Sesi.Catalogo.Infrastructure.Data;

namespace Sesi.Catalogo.Infrastructure.Data;

/// <summary>
/// Popula o banco com o catálogo inicial (categorias, modalidades, status, cursos, módulos e aulas).
/// Executa de forma idempotente: só insere quando as tabelas estão vazias.
/// </summary>
public static class CatalogoSeeder
{
    public static async Task SemearAsync(CatalogoDbContext db, CancellationToken ct = default)
    {
        if (await db.Cursos.AnyAsync(ct))
            return;

        var categorias = new List<Categoria>
        {
            new() { Nome = "Matemática", Slug = "matematica", IconeUrl = "/icons/matematica.svg", Cor = "#D97706", Ordem = 1 },
            new() { Nome = "Ciências da Natureza", Slug = "ciencias-da-natureza", IconeUrl = "/icons/ciencias-natureza.svg", Cor = "#0EA5E9", Ordem = 2 },
            new() { Nome = "Tecnologia", Slug = "tecnologia", IconeUrl = "/icons/tecnologia.svg", Cor = "#1D4ED8", Ordem = 3 },
            new() { Nome = "Gestão", Slug = "gestao", IconeUrl = "/icons/gestao.svg", Cor = "#C2410C", Ordem = 4 },
            new() { Nome = "Segurança do Trabalho", Slug = "seguranca-do-trabalho", IconeUrl = "/icons/seguranca.svg", Cor = "#047857", Ordem = 5 }
        };

        var modalidades = new List<Modalidade>
        {
            new() { Nome = "Presencial", Slug = "presencial" },
            new() { Nome = "EAD", Slug = "ead" }
        };

        var status = new List<StatusCurso>
        {
            new() { Nome = "Disponível", Slug = "disponivel" },
            new() { Nome = "Em breve", Slug = "em-breve" },
            new() { Nome = "Inscrições abertas", Slug = "inscricoes-abertas" }
        };

        db.Categorias.AddRange(categorias);
        db.Modalidades.AddRange(modalidades);
        db.StatusCursos.AddRange(status);

        var cat = categorias.ToDictionary(c => c.Slug);
        var mod = modalidades.ToDictionary(m => m.Slug);
        var sta = status.ToDictionary(s => s.Slug);

        var cursos = new List<Curso>
        {
            NovoCurso("Processo seletivo – Desenvolvedor de Sistemas I", "Desenvolvedor de Sistemas I", "processo-seletivo-desenvolvedor-de-sistemas-i",
                "Curso voltado à capacitação para o processo seletivo com foco em desenvolvimento de sistemas, lógica de programação, modelagem e práticas para criação de aplicações web.",
                40, "Candidatos a vagas de desenvolvedor de sistemas e estudantes de tecnologia", "/cursos/desenvolvedor-sistemas.svg", false, cat["tecnologia"], mod["presencial"], sta["disponivel"],
                new[] {
                    ("Lógica e Algoritmos", new[] { "Conceitos básicos de algoritmos", "Estruturas condicionais", "Laços de repetição" }),
                    ("Fundamentos Web", new[] { "HTML, CSS e semântica", "JavaScript básico", "Responsividade" }),
                    ("Banco de Dados e APIs", new[] { "Modelagem relacional", "SQL básico", "Consumo e criação de APIs REST" })
                }),

            NovoCurso("Desenvolvimento de Aplicações Web com C# e .NET", "Aplicações Web C# .NET", "desenvolvimento-de-aplicacoes-web-com-csharp-e-dotnet",
                "Formação prática em desenvolvimento web com ASP.NET Core, arquitetura em camadas, integração com banco de dados e publicação de aplicações.",
                60, "Desenvolvedores iniciantes e profissionais que desejam migrar para .NET", "/cursos/dotnet-web.svg", false, cat["tecnologia"], mod["ead"], sta["inscricoes-abertas"],
                new[] {
                    ("Introdução ao .NET", new[] { "Ambiente de desenvolvimento", "Estrutura de projetos", "Tipos e sintaxe C#" }),
                    ("ASP.NET Core Web API", new[] { "Minimal APIs e Controllers", "Validação e DTOs", "Documentação com Swagger" }),
                    ("Integração com Banco de Dados", new[] { "Entity Framework Core", "Migrations", "Relacionamentos" })
                }),

            NovoCurso("Gestão de Projetos e Metodologias Ágeis", "Gestão de Projetos Ágeis", "gestao-de-projetos-e-metodologias-ageis",
                "Aborda fundamentos de gestão, Scrum, Kanban, planejamento, acompanhamento de entregas e trabalho em equipe.",
                32, "Líderes, coordenadores e profissionais envolvidos em projetos", "/cursos/gestao-projetos.svg", false, cat["gestao"], mod["presencial"], sta["disponivel"],
                new[] {
                    ("Fundamentos de Gestão", new[] { "Ciclo de vida de projetos", "Papéis e responsabilidades", "Escopo e prazos" }),
                    ("Metodologias Ágeis", new[] { "Scrum: sprints e cerimônias", "Kanban e fluxo", "Métricas ágeis" })
                }),

            NovoCurso("Liderança e Comunicação Organizacional", "Liderança e Comunicação", "lideranca-e-comunicacao-organizacional",
                "Desenvolve competências de liderança, comunicação assertiva, feedback construtivo e gestão de conflitos no ambiente organizacional.",
                24, "Gestores, supervisores e profissionais em transição para liderança", "/cursos/lideranca.svg", false, cat["gestao"], mod["ead"], sta["inscricoes-abertas"],
                new[] {
                    ("Comunicação Assertiva", new[] { "Escuta ativa", "Comunicação verbal e não-verbal", "Feedback eficaz" }),
                    ("Liderança na Prática", new[] { "Estilos de liderança", "Gestão de conflitos", "Desenvolvimento de equipes" })
                }),

            NovoCurso("Prevenção e Combate a Incêndios", "Prevenção e Combate a Incêndios", "prevencao-e-combate-a-incendios",
                "Capacitação teórico-prática sobre prevenção, classes de incêndio, extintores, rotas de fuga e procedimentos de emergência.",
                16, "Colaboradores de empresas de todos os setores", "/cursos/incendios.svg", false, cat["seguranca-do-trabalho"], mod["presencial"], sta["disponivel"],
                new[] {
                    ("Legislação e Conceitos", new[] { "Incêndio: teoria do triângulo", "Classes de incêndio", "Normas aplicáveis" }),
                    ("Combate e Emergência", new[] { "Extintores e seu uso", "Rotas de fuga e sinalização", "Simulado prático" })
                }),

            NovoCurso("Segurança em Espaços Confinados", "Espaços Confinados", "seguranca-em-espacos-confinados",
                "Formação sobre riscos, autorização de entrada, monitoramento atmosférico, equipamentos de proteção e procedimentos de resgate.",
                20, "Trabalhadores, vigias e supervisores que atuam em espaços confinados", "/cursos/espacos-confinados.svg", false, cat["seguranca-do-trabalho"], mod["presencial"], sta["em-breve"],
                new[] {
                    ("Identificação de Riscos", new[] { "O que são espaços confinados", "Riscos atmosféricos", "Outros riscos" }),
                    ("Permissão e Resgate", new[] { "Permissão de entrada e trabalho", "Monitoramento e EPI/EPC", "Plano de resgate" })
                }),

            NovoCurso("Matemática para a Precisão: Medidas e Escalas na Metalurgia", "Medidas e Escalas na Metalurgia", "matematica-para-a-precisao-medidas-e-escalas-na-metalurgia",
                "Aplicação de grandezas, proporções e escalas em processos de corte, furação e usinagem.",
                24, "Profissionais da metalurgia, operadores de máquinas e técnicos que trabalham com medições e escalas", "/cursos/matematica-precisao.svg", true, cat["matematica"], mod["presencial"], sta["inscricoes-abertas"],
                new[] {
                    ("Grandezas e Unidades", new[] { "Sistema Internacional de Unidades", "Conversão de unidades", "Leitura de instrumentos" }),
                    ("Proporção e Escala", new[] { "Razão e proporção", "Escalas de desenho técnico", "Cálculo de tolerâncias" }),
                    ("Aplicação na Usinagem", new[] { "Medidas em corte e furação", "Erros de medição", "Estudo de caso na metalurgia" })
                },
                new DateOnly(2026, 1, 5)),

            NovoCurso("Geometria e Modelagem no Design Têxtil", "Geometria no Design Têxtil", "geometria-e-modelagem-no-design-textil",
                "Explora formas geométricas, simetria e padrões matemáticos presentes em tecidos e estampas.",
                20, "Designers têxteis, modelistas e profissionais de estamparia", "/cursos/geometria-modelagem.svg", true, cat["matematica"], mod["ead"], sta["disponivel"],
                new[] {
                    ("Formas e Simetria", new[] { "Figuras geométricas planas", "Simetria e padrões", "Transformações no plano" }),
                    ("Modelagem e Estamparia", new[] { "Malhas e repetição", "Construção de moldes", "Padronagens digitais" })
                },
                new DateOnly(2026, 2, 2)),

            NovoCurso("Estatística e Controle de Qualidade na Produção", "Estatística e Qualidade", "estatistica-e-controle-de-qualidade-na-producao",
                "Leitura e interpretação de dados de controle de qualidade e produtividade.",
                32, "Analistas de qualidade, supervisores de produção e profissionais de melhoria contínua", "/cursos/estatistica-qualidade.svg", true, cat["matematica"], mod["ead"], sta["disponivel"],
                new[] {
                    ("Fundamentos de Estatística", new[] { "Medidas de tendência central", "Dispersão e variabilidade", "Amostragem" }),
                    ("Controle Estatístico", new[] { "Cartas de controle", "Capacidade de processo", "Análise de indicadores" })
                },
                new DateOnly(2026, 3, 2)),

            NovoCurso("Física do Movimento e da Energia na Metalurgia", "Física na Metalurgia", "fisica-do-movimento-e-da-energia-na-metalurgia",
                "Estudo de forças, atrito, calor e energia em máquinas, fornos e prensas.",
                28, "Operadores, técnicos de manutenção e profissionais de processos industriais", "/cursos/fisica-movimento.svg", true, cat["ciencias-da-natureza"], mod["presencial"], sta["disponivel"],
                new[] {
                    ("Forças e Movimento", new[] { "Leis de Newton", "Atrito e resistência", "Máquinas simples" }),
                    ("Calor e Energia", new[] { "Termodinâmica aplicada", "Transferência de calor", "Eficiência energética" })
                },
                new DateOnly(2026, 1, 19)),

            NovoCurso("Química e Sustentabilidade", "Química e Sustentabilidade", "quimica-e-sustentabilidade",
                "Estudo das reações químicas envolvidas na tinturaria e acabamento de tecidos.",
                24, "Profissionais de tinturaria, acabamento têxtil e meio ambiente", "/cursos/quimica-sustentabilidade.svg", true, cat["ciencias-da-natureza"], mod["ead"], sta["inscricoes-abertas"],
                new[] {
                    ("Reações Químicas", new[] { "Ácidos e bases", "Oxidação e redução", "Cinética química" }),
                    ("Tinturaria e Acabamento", new[] { "Corantes e pigmentos", "Processos de tingimento", "Tratamento de efluentes" })
                },
                new DateOnly(2026, 2, 16)),

            NovoCurso("Ciência dos Materiais na Metalurgia", "Ciência dos Materiais", "ciencia-dos-materiais-na-metalurgia",
                "Conceitos básicos de estrutura, resistência e propriedades dos metais.",
                36, "Estudantes e profissionais que atuam com materiais metálicos e processos de fabricação", "/cursos/ciencia-materiais.svg", true, cat["ciencias-da-natureza"], mod["presencial"], sta["em-breve"],
                new[] {
                    ("Estrutura dos Materiais", new[] { "Ligação metálica", "Estrutura cristalina", "Imperfeições" }),
                    ("Propriedades Mecânicas", new[] { "Resistência e dureza", "Ensaios mecânicos", "Tratamentos térmicos" })
                },
                new DateOnly(2026, 4, 6))
        };

        db.Cursos.AddRange(cursos);
        await db.SaveChangesAsync(ct);
    }

    private static Curso NovoCurso(
        string nomeCompleto, string nomeBreve, string slug, string descricao,
        int cargaHoraria, string publicoAlvo, string imagemUrl, bool destaque,
        Categoria categoria, Modalidade modalidade, StatusCurso status,
        IEnumerable<(string Titulo, string[] Aulas)> modulos,
        DateOnly? dataInicio = null)
    {
        var curso = new Curso
        {
            NomeCompleto = nomeCompleto,
            NomeBreve = nomeBreve,
            Slug = slug,
            Descricao = descricao,
            CargaHoraria = cargaHoraria,
            PublicoAlvo = publicoAlvo,
            ImagemUrl = imagemUrl,
            DataDisponibilizacao = dataInicio,
            Destaque = destaque,
            Ativo = true,
            Categoria = categoria,
            Modalidade = modalidade,
            Status = status
        };

        var ordemModulo = 1;
        foreach (var (tituloModulo, aulas) in modulos)
        {
            var modulo = new Modulo
            {
                Ordem = ordemModulo++,
                Titulo = tituloModulo,
                Descricao = $"Módulo \"{tituloModulo}\" do curso {nomeBreve}."
            };

            var ordemAula = 1;
            foreach (var tituloAula in aulas)
            {
                modulo.Aulas.Add(new Aula
                {
                    Ordem = ordemAula++,
                    Titulo = tituloAula,
                    Descricao = $"{tituloAula} — conteúdo do módulo {tituloModulo}.",
                    DuracaoMinutos = 30
                });
            }

            curso.Modulos.Add(modulo);
        }

        return curso;
    }
}
