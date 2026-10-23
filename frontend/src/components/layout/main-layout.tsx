import { ReactNode } from "react"
import { Header } from "./header"
import { Footer } from "./footer"

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pt-[72px]">{children}</main>
      <Footer />
    </div>
  )
}
