using Microsoft.EntityFrameworkCore;
using Sesi.Catalogo.Domain.Entities;

namespace Sesi.Catalogo.Infrastructure.Data;

/// <summary>
/// Contexto EF Core do catálogo.
/// </summary>
public class CatalogoDbContext(DbContextOptions<CatalogoDbContext> options) : DbContext(options)
{
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Modalidade> Modalidades => Set<Modalidade>();
    public DbSet<StatusCurso> StatusCursos => Set<StatusCurso>();
    public DbSet<Curso> Cursos => Set<Curso>();
    public DbSet<Modulo> Modulos => Set<Modulo>();
    public DbSet<Aula> Aulas => Set<Aula>();
    public DbSet<AulaScorm> AulasScorm => Set<AulaScorm>();
    public DbSet<SessaoScorm> SessoesScorm => Set<SessaoScorm>();
    public DbSet<TentativaScorm> TentativasScorm => Set<TentativaScorm>();
    public DbSet<Turma> Turmas => Set<Turma>();
    public DbSet<Matricula> Matriculas => Set<Matricula>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Categoria>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nome).HasMaxLength(120).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(140).IsRequired();
            e.Property(x => x.IconeUrl).HasMaxLength(400);
            e.Property(x => x.Cor).HasMaxLength(20);
            e.HasIndex(x => x.Slug).IsUnique();
        });

        modelBuilder.Entity<Modalidade>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nome).HasMaxLength(80).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Slug).IsUnique();
        });

        modelBuilder.Entity<StatusCurso>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nome).HasMaxLength(80).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Slug).IsUnique();
        });

        modelBuilder.Entity<Curso>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.NomeCompleto).HasMaxLength(200).IsRequired();
            e.Property(x => x.NomeBreve).HasMaxLength(160).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(220).IsRequired();
            e.Property(x => x.Descricao).HasMaxLength(2000);
            e.Property(x => x.PublicoAlvo).HasMaxLength(400);
            e.Property(x => x.ImagemUrl).HasMaxLength(400);
            e.Property(x => x.EtapaDesenvolvimento).HasMaxLength(20).IsRequired();
            e.HasIndex(x => x.Slug).IsUnique();

            e.HasOne(x => x.Categoria)
                .WithMany(c => c.Cursos)
                .HasForeignKey(x => x.CategoriaId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(x => x.Modalidade)
                .WithMany(m => m.Cursos)
                .HasForeignKey(x => x.ModalidadeId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(x => x.Status)
                .WithMany(s => s.Cursos)
                .HasForeignKey(x => x.StatusId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Modulo>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Titulo).HasMaxLength(200).IsRequired();
            e.Property(x => x.Descricao).HasMaxLength(1000);
            e.HasOne(x => x.Curso)
                .WithMany(c => c.Modulos)
                .HasForeignKey(x => x.CursoId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.CursoId, x.Ordem });
        });

        modelBuilder.Entity<Aula>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Titulo).HasMaxLength(200).IsRequired();
            e.Property(x => x.Descricao).HasMaxLength(1000);
            e.Property(x => x.VideoUrl).HasMaxLength(400);
            e.HasOne(x => x.Modulo)
                .WithMany(m => m.Aulas)
                .HasForeignKey(x => x.ModuloId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.ModuloId, x.Ordem });
        });

        modelBuilder.Entity<AulaScorm>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Versao).HasMaxLength(10).IsRequired();
            e.Property(x => x.LaunchUrl).HasMaxLength(600).IsRequired();
            e.Property(x => x.ItemId).HasMaxLength(200);
            e.HasOne(x => x.Aula)
                .WithMany()
                .HasForeignKey(x => x.AulaId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SessaoScorm>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.SessaoId).HasMaxLength(120).IsRequired();
            e.Property(x => x.UsuarioId).HasMaxLength(120);
            e.Property(x => x.Percentual).HasPrecision(5, 2);
            e.Property(x => x.Score).HasPrecision(7, 2);
            e.HasIndex(x => x.SessaoId).IsUnique();
            e.HasOne(x => x.AulaScorm)
                .WithMany()
                .HasForeignKey(x => x.AulaScormId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TentativaScorm>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.ScoreRaw).HasPrecision(7, 2);
            e.Property(x => x.ProgressMeasure).HasPrecision(5, 2);
            e.HasOne(x => x.SessaoScorm)
                .WithMany(s => s.Tentativas)
                .HasForeignKey(x => x.SessaoScormId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Turma>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Codigo).HasMaxLength(120).IsRequired();
            e.Property(x => x.DiasSemana).HasMaxLength(80).IsRequired();
            e.HasIndex(x => new { x.CursoId, x.Codigo }).IsUnique();

            e.HasOne(x => x.Curso)
                .WithMany(c => c.Turmas)
                .HasForeignKey(x => x.CursoId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.Modalidade)
                .WithMany(m => m.Turmas)
                .HasForeignKey(x => x.ModalidadeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Matricula>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.UsuarioId).HasMaxLength(200).IsRequired();
            e.Property(x => x.Status).HasMaxLength(40).IsRequired();
            e.HasIndex(x => new { x.UsuarioId, x.TurmaId }).IsUnique();

            e.HasOne(x => x.Curso)
                .WithMany(c => c.Matriculas)
                .HasForeignKey(x => x.CursoId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.Turma)
                .WithMany(t => t.Matriculas)
                .HasForeignKey(x => x.TurmaId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
