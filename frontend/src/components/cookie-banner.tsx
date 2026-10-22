import { useState } from "react"

export function CookieBanner() {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white/95 backdrop-blur shadow-[0_-1px_3px_rgb(0_0_0_/.08)]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between sm:px-6 lg:px-8">
        <p className="text-sm text-[var(--sesi-black)]">
          Este site usa cookies, tags de pixel e armazenamento local para fins de desempenho, personalização e marketing. Usamos nossos próprios cookies e alguns de terceiros. Somente cookies essenciais são ativados por padrão.
          <a href="#" className="underline">Configurações</a>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setVisible(false)} className="rounded-[var(--radius-pill)] border border-[var(--sesi-black)] px-5 py-2 text-sm font-semibold hover:bg-black/5">
            Recusar
          </button>
          <button onClick={() => setVisible(false)} className="rounded-[var(--radius-pill)] bg-[var(--sesi-black)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90">
            Aceitar
          </button>
        </div>
      </div>
    </div>
  )
}
