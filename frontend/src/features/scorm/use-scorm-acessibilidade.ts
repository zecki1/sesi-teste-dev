import { useEffect } from "react"
import fonteDislexia from "@fontsource/opendyslexic/files/opendyslexic-latin-400-normal.woff2?inline"
import { lerConfig } from "@/lib/a11y/config"

export function useScormAcessibilidade(ativo: boolean, chaveInstancia?: string | number, desabilitarVlibrasScorm: boolean = false) {
  useEffect(() => {
    if (!ativo) return

    const player = document.querySelector<HTMLIFrameElement>("[data-player-scorm]")
    if (!player) return

    const sincronizar = () => {
      const config = { ...lerConfig(), fontDataUrl: fonteDislexia }
      if (desabilitarVlibrasScorm) config.vlibras = false
      player.contentWindow?.postMessage(
        { type: "SESI_A11Y_CONFIG", config },
        "*",
      )
    }
    const enviarIdioma = () => {
      const idioma = window.localStorage.getItem("sesi.idioma") || "pt-BR"
      player.contentWindow?.postMessage(
        { type: "SESI_LANG_CHANGED", lang: idioma },
        "*",
      )
    }
    const aoAtualizar = () => {
      sincronizar()
      enviarIdioma()
    }

    player.addEventListener("load", aoAtualizar)
    window.addEventListener("sesi:acessibilidade-atualizada", aoAtualizar)
    window.addEventListener("storage", (evento) => {
      if (evento.key === "sesi.idioma" || evento.key === "sesi.a11y.v1") aoAtualizar()
    })
    sincronizar()
    enviarIdioma()

    return () => {
      player.removeEventListener("load", aoAtualizar)
      window.removeEventListener("sesi:acessibilidade-atualizada", aoAtualizar)
    }
  }, [ativo, chaveInstancia, desabilitarVlibrasScorm])
}
