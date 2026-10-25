/** Capas locais em WebP, servidas de /images/cursos/ com variantes responsivas. */

const SLUGS_COM_VARIANTE = new Set([
  "processo-seletivo-desenvolvedor-de-sistemas-i",
  "desenvolvimento-de-aplicacoes-web-com-csharp-e-dotnet",
  "gestao-de-projetos-e-metodologias-ageis",
  "lideranca-e-comunicacao-organizacional",
  "prevencao-e-combate-a-incendios",
  "seguranca-em-espacos-confinados",
  "matematica-para-a-precisao-medidas-e-escalas-na-metalurgia",
  "geometria-e-modelagem-no-design-textil",
  "estatistica-e-controle-de-qualidade-na-producao",
  "fisica-do-movimento-e-da-energia-na-metalurgia",
  "quimica-e-sustentabilidade",
  "ciencia-dos-materiais-na-metalurgia",
])

const IMAGENS_POR_CATEGORIA: Record<string, string> = {
  matematica: "/images/cursos/matematica-para-a-precisao-medidas-e-escalas-na-metalurgia.webp",
  "ciencias-da-natureza": "/images/cursos/ciencia-dos-materiais-na-metalurgia.webp",
  tecnologia: "/images/cursos/processo-seletivo-desenvolvedor-de-sistemas-i.webp",
  gestao: "/images/cursos/gestao-de-projetos-e-metodologias-ageis.webp",
  "seguranca-do-trabalho": "/images/cursos/prevencao-e-combate-a-incendios.webp",
}

export function imagemDoCurso(curso: {
  slug: string
  imagemUrl?: string
  categoria?: { slug?: string } | string
}) {
  const catSlug =
    typeof curso.categoria === "string"
      ? curso.categoria.toLowerCase().replace(/\s+/g, "-")
      : curso.categoria?.slug

  if (SLUGS_COM_VARIANTE.has(curso.slug)) {
    return `/images/cursos/${curso.slug}.webp`
  }
  return (
    (catSlug ? IMAGENS_POR_CATEGORIA[catSlug] : undefined) ??
    curso.imagemUrl ??
    ""
  )
}

/** srcset responsivo para os 12 cursos com variantes geradas. */
export function srcSetDoCurso(slug: string): string | undefined {
  if (!SLUGS_COM_VARIANTE.has(slug)) return undefined
  const base = `/images/cursos/${slug}`
  return `${base}-480.webp 480w, ${base}-800.webp 800w, ${base}-1200.webp 1200w`
}