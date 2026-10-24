using Microsoft.EntityFrameworkCore;
using Sesi.Catalogo.Domain.Entities;

namespace Sesi.Catalogo.Infrastructure.Data;

/// <summary>
/// Popula as traduções (en-US e es-ES) de categorias, modalidades e cursos.
/// Idempotente: insere o que falta e atualiza o que difere, sem apagar registros.
/// </summary>
public static class CatalogoTraducoesSeeder
{
    private const string Ingles = "en-US";
    private const string Espanhol = "es-ES";

    private static readonly IReadOnlyDictionary<string, (string En, string Es)> Categorias =
        new Dictionary<string, (string, string)>
        {
            ["matematica"] = ("Mathematics", "Matemáticas"),
            ["ciencias-da-natureza"] = ("Natural Sciences", "Ciencias de la Naturaleza"),
            ["tecnologia"] = ("Technology", "Tecnología"),
            ["gestao"] = ("Management", "Gestión"),
            ["seguranca-do-trabalho"] = ("Occupational Safety", "Seguridad y Salud en el Trabajo")
        };

    private static readonly IReadOnlyDictionary<string, (string En, string Es)> Modalidades =
        new Dictionary<string, (string, string)>
        {
            ["presencial"] = ("In-person", "Presencial"),
            ["ead"] = ("Distance Learning", "Educación a Distancia"),
            ["semi-presencial"] = ("Blended", "Semipresencial")
        };

    private sealed record Conteudo(string NomeCompleto, string NomeBreve, string Descricao, string PublicoAlvo);

    private static readonly IReadOnlyDictionary<string, (Conteudo En, Conteudo Es)> Cursos =
        new Dictionary<string, (Conteudo, Conteudo)>
        {
            ["processo-seletivo-desenvolvedor-de-sistemas-i"] = (
                new("Selection Process – Systems Developer I", "Systems Developer I",
                    "Course designed to prepare candidates for the selection process, focusing on systems development, programming logic, data modeling and hands-on web application practice.",
                    "Candidates for systems developer positions and technology students"),
                new("Proceso selectivo – Desarrollador de Sistemas I", "Desarrollador de Sistemas I",
                    "Curso orientado a la preparación para el proceso selectivo, con enfoque en desarrollo de sistemas, lógica de programación, modelado y prácticas para la creación de aplicaciones web.",
                    "Candidatos a vacantes de desarrollador de sistemas y estudiantes de tecnología")),

            ["desenvolvimento-de-aplicacoes-web-com-csharp-e-dotnet"] = (
                new("Web Application Development with C# and .NET", "C# .NET Web Applications",
                    "Hands-on training in web development with ASP.NET Core, layered architecture, database integration and application deployment.",
                    "Beginner developers and professionals moving to .NET"),
                new("Desarrollo de Aplicaciones Web con C# y .NET", "Aplicaciones Web C# .NET",
                    "Formación práctica en desarrollo web con ASP.NET Core, arquitectura por capas, integración con bases de datos y publicación de aplicaciones.",
                    "Desarrolladores principiantes y profesionales que desean migrar a .NET")),

            ["gestao-de-projetos-e-metodologias-ageis"] = (
                new("Project Management and Agile Methodologies", "Agile Project Management",
                    "Covers management fundamentals, Scrum, Kanban, planning, delivery tracking and teamwork.",
                    "Leaders, coordinators and professionals involved in projects"),
                new("Gestión de Proyectos y Metodologías Ágiles", "Gestión de Proyectos Ágiles",
                    "Aborda fundamentos de gestión, Scrum, Kanban, planificación, seguimiento de entregas y trabajo en equipo.",
                    "Líderes, coordinadores y profesionales involucrados en proyectos")),

            ["lideranca-e-comunicacao-organizacional"] = (
                new("Leadership and Organizational Communication", "Leadership and Communication",
                    "Develops leadership skills, assertive communication, constructive feedback and conflict management in organizations.",
                    "Managers, supervisors and professionals transitioning into leadership"),
                new("Liderazgo y Comunicación Organizacional", "Liderazgo y Comunicación",
                    "Desarrolla competencias de liderazgo, comunicación asertiva, retroalimentación constructiva y gestión de conflictos en el entorno organizacional.",
                    "Gestores, supervisores y profesionales en transición al liderazgo")),

            ["prevencao-e-combate-a-incendios"] = (
                new("Fire Prevention and Firefighting", "Fire Prevention and Firefighting",
                    "Theoretical and practical training on prevention, fire classes, extinguishers, escape routes and emergency procedures.",
                    "Employees from companies in all sectors"),
                new("Prevención y Combate de Incendios", "Prevención y Combate de Incendios",
                    "Capacitación teórico-práctica sobre prevención, clases de incendio, extintores, rutas de evacuación y procedimientos de emergencia.",
                    "Colaboradores de empresas de todos los sectores")),

            ["seguranca-em-espacos-confinados"] = (
                new("Safety in Confined Spaces", "Confined Spaces",
                    "Training on risks, entry authorization, atmospheric monitoring, protective equipment and rescue procedures.",
                    "Workers, attendants and supervisors who work in confined spaces"),
                new("Seguridad en Espacios Confinados", "Espacios Confinados",
                    "Formación sobre riesgos, autorización de entrada, monitoreo atmosférico, equipos de protección y procedimientos de rescate.",
                    "Trabajadores, vigías y supervisores que actúan en espacios confinados")),

            ["matematica-para-a-precisao-medidas-e-escalas-na-metalurgia"] = (
                new("Mathematics for Precision: Measurements and Scales in Metallurgy", "Measurements and Scales in Metallurgy",
                    "Application of quantities, proportions and scales in cutting, drilling and machining processes.",
                    "Metallurgy professionals, machine operators and technicians working with measurements and scales"),
                new("Matemática para la Precisión: Medidas y Escalas en la Metalurgia", "Medidas y Escalas en la Metalurgia",
                    "Aplicación de magnitudes, proporciones y escalas en procesos de corte, perforación y mecanizado.",
                    "Profesionales de la metalurgia, operadores de máquinas y técnicos que trabajan con mediciones y escalas")),

            ["geometria-e-modelagem-no-design-textil"] = (
                new("Geometry and Modeling in Textile Design", "Geometry in Textile Design",
                    "Explores geometric shapes, symmetry and mathematical patterns found in fabrics and prints.",
                    "Textile designers, pattern makers and printing professionals"),
                new("Geometría y Modelado en el Diseño Textil", "Geometría en el Diseño Textil",
                    "Explora formas geométricas, simetría y patrones matemáticos presentes en tejidos y estampados.",
                    "Diseñadores textiles, modelistas y profesionales de estampación")),

            ["estatistica-e-controle-de-qualidade-na-producao"] = (
                new("Statistics and Quality Control in Production", "Statistics and Quality",
                    "Reading and interpreting quality control and productivity data.",
                    "Quality analysts, production supervisors and continuous improvement professionals"),
                new("Estadística y Control de Calidad en la Producción", "Estadística y Calidad",
                    "Lectura e interpretación de datos de control de calidad y productividad.",
                    "Analistas de calidad, supervisores de producción y profesionales de mejora continua")),

            ["fisica-do-movimento-e-da-energia-na-metalurgia"] = (
                new("Physics of Motion and Energy in Metallurgy", "Physics in Metallurgy",
                    "Study of forces, friction, heat and energy in machines, furnaces and presses.",
                    "Operators, maintenance technicians and industrial process professionals"),
                new("Física del Movimiento y de la Energía en la Metalurgia", "Física en la Metalurgia",
                    "Estudio de fuerzas, fricción, calor y energía en máquinas, hornos y prensas.",
                    "Operadores, técnicos de mantenimiento y profesionales de procesos industriales")),

            ["quimica-e-sustentabilidade"] = (
                new("Chemistry and Sustainability", "Chemistry and Sustainability",
                    "Study of the chemical reactions involved in dyeing and fabric finishing.",
                    "Dyeing, textile finishing and environmental professionals"),
                new("Química y Sostenibilidad", "Química y Sostenibilidad",
                    "Estudio de las reacciones químicas involucradas en la tintorería y el acabado de tejidos.",
                    "Profesionales de tintorería, acabado textil y medio ambiente")),

            ["ciencia-dos-materiais-na-metalurgia"] = (
                new("Materials Science in Metallurgy", "Materials Science",
                    "Basic concepts of structure, strength and properties of metals.",
                    "Students and professionals working with metallic materials and manufacturing processes"),
                new("Ciencia de los Materiales en la Metalurgia", "Ciencia de los Materiales",
                    "Conceptos básicos de estructura, resistencia y propiedades de los metales.",
                    "Estudiantes y profesionales que trabajan con materiales metálicos y procesos de fabricación"))
        };

    public static async Task SemearAsync(CatalogoDbContext db, CancellationToken ct = default)
    {
        var alterou = false;

        var categorias = await db.Categorias.ToListAsync(ct);
        var categoriasTraduzidas = await db.CategoriasTraducoes
            .ToDictionaryAsync(x => (x.CategoriaId, x.Idioma), ct);

        foreach (var categoria in categorias)
        {
            if (!Categorias.TryGetValue(categoria.Slug, out var textos)) continue;

            alterou |= Gravar(categoriasTraduzidas, categoria.Id, Ingles, textos.En, db.CategoriasTraducoes);
            alterou |= Gravar(categoriasTraduzidas, categoria.Id, Espanhol, textos.Es, db.CategoriasTraducoes);
        }

        var modalidades = await db.Modalidades.ToListAsync(ct);
        var modalidadesTraduzidas = await db.ModalidadesTraducoes
            .ToDictionaryAsync(x => (x.ModalidadeId, x.Idioma), ct);

        foreach (var modalidade in modalidades)
        {
            if (!Modalidades.TryGetValue(modalidade.Slug, out var textos)) continue;

            alterou |= Gravar(modalidadesTraduzidas, modalidade.Id, Ingles, textos.En, db.ModalidadesTraducoes);
            alterou |= Gravar(modalidadesTraduzidas, modalidade.Id, Espanhol, textos.Es, db.ModalidadesTraducoes);
        }

        var cursosPorSlug = new Dictionary<string, Curso>(StringComparer.OrdinalIgnoreCase);
        foreach (var curso in await db.Cursos.ToListAsync(ct))
            cursosPorSlug.TryAdd(curso.Slug, curso);

        var cursosTraduzidos = await db.CursosTraducoes
            .ToDictionaryAsync(x => (x.CursoId, x.Idioma), ct);

        foreach (var (slug, textos) in Cursos)
        {
            if (!cursosPorSlug.TryGetValue(slug, out var curso)) continue;

            alterou |= GravarCurso(cursosTraduzidos, curso.Id, Ingles, textos.En, db.CursosTraducoes);
            alterou |= GravarCurso(cursosTraduzidos, curso.Id, Espanhol, textos.Es, db.CursosTraducoes);
        }

        if (alterou) await db.SaveChangesAsync(ct);
    }

    private static bool Gravar(
        Dictionary<(int Id, string Idioma), CategoriaTraducao> existentes,
        int categoriaId, string idioma, string nome,
        DbSet<CategoriaTraducao> conjunto)
    {
        if (existentes.TryGetValue((categoriaId, idioma), out var traducao))
        {
            if (traducao.Nome == nome) return false;
            traducao.Nome = nome;
            return true;
        }

        traducao = new CategoriaTraducao { CategoriaId = categoriaId, Idioma = idioma, Nome = nome };
        conjunto.Add(traducao);
        existentes[(categoriaId, idioma)] = traducao;
        return true;
    }

    private static bool Gravar(
        Dictionary<(int Id, string Idioma), ModalidadeTraducao> existentes,
        int modalidadeId, string idioma, string nome,
        DbSet<ModalidadeTraducao> conjunto)
    {
        if (existentes.TryGetValue((modalidadeId, idioma), out var traducao))
        {
            if (traducao.Nome == nome) return false;
            traducao.Nome = nome;
            return true;
        }

        traducao = new ModalidadeTraducao { ModalidadeId = modalidadeId, Idioma = idioma, Nome = nome };
        conjunto.Add(traducao);
        existentes[(modalidadeId, idioma)] = traducao;
        return true;
    }

    private static bool GravarCurso(
        Dictionary<(int Id, string Idioma), CursoTraducao> existentes,
        int cursoId, string idioma, Conteudo conteudo,
        DbSet<CursoTraducao> conjunto)
    {
        if (existentes.TryGetValue((cursoId, idioma), out var traducao))
        {
            if (traducao.NomeCompleto == conteudo.NomeCompleto &&
                traducao.NomeBreve == conteudo.NomeBreve &&
                traducao.Descricao == conteudo.Descricao &&
                traducao.PublicoAlvo == conteudo.PublicoAlvo)
                return false;

            traducao.NomeCompleto = conteudo.NomeCompleto;
            traducao.NomeBreve = conteudo.NomeBreve;
            traducao.Descricao = conteudo.Descricao;
            traducao.PublicoAlvo = conteudo.PublicoAlvo;
            return true;
        }

        traducao = new CursoTraducao
        {
            CursoId = cursoId,
            Idioma = idioma,
            NomeCompleto = conteudo.NomeCompleto,
            NomeBreve = conteudo.NomeBreve,
            Descricao = conteudo.Descricao,
            PublicoAlvo = conteudo.PublicoAlvo
        };
        conjunto.Add(traducao);
        existentes[(cursoId, idioma)] = traducao;
        return true;
    }
}
