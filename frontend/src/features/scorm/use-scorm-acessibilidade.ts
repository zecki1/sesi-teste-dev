import { useEffect } from "react"
import fonteDislexia from "@fontsource/opendyslexic/files/opendyslexic-latin-400-normal.woff2?inline"
import { lerConfig } from "@/lib/a11y/config"

export function useScormAcessibilidade(ativo: boolean, chaveInstancia?: string | number) {
  useEffect(() => {
    if (!ativo) return

    const player = document.querySelector<HTMLIFrameElement>("[data-player-scorm]")
    if (!player) return

    const sincronizar = () => {
      player.contentWindow?.postMessage(
        { type: "SESI_A11Y_CONFIG", config: { ...lerConfig(), fontDataUrl: fonteDislexia } },
        "*",
      )
    }
    const aoAtualizar = () => sincronizar()

    player.addEventListener("load", sincronizar)
    window.addEventListener("sesi:acessibilidade-atualizada", aoAtualizar)
    window.addEventListener("storage", aoAtualizar)
    sincronizar()

    return () => {
      player.removeEventListener("load", sincronizar)
      window.removeEventListener("sesi:acessibilidade-atualizada", aoAtualizar)
      window.removeEventListener("storage", aoAtualizar)
    }
  }, [ativo, chaveInstancia])
}
