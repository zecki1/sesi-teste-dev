import { ReactNode } from "react"
import { Header } from "./header"
import { Footer } from "./footer"

export function MainLayout({ children, showFooter = true }: { children: ReactNode; showFooter?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pt-[72px]">{children}</main>
      {showFooter && <Footer />}
    </div>
  )
}
