import { cn } from "@/lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost"
  size?: "sm" | "md" | "lg"
  withArrow?: boolean
}

export function Button({ className, variant = "primary", size = "md", withArrow = false, children, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
  const variants = {
    primary: "bg-[var(--sesi-black)] text-white hover:opacity-90 focus-visible:outline-[var(--sesi-red)]",
    secondary: "border border-current bg-transparent hover:bg-black/5 focus-visible:outline-[var(--sesi-red)]",
    ghost: "bg-transparent hover:bg-black/5 focus-visible:outline-[var(--sesi-red)]",
  }
  const sizes = {
    sm: "px-4 py-2 text-sm rounded-[var(--radius-pill)]",
    md: "px-6 py-3 text-base rounded-[var(--radius-pill)]",
    lg: "px-8 py-4 text-base rounded-[var(--radius-pill)]",
  }

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
      {withArrow && <span aria-hidden="true">→</span>}
    </button>
  )
}
