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
            new() { Nome = "Ciências e Natureza", Slug = "ciencias-e-natureza", IconeUrl = "/icons/ciencias.svg", Cor = "#1E7F4F", Ordem = 1 },
            new() { Nome = "Linguagens", Slug = "linguagens", IconeUrl = "/icons/linguagens.svg", Cor = "#C2410C", Ordem = 2 },
            new() { Nome = "Matemática", Slug = "matematica", IconeUrl = "/icons/matematica.svg", Cor = "#1D4ED8", Ordem = 3 },
            new() { Nome = "Sustentabilidade", Slug = "sustentabilidade", IconeUrl = "/icons/sustentabilidade.svg", Cor = "#047857", Ordem = 4 }
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
            NovoCurso("Robótica e Automação Industrial", "Robótica Industrial", "robotica-e-automacao-industrial",
                "Introdução à robótica aplicada à indústria, com fundamentos de automação, sensores, atuadores e programação de CLPs.",
                40, "Estudantes do ensino médio e profissionais da indústria", "/cursos/robotica.svg", true, cat["ciencias-e-natureza"], mod["presencial"], sta["disponivel"],
                new[] {
                    ("Fundamentos da Robótica", new[] { "História e evolução", "Tipos de robôs industriais", "Aplicações na indústria" }),
                    ("Sensores e Atuadores", new[] { "Sensores de posição", "Atuadores elétricos", "Integração de sistemas" }),
                    ("Programação de CLP", new[] { "Lógica ladder", "Variáveis e temporizadores", "Projeto prático" })
                }),

            NovoCurso("Desenvolvimento Web Full Stack", "Web Full Stack", "desenvolvimento-web-full-stack",
                "Formação em desenvolvimento web com HTML, CSS, JavaScript, TypeScript e frameworks modernos de front-end e back-end.",
                60, "Jovens aprendizes e iniciantes em tecnologia", "/cursos/web-fullstack.svg", true, cat["linguagens"], mod["ead"], sta["disponivel"],
                new[] {
                    ("Fundamentos da Web", new[] { "HTML semântico", "CSS e layout responsivo", "Introdução ao JavaScript" }),
                    ("Front-end Moderno", new[] { "Componentes e estado", "Consumo de APIs", "Boas práticas de acessibilidade" }),
                    ("Back-end e Banco de Dados", new[] { "APIs REST", "Modelagem de dados", "Publicação da aplicação" })
                }),

            NovoCurso("Matemática Aplicada à Indústria", "Matemática Industrial", "matematica-aplicada-a-industria",
                "Matemática aplicada a problemas reais da indústria: medições, proporções, funções, estatística e cálculo de produção.",
                30, "Estudantes do ensino médio", "/cursos/matematica.svg", false, cat["matematica"], mod["presencial"], sta["disponivel"],
                new[] {
                    ("Medidas e Proporções", new[] { "Unidades e conversões", "Regra de três", "Escalas e plantas" }),
                    ("Funções e Gráficos", new[] { "Função afim", "Função quadrática", "Leitura de gráficos" }),
                    ("Estatística na Produção", new[] { "Média e dispersão", "Controle de qualidade", "Interpretação de dados" })
                }),

            NovoCurso("Sustentabilidade e Eficiência Energética", "Eficiência Energética", "sustentabilidade-e-eficiencia-energetica",
                "Práticas de sustentabilidade industrial, uso racional de energia, resíduos e tecnologias limpas.",
                24, "Profissionais da indústria e comunidade", "/cursos/sustentabilidade.svg", true, cat["sustentabilidade"], mod["ead"], sta["inscricoes-abertas"],
                new[] {
                    ("Fundamentos da Sustentabilidade", new[] { "Desenvolvimento sustentável", "Pegada ambiental", "Legislação aplicada" }),
                    ("Eficiência Energética", new[] { "Diagnóstico de consumo", "Fontes renováveis", "Indicadores de eficiência" })
                }),

            NovoCurso("Leitura e Produção de Textos Técnicos", "Textos Técnicos", "leitura-e-producao-de-textos-tecnicos",
                "Desenvolvimento da escrita técnica: relatórios, procedimentos, normas e comunicação profissional.",
                20, "Estudantes e profissionais técnicos", "/cursos/textos-tecnicos.svg", false, cat["linguagens"], mod["presencial"], sta["disponivel"],
                new[] {
                    ("Gêneros Técnicos", new[] { "Relatórios", "Procedimentos e instruções", "Normas e formatação" }),
                    ("Clareza e Coesão", new[] { "Paragrafação", "Conectivos", "Revisão e edição" })
                }),

            NovoCurso("Introdução à Indústria 4.0", "Indústria 4.0", "introducao-a-industria-4-0",
                "Conceitos da quarta revolução industrial: IoT, big data, sistemas ciber-físicos e manufatura inteligente.",
                36, "Profissionais e estudantes da área industrial", "/cursos/industria-4-0.svg", true, cat["ciencias-e-natureza"], mod["ead"], sta["em-breve"],
                new[] {
                    ("A Quarta Revolução", new[] { "Contexto histórico", "Pilares da Indústria 4.0", "Impactos no trabalho" }),
                    ("Tecnologias Habilitadoras", new[] { "Internet das Coisas", "Big data e analytics", "Sistemas ciber-físicos" }),
                    ("Manufatura Inteligente", new[] { "Fábrica conectada", "Manutenção preditiva", "Estudo de caso" })
                }),

            NovoCurso("Gestão da Qualidade na Produção", "Gestão da Qualidade", "gestao-da-qualidade-na-producao",
                "Fundamentos de qualidade, ferramentas de melhoria contínua, PDCA e indicadores de desempenho.",
                28, "Lideranças e profissionais de produção", "/cursos/qualidade.svg", false, cat["matematica"], mod["presencial"], sta["inscricoes-abertas"],
                new[] {
                    ("Fundamentos da Qualidade", new[] { "Evolução do conceito", "Normas ISO", "Custo da qualidade" }),
                    ("Ferramentas da Qualidade", new[] { "PDCA e MASP", "Diagrama de Ishikawa", "Cartas de controle" })
                }),

            NovoCurso("Inglês Técnico para a Indústria", "Inglês Técnico", "ingles-tecnico-para-a-industria",
                "Inglês instrumental para leitura de manuais, normas técnicas e comunicação profissional na indústria.",
                32, "Profissionais que lidam com documentação técnica", "/cursos/ingles-tecnico.svg", false, cat["linguagens"], mod["ead"], sta["disponivel"],
                new[] {
                    ("Estratégias de Leitura", new[] { "Skimming e scanning", "Cognatos e falsos cognatos", "Vocabulário técnico" }),
                    ("Comunicação Profissional", new[] { "E-mails e mensagens", "Reuniões e apresentações", "Documentação técnica" })
                }),

            NovoCurso("Ciências Ambientais e Reciclagem", "Ciências Ambientais", "ciencias-ambientais-e-reciclagem",
                "Ciências ambientais aplicadas: ciclos naturais, poluição, reciclagem e economia circular.",
                26, "Estudantes e comunidade em geral", "/cursos/ciencias-ambientais.svg", true, cat["sustentabilidade"], mod["presencial"], sta["disponivel"],
                new[] {
                    ("Meio Ambiente e Sociedade", new[] { "Ecossistemas", "Ciclos biogeoquímicos", "Impactos humanos" }),
                    ("Reciclagem e Economia Circular", new[] { "Tipos de resíduos", "Processos de reciclagem", "Design circular" }),
                    ("Projeto Ambiental Comunitário", new[] { "Diagnóstico local", "Plano de ação", "Apresentação de resultados" })
                }),

            NovoCurso("Física Aplicada a Processos Industriais", "Física Aplicada", "fisica-aplicada-a-processos-industriais",
                "Física aplicada à indústria: mecânica, calor, eletricidade e suas aplicações em processos produtivos.",
                34, "Estudantes do ensino médio técnico", "/cursos/fisica.svg", false, cat["ciencias-e-natureza"], mod["presencial"], sta["em-breve"],
                new[] {
                    ("Mecânica Aplicada", new[] { "Movimento e força", "Trabalho e energia", "Máquinas simples" }),
                    ("Calor e Termodinâmica", new[] { "Temperatura e calor", "Leis da termodinâmica", "Trocadores de calor" }),
                    ("Eletricidade Básica", new[] { "Corrente e tensão", "Circuitos", "Motores elétricos" })
                })
        };

        db.Cursos.AddRange(cursos);
        await db.SaveChangesAsync(ct);
    }

    private static Curso NovoCurso(
        string nomeCompleto, string nomeBreve, string slug, string descricao,
        int cargaHoraria, string publicoAlvo, string imagemUrl, bool destaque,
        Categoria categoria, Modalidade modalidade, StatusCurso status,
        IEnumerable<(string Titulo, string[] Aulas)> modulos)
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
