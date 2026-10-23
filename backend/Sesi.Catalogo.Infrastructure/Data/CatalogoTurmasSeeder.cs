using Microsoft.EntityFrameworkCore;
using Sesi.Catalogo.Domain.Entities;
using Sesi.Catalogo.Infrastructure.Data;

namespace Sesi.Catalogo.Infrastructure.Data;

/// <summary>
/// Garante a modalidade Semi-presencial e cria duas turmas por curso quando ainda não existem.
/// </summary>
public static class CatalogoTurmasSeeder
{
    public static async Task SemearAsync(CatalogoDbContext db, CancellationToken ct = default)
    {
        var semi = await db.Modalidades.FirstOrDefaultAsync(m => m.Slug == "semi-presencial", ct);
        if (semi is null)
        {
            semi = new Modalidade { Nome = "Semi-presencial", Slug = "semi-presencial" };
            db.Modalidades.Add(semi);
            await db.SaveChangesAsync(ct);
        }

        if (await db.Turmas.AnyAsync(ct))
            return;

        var cursos = await db.Cursos
            .Include(c => c.Modalidade)
            .OrderBy(c => c.Id)
            .ToListAsync(ct);

        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        var indice = 0;

        foreach (var curso in cursos)
        {
            var modalidade = curso.Modalidade ?? semi;
            var inicio = hoje.AddDays(14 + indice * 2);
            var inicioSemi = hoje.AddDays(28 + indice * 2);

            db.Turmas.AddRange(
                new Turma
                {
                    CursoId = curso.Id,
                    ModalidadeId = modalidade.Id,
                    Codigo = $"{curso.Slug}-T1",
                    DataInicio = inicio,
                    DataFim = inicio.AddDays(56),
                    DiasSemana = indice % 2 == 0 ? "Ter,Qui" : "Seg,Qua",
                    HorarioInicio = new TimeOnly(19, 0),
                    HorarioFim = new TimeOnly(21, 0),
                    Vagas = 30,
                    Ativa = true
                },
                new Turma
                {
                    CursoId = curso.Id,
                    ModalidadeId = semi.Id,
                    Codigo = $"{curso.Slug}-T2",
                    DataInicio = inicioSemi,
                    DataFim = inicioSemi.AddDays(56),
                    DiasSemana = "Sáb",
                    HorarioInicio = new TimeOnly(8, 0),
                    HorarioFim = new TimeOnly(12, 0),
                    Vagas = 24,
                    Ativa = true
                });

            indice++;
        }

        await db.SaveChangesAsync(ct);
    }
}
