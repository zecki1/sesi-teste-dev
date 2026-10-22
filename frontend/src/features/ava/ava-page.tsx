import { useState } from "react"
import { Container } from "@/components/layout/container"
import { useCurso } from "@/hooks/use-catalogo"

export function AvaPage() {
  const { data: curso } = useCurso("robotica-e-automacao-industrial")
  const [busca, setBusca] = useState("")

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[320px_1fr]">
      <aside className="flex flex-col bg-[var(--sesi-black)] text-white">
        <div className="flex flex-col gap-4 px-6 py-6">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">SESI</span>
            <span className="text-sm text-white/70">R</span>
          </div>
          <h2 className="text-lg font-semibold">{curso?.nomeBreve || "Ambiente Virtual do Aluno"}</h2>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso</span>
              <span>10%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/20">
              <div className="h-2 rounded-full bg-[var(--sesi-red)]" style={{ width: "10%" }} />
            </div>
          </div>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aula" className="rounded-[var(--radius-lg)] bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60" />
          <button className="self-start text-sm text-white/80 hover:underline">Reiniciar</button>
        </div>
        <nav className="flex flex-1 flex-col overflow-auto px-4 pb-6">
          {curso?.modulos.map((modulo) => (
            <div key={modulo.id} className="mt-4">
              <p className="px-2 text-sm font-semibold text-white/70">Módulo {modulo.ordem}</p>
              <ul className="mt-2 flex flex-col">
                {modulo.aulas.map((aula, index) => (
                  <li key={aula.id}>
                    <button className={`flex w-full items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2 text-left text-sm hover:bg-white/10 ${index === 1 ? "bg-white/10" : ""}`}>
                      <span>{index === 0 ? "✔" : index === 1 ? "▶" : "○"}</span>
                      <span>{modulo.ordem}.{aula.ordem} {aula.titulo}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex flex-col">
        <header className="border-b border-[var(--sesi-gray)] px-6 py-4">
          <Container className="flex items-center justify-between px-0">
            <h1 className="text-xl font-semibold">Boas práticas</h1>
            <span className="text-sm text-[var(--sesi-muted)]">Aula 1.2</span>
          </Container>
        </header>
        <section className="flex-1">
          <Container className="flex flex-col gap-8 py-8 px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[var(--radius-lg)]">
              <img src={curso ? "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop" : ""} alt="Banner da aula" className="h-[420px] w-full object-cover" />
            </div>
            <article className="prose max-w-none">
              <h2>Boas práticas</h2>
              <p>Conteúdo da aula desenvolvido para o Ambiente Virtual do Aluno. Esta tela reproduz a estrutura observada no fluxo 03 do Figma, com sidebar escura, progresso e navegação por módulos/aulas.</p>
              <p>O AVA hospeda pacotes SCORM 1.2/2004 conforme arquitetura prevista, com rastreio de progresso e tentativas.</p>
            </article>
            <section>
              <h2 className="mb-4 text-xl font-semibold">Recomendações</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] p-4 shadow-[var(--shadow-card)]">
                  <p className="font-medium">Próxima aula</p>
                  <p className="text-sm text-[var(--sesi-muted)]">Continue seu aprendizado</p>
                </div>
                <div className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] p-4 shadow-[var(--shadow-card)]">
                  <p className="font-medium">Materiais complementares</p>
                  <p className="text-sm text-[var(--sesi-muted)]">Aprofunde o conteúdo</p>
                </div>
                <div className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] p-4 shadow-[var(--shadow-card)]">
                  <p className="font-medium">Exercícios</p>
                  <p className="text-sm text-[var(--sesi-muted)]">Pratique o que aprendeu</p>
                </div>
              </div>
            </section>
          </Container>
        </section>
      </main>
    </div>
  )
}
