namespace Sesi.Catalogo.Domain.Dtos;

/// <summary>
/// DTO resumido de categoria (usado nas facetas e no curso).
/// </summary>
public record CategoriaDto(int Id, string Nome, string Slug, string IconeUrl, string Cor, int Ordem);
