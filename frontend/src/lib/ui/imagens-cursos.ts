import desenvolvedorSistemas from "@/assets/images/compagnons-iWpEedbymlA-unsplash.webp"
import dotnetWeb from "@/assets/images/florian-olivo-4hbJ-eymZ1o-unsplash.webp"
import gestaoProjetos from "@/assets/images/jo-szczepanska-5aiRb5f464A-unsplash.webp"
import lideranca from "@/assets/images/memento-media-2pPw5Glro5I-unsplash.webp"
import incendios from "@/assets/images/matt-c-j6oWhh7l4Ig-unsplash.webp"
import espacosConfinados from "@/assets/images/mos-design-2jltCHzJqEo-unsplash.webp"
import matematicaPrecisao from "@/assets/images/aswin-anand-0Hmh461Goog-unsplash.webp"
import geometria from "@/assets/images/vitaly-gariev-NpHSRakEYPM-unsplash.webp"
import estatistica from "@/assets/images/isaac-smith-AT77Q0Njnt0-unsplash.webp"
import fisica from "@/assets/images/michal-lis-lFBtxZ44ecA-unsplash.webp"
import quimica from "@/assets/images/vedrana-filipovic-jxqTaXF5WmY-unsplash.webp"
import cienciaMateriais from "@/assets/images/enlightening-images-4VD8jGT2Haw-unsplash.webp"

/** Capas locais em WebP (1200×1500), escolhidas para cada curso do seed. */
const IMAGENS_POR_SLUG: Record<string, string> = {
  "processo-seletivo-desenvolvedor-de-sistemas-i": desenvolvedorSistemas,
  "desenvolvimento-de-aplicacoes-web-com-csharp-e-dotnet": dotnetWeb,
  "gestao-de-projetos-e-metodologias-ageis": gestaoProjetos,
  "lideranca-e-comunicacao-organizacional": lideranca,
  "prevencao-e-combate-a-incendios": incendios,
  "seguranca-em-espacos-confinados": espacosConfinados,
  "matematica-para-a-precisao-medidas-e-escalas-na-metalurgia": matematicaPrecisao,
  "geometria-e-modelagem-no-design-textil": geometria,
  "estatistica-e-controle-de-qualidade-na-producao": estatistica,
  "fisica-do-movimento-e-da-energia-na-metalurgia": fisica,
  "quimica-e-sustentabilidade": quimica,
  "ciencia-dos-materiais-na-metalurgia": cienciaMateriais,
}

/** Reserva visual para cursos criados pelo admin ou novos seeds. */
const IMAGENS_POR_CATEGORIA: Record<string, string> = {
  matematica: matematicaPrecisao,
  "ciencias-da-natureza": cienciaMateriais,
  tecnologia: desenvolvedorSistemas,
  gestao: gestaoProjetos,
  "seguranca-do-trabalho": incendios,
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
  return (
    IMAGENS_POR_SLUG[curso.slug] ??
    (catSlug ? IMAGENS_POR_CATEGORIA[catSlug] : undefined) ??
    curso.imagemUrl ??
    ""
  )
}

