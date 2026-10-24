import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

/**
 * Barra flutuante de matrícula. Fica escondida até o CTA principal sair da tela;
 * então sobe a 5 px do rodapé, na largura do container e com o nome do curso fixo.
 */
export function FaixaMatricula({
  nomeCurso,
  onMatricular,
  matriculaEmBreve = false,
}: {
  nomeCurso: string
  onMatricular: () => void
  matriculaEmBreve?: boolean
}) {
  const [visivel, setVisivel] = useState(false)
  const { t } = useTranslation("course")

  useEffect(() => {
    const ctaPrincipal = document.querySelector<HTMLElement>("[data-cta-principal]")
    if (!ctaPrincipal) return

    let ctaVisivel = true
    let rolou = window.scrollY > 80

    const atualizar = () => setVisivel(!ctaVisivel && rolou)
    const observer = new IntersectionObserver(
      ([entrada]) => {
        ctaVisivel = entrada.isIntersecting
        atualizar()
      },
      { threshold: 0 },
    )
    const aoRolar = () => {
      rolou = window.scrollY > 80
      atualizar()
    }

    observer.observe(ctaPrincipal)
    aoRolar()
    window.addEventListener("scroll", aoRolar, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", aoRolar)
    }
  }, [])

  return (
    <div
      aria-hidden={!visivel}
      className={`fixed inset-x-0 bottom-[5px] z-40 px-4 transition-transform duration-300 ease-out motion-reduce:transition-none sm:px-6 lg:px-8 ${
        visivel ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <section
        aria-label={t("enrollModal.title")}
        aria-hidden={!visivel}
        className="mx-auto flex w-full max-w-[1280px] items-center gap-4 rounded-lg bg-[var(--sesi-black)] px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)] sm:px-6 sm:py-4 lg:px-8"
      >
        <div className="min-w-0 flex-1">
          <span className="sr-only">{nomeCurso}</span>
          <p
            aria-hidden="true"
            className="truncate font-['Open_Sans_Condensed',sans-serif] text-lg font-bold tracking-wide text-white sm:text-xl"
          >
            {nomeCurso}
          </p>
        </div>
        <div className="shrink-0">
          <Button
            type="button"
            onClick={onMatricular}
            disabled={matriculaEmBreve}
            withArrow={!matriculaEmBreve}
            tabIndex={visivel ? undefined : -1}
            className="rounded-lg bg-white text-[var(--sesi-black)] hover:bg-white/85"
          >
            {matriculaEmBreve ? t("enrollSoon") : t("enroll")}
          </Button>
        </div>
      </section>
    </div>
  )
}
