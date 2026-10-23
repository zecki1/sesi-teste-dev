import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { definirAlturaBannerCookie } from "@/lib/ui/cookie-banner-store"
import { lerConsentimento, salvarConsentimento, type ConsentimentoCookies } from "@/lib/ui/cookie-consent"

export function CookieBanner() {
  const { t } = useTranslation("common")
  const [visible, setVisible] = useState(() => lerConsentimento() === null)
  const ref = useRef<HTMLDivElement>(null)

  const decidir = (status: ConsentimentoCookies) => {
    salvarConsentimento(status)
    setVisible(false)
  }

  useEffect(() => {
    definirAlturaBannerCookie(visible && ref.current ? ref.current.offsetHeight : 0)
    return () => definirAlturaBannerCookie(0)
  }, [visible])

  if (!visible) return null

  return (
    <div ref={ref} className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:gap-8 lg:px-8">
        <p className="flex-1 text-sm leading-relaxed text-[var(--sesi-black)]">{t("common:cookieText")}</p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => decidir("recusado")}
            className="rounded-[var(--radius-pill)] border border-[var(--sesi-black)] px-5 py-2 text-sm font-semibold hover:bg-black/5"
          >
            {t("common:rejectCookies")}
          </button>
          <button
            type="button"
            onClick={() => decidir("aceito")}
            className="rounded-[var(--radius-pill)] bg-[var(--sesi-black)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {t("common:acceptAllCookies")}
          </button>
        </div>
      </div>
    </div>
  )
}
