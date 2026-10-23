import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Accordion no estilo shadcn/ui usando <details>/<summary>.
 * O elemento nativo já entrega teclado, foco e leitor de tela sem dependências.
 */
export function Accordion({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("divide-y divide-[var(--sesi-gray)] border-y border-[var(--sesi-gray)]", className)}>
      {children}
    </div>
  )
}

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="text-lg font-semibold">{title}</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="shrink-0 transition-transform duration-200 group-open:rotate-45"
        >
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </summary>
      <div className="pb-6 text-[var(--sesi-muted)]">{children}</div>
    </details>
  )
}
