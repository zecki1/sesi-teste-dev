import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import i18n from "@/i18n"

export function LanguageSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries()
    }
    i18n.on("languageChanged", handler)
    return () => {
      i18n.off("languageChanged", handler)
    }
  }, [queryClient])

  return null
}
