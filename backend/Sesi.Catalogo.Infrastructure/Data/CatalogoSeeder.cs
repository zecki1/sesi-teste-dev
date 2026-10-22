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
            new() { Nome = "Tecnologia", Slug = "tecnologia", IconeUrl = "/icons/tecnologia.svg", Cor = "#1D4ED8", Ordem = 1 },
            new() { Nome = "Gestão", Slug = "gestao", IconeUrl = "/icons/gestao.svg", Cor = "#C2410C", Ordem = 2 },
            new() { Nome = "Segurança do Trabalho", Slug = "seguranca-do-trabalho", IconeUrl = "/icons/seguranca.svg", Cor = "#047857", Ordem = 3 }
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
                40, "Candidatos a vagas de desenvolvedor de sistemas e estudantes de tecnologia", "/cursos/desenvolvedor-sistemas.svg", true, cat["tecnologia"], mod["presencial"], sta["disponivel"],
                new[] {
                    ("Lógica e Algoritmos", new[] { "Conceitos básicos de algoritmos", "Estruturas condicionais", "Laços de repetição" }),
                    ("Fundamentos Web", new[] { "HTML, CSS e semântica", "JavaScript básico", "Responsividade" }),
                    ("Banco de Dados e APIs", new[] { "Modelagem relacional", "SQL básico", "Consumo e criação de APIs REST" })
                }),

            NovoCurso("Desenvolvimento de Aplicações Web com C# e .NET", "Aplicações Web C# .NET", "desenvolvimento-de-aplicacoes-web-com-csharp-e-dotnet",
                "Formação prática em desenvolvimento web com ASP.NET Core, arquitetura em camadas, integração com banco de dados e publicação de aplicações.",
                60, "Desenvolvedores iniciantes e profissionais que desejam migrar para .NET", "/cursos/dotnet-web.svg", true, cat["tecnologia"], mod["ead"], sta["inscricoes-abertas"],
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
                16, "Colaboradores de empresas de todos os setores", "/cursos/incendios.svg", true, cat["seguranca-do-trabalho"], mod["presencial"], sta["disponivel"],
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
