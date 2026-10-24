namespace Sesi.Catalogo.Domain.Dtos;

/// <summary>
/// DTO resumido de categoria (usado nas facetas e no curso).
/// </summary>
public record CategoriaDto(int Id, string Nome, string Slug, string IconeUrl, string Cor, int Ordem);

/// <summary>Categoria na visão da gestão, com traduções e quantidade de cursos ativos.</summary>
public record CategoriaAdminDto(
    int Id,
    string Nome,
    string Slug,
    string IconeUrl,
    string Cor,
    int Ordem,
    int Cursos,
    string NomeEn,
    string NomeEs);

/// <summary>Criação e edição de categoria pelo painel administrativo. O slug é gerado a partir do nome quando omitido.</summary>
public record CategoriaSalvarRequest(
    string Nome,
    string? Slug = null,
    string? Cor = null,
    string? IconeUrl = null,
    int? Ordem = null,
    string? NomeEn = null,
    string? NomeEs = null);

/// <summary>Categoria parecida com o nome digitado, usada para evitar duplicidades.</summary>
public record CategoriaSimilarDto(int Id, string Nome, string Slug, string Cor, int Similaridade);
