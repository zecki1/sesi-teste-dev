import { useEffect, useRef } from "react"
import i18n from "@/i18n"
import { aplicarIdioma } from "@/lib/i18n/idioma"
import { aplicarNaRaiz, salvarConfig } from "@/lib/a11y/config"
import type { ConfigAcessibilidade } from "@/lib/auth/perfil"

type Mensagem =
  | { tipo: "a11y"; config: ConfigAcessibilidade }
  | { tipo: "idioma"; valor: string }

const CANAL = "sesi-sync"
const CHAVE_A11Y = "sesi.a11y.v1"
const CHAVE_IDIOMA = "sesi.idioma"

/**
 * Mantém idioma e acessibilidade iguais entre abas do AVA.
 *
 * O curso SCORM abre em outra guia e precisa refletir (e controlar) as mesmas
 * preferências da página principal. `BroadcastChannel` cobre o caso normal;
 * o evento `storage` é a rede de segurança para navegadores antigos.
 */
export function CrossTabSync() {
  const aplicandoRemoto = useRef(false)

  useEffect(() => {
    const canal = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CANAL) : null

    const enviar = (mensagem: Mensagem) => {
      if (aplicandoRemoto.current) return
      try {
        canal?.postMessage(mensagem)
      } catch {
        /* canal fechado */
      }
    }

    const aoAtualizarA11y = (evento: Event) => {
      const config = (evento as CustomEvent<ConfigAcessibilidade>).detail
      if (config) enviar({ tipo: "a11y", config })
    }

    const aoTrocarIdioma = (idioma: string) => {
      enviar({ tipo: "idioma", valor: idioma })
    }

    const aplicarRemoto = (mensagem: Mensagem) => {
      aplicandoRemoto.current = true
      try {
        if (mensagem.tipo === "a11y" && mensagem.config) {
          salvarConfig(mensagem.config)
          aplicarNaRaiz(mensagem.config)
        }
        if (mensagem.tipo === "idioma" && mensagem.valor && mensagem.valor !== i18n.language) {
          aplicarIdioma(mensagem.valor as Parameters<typeof aplicarIdioma>[0])
        }
      } finally {
        // O evento disparado por salvarConfig é síncrono; libera logo em seguida.
        window.setTimeout(() => {
          aplicandoRemoto.current = false
        }, 0)
      }
    }

    const aoReceberCanal = (evento: MessageEvent<Mensagem>) => {
      if (!evento.data) return
      aplicarRemoto(evento.data)
    }

    const aoReceberStorage = (evento: StorageEvent) => {
      if (evento.key === CHAVE_IDIOMA && evento.newValue) {
        aplicarRemoto({ tipo: "idioma", valor: evento.newValue })
        return
      }
      if (evento.key === CHAVE_A11Y && evento.newValue) {
        try {
          aplicarRemoto({ tipo: "a11y", config: JSON.parse(evento.newValue) as ConfigAcessibilidade })
        } catch {
          /* preferência inválida */
        }
      }
    }

    window.addEventListener("sesi:acessibilidade-atualizada", aoAtualizarA11y)
    window.addEventListener("storage", aoReceberStorage)
    i18n.on("languageChanged", aoTrocarIdioma)
    canal?.addEventListener("message", aoReceberCanal as EventListener)

    return () => {
      window.removeEventListener("sesi:acessibilidade-atualizada", aoAtualizarA11y)
      window.removeEventListener("storage", aoReceberStorage)
      i18n.off("languageChanged", aoTrocarIdioma)
      canal?.removeEventListener("message", aoReceberCanal as EventListener)
      canal?.close()
    }
  }, [])

  return null
}
