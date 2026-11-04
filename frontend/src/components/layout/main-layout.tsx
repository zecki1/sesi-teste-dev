import { ReactNode } from "react"
import { Header } from "./header"
import { Footer } from "./footer"
import { SuperSesinhoTutor } from "@/components/support/super-sesinho-tutor"

export function MainLayout({ children, showFooter = true }: { children: ReactNode; showFooter?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pt-[72px]">{children}</main>
      {showFooter && <Footer />}
      <SuperSesinhoTutor />
    </div>
  )
}
