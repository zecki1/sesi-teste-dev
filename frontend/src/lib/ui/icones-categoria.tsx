import type { CSSProperties } from "react"
import type { IconType } from "react-icons"
import { FaChartLine, FaHardHat, FaLaptopCode } from "react-icons/fa"
import iconeMatematica from "@/assets/icons/matematica.svg"
import iconeCiencias from "@/assets/icons/ciencias-natureza.svg"

/** Ícones locais usados no detalhe e nos cards. */
const ICONES_LOCAIS: Record<string, string> = {
  matematica: iconeMatematica,
  "ciencias-da-natureza": iconeCiencias,
}

/** Categorias que ainda não tinham ícone local usam um ícone do react-icons. */
const ICONES_REACT: Record<string, IconType> = {
  tecnologia: FaLaptopCode,
  gestao: FaChartLine,
  "seguranca-do-trabalho": FaHardHat,
}

export function IconeCategoria({
  slug,
  className = "h-4 w-4 shrink-0",
}: {
  slug: string
  className?: string
}) {
  const local = ICONES_LOCAIS[slug]
  if (local) {
    return <img data-categoria={slug} src={local} alt="" aria-hidden="true" className={className} />
  }

  const Icone = ICONES_REACT[slug]
  if (!Icone) return null

  return (
    <span data-categoria={slug} aria-hidden="true" className="inline-flex shrink-0">
      <Icone className={className} />
    </span>
  )
}

/** Escolhe preto ou branco para o texto do badge conforme a luminância do fundo. */
export function corTextoParaFundo(cor?: string) {
  if (!cor) return "var(--sesi-black)"

  const hex = cor.replace("#", "").trim()
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return "var(--sesi-black)"

  const canais = [0, 2, 4].map((indice) => parseInt(hex.slice(indice, indice + 2), 16) / 255)
  const lineares = canais.map((canal) =>
    canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4,
  )
  const luminancia = 0.2126 * lineares[0] + 0.7152 * lineares[1] + 0.0722 * lineares[2]

  // 0,179 é o ponto em que preto e branco têm o mesmo contraste sobre a cor.
  return luminancia > 0.179 ? "#0C0C0D" : "#FFFFFF"
}

export function estiloBadgeCategoria(cor?: string): CSSProperties {
  if (!cor) return { backgroundColor: "var(--sesi-beige)", color: "var(--sesi-black)" }
  return { backgroundColor: cor, color: corTextoParaFundo(cor) }
}
