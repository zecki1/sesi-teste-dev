import { useState } from "react"
import { useTranslation } from "react-i18next"

export function CookieBanner() {
  const { t } = useTranslation("common")
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white/95 backdrop-blur shadow-[0_-1px_3px_rgb(0_0_0_/.08)]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between sm:px-6 lg:px-8">
        <p className="text-sm text-[var(--sesi-black)]">
          {t("cookieText")}{" "}
          <a href="#" className="underline">{t("cookieSettings")}</a>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setVisible(false)} className="rounded-[var(--radius-pill)] border border-[var(--sesi-black)] px-5 py-2 text-sm font-semibold hover:bg-black/5">
            {t("rejectCookies")}
          </button>
          <button onClick={() => setVisible(false)} className="rounded-[var(--radius-pill)] bg-[var(--sesi-black)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90">
            {t("acceptAllCookies")}
          </button>
        </div>
      </div>
    </div>
  )
}
