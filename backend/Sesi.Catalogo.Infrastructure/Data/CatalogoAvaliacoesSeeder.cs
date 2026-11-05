using Microsoft.EntityFrameworkCore;
using Sesi.Catalogo.Domain.Entities;

namespace Sesi.Catalogo.Infrastructure.Data;

/// <summary>
/// Semeia avaliações de demonstração para que a home não fique vazia em ambiente
/// de apresentação. Idempotente: cada avaliação é identificada por e-mail + curso,
/// então rodar de novo não duplica e não sobrescreve avaliação real do aluno.
/// </summary>
public static class CatalogoAvaliacoesSeeder
{
    private sealed record Resumo(string Curso, int Nota, string Depoimento, string Sugestao);

    private static readonly Resumo[] Avaliacoes =
    [
        new("gestao-de-projetos-e-metodologias-ageis", 5,
            "As aulas são curtas e diretas, deu para acompanhar mesmo trabalhando o dia inteiro. O material de apoio ajudou a montar o planejamento da minha equipe.",
            "Seria bom ter um modelo de canvas para baixar."),
        new("lideranca-e-comunicacao-organizacional", 4,
            "Conteúdo muito bom, principalmente a parte de feedback. Senti falta de mais exemplos de conversas difíceis no dia a dia.",
            "Gravar as aulas ao vivo ajuda quem perde o horário."),
        new("prevencao-e-combate-a-incendios", 5,
            "Curso objetivo e prático. Os exercícios de fixação ajudaram muito a lembrar as classes de fogo na hora da prova.",
            ""),
        new("seguranca-em-espacos-confinados", 4,
            "Explicação clara dos procedimentos e dos riscos. O certificado saiu rápido depois da conclusão.",
            "Poderia ter mais fotos reais dos equipamentos."),
        new("estatistica-e-controle-de-qualidade-na-producao", 5,
            "Aprendi a montar gráfico de controle do zero. A parte de interpretação dos resultados foi a mais útil para mim.",
            ""),
        new("quimica-e-sustentabilidade", 3,
            "O conteúdo é bom, mas achei a carga de leitura alta para o tempo do curso. As questões ajudaram a revisar.",
            "Dividir a aula de reações em duas partes."),
        new("ciencia-dos-materiais-na-metalurgia", 5,
            "Consegui aplicar no trabalho o que vi sobre tratamentos térmicos. A linguagem é simples, sem enrolação.",
            ""),
    ];

    public static async Task SemearAsync(CatalogoDbContext db, CancellationToken ct = default)
    {
        var slugs = Avaliacoes.Select(a => a.Curso).ToArray();
        var cursos = await db.Cursos
            .Where(c => slugs.Contains(c.Slug))
            .ToDictionaryAsync(c => c.Slug, c => c.Id, ct);

        if (cursos.Count == 0)
            return;

        var existentes = await db.Avaliacoes
            .Select(a => new { a.UsuarioId, a.CursoId })
            .ToListAsync(ct);

        var ocupados = existentes.Select(e => (e.UsuarioId, e.CursoId)).ToHashSet();
        var agora = DateTime.UtcNow;
        var inseridas = 0;

        for (var i = 0; i < Avaliacoes.Length; i++)
        {
            var item = Avaliacoes[i];
            if (!cursos.TryGetValue(item.Curso, out var cursoId))
                continue;

            var email = $"demo.avaliacao{i + 1}@exemplo.com";
            if (!ocupados.Add((email, cursoId)))
                continue;

            var nota = Math.Clamp(item.Nota, 1, 5);

            db.Avaliacoes.Add(new AvaliacaoCurso
            {
                CursoId = cursoId,
                UsuarioId = email,
                Nome = NomeAleatorio(i),
                Nota = nota,
                Depoimento = item.Depoimento,
                NotaPlataforma = Clamp(nota + 1),
                NotaCurso = nota,
                NotaAvaliacao = Clamp(nota + 1),
                NotaAcessibilidade = Clamp(nota),
                Sugestao = item.Sugestao,
                Idioma = "pt-BR",
                Publicada = true,
                CriadoEm = agora.AddDays(-(i + 2)),
                AtualizadoEm = agora.AddDays(-(i + 2)),
            });

            inseridas++;
        }

        if (inseridas > 0)
            await db.SaveChangesAsync(ct);
    }

    private static int Clamp(int nota) => Math.Clamp(nota, 1, 5);

    private static string NomeAleatorio(int indice) => (indice % 7) switch
    {
        0 => "Mariana Costa",
        1 => "Lucas Pereira",
        2 => "Thiago Almeida",
        3 => "Patrícia Nogueira",
        4 => "Bruno Carvalho",
        5 => "Fernanda Lima",
        _ => "Rafael Moreira",
    };
}
