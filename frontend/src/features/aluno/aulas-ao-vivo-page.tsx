import { FormEvent, useEffect, useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { Container } from "@/components/layout/container"
import { MainLayout } from "@/components/layout/main-layout"
import { usePerfil } from "@/lib/auth/perfil"
import {
  criarAulaAoVivo,
  listarAulasAoVivo,
  registrarPresencaAula,
  type AulaAoVivo,
} from "@/lib/api/academico"

const card = "rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5"

export function AulasAoVivoPage() {
  const perfil = usePerfil()
  const { turmaId: turmaIdParam } = useParams()
  const turmaId = Number(turmaIdParam)
  const [aulas, setAulas] = useState<AulaAoVivo[]>([])
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [aulaAtiva, setAulaAtiva] = useState<AulaAoVivo | null>(null)
  const [criando, setCriando] = useState(false)
  const [form, setForm] = useState({ titulo: "", descricao: "", dataHora: "", duracao: 60 })

  const carregar = async () => {
    if (!turmaId) return
    setCarregando(true)
    setErro("")
    try {
      setAulas(await listarAulasAoVivo(turmaId))
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível carregar as aulas.")
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void carregar()
  }, [turmaId])

  if (!perfil) return <Navigate to="/area-do-aluno" replace />
  if (!turmaId) {
    return (
      <MainLayout>
        <Container className="py-16">
          <p className="text-sm text-[var(--sesi-muted)]">Turma inválida.</p>
        </Container>
      </MainLayout>
    )
  }

  const criar = async (evento: FormEvent) => {
    evento.preventDefault()
    setCriando(true)
    setErro("")
    try {
      await criarAulaAoVivo({
        turmaId,
        titulo: form.titulo,
        descricao: form.descricao || null,
        dataHora: form.dataHora,
        duracaoMinutos: Number(form.duracao) || 60,
      })
      setForm({ titulo: "", descricao: "", dataHora: "", duracao: 60 })
      await carregar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível criar a aula.")
    } finally {
      setCriando(false)
    }
  }

  const checkIn = async (aula: AulaAoVivo) => {
    try {
      await registrarPresencaAula(aula.id, perfil.email, true)
      await carregar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível registrar presença.")
    }
  }

  return (
    <MainLayout>
      <section className="bg-[var(--sesi-black)] py-10 text-white">
        <Container className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-[var(--sesi-beige)]">Aulas ao vivo</p>
            <h1 className="text-2xl font-bold sm:text-3xl">Turma {turmaId}</h1>
          </div>
          <Link to="/area-do-aluno/boletim" className="rounded-[var(--radius-lg)] border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-[var(--sesi-black)]">
            Voltar
          </Link>
        </Container>
      </section>

      <section className="bg-[var(--sesi-white)] py-10">
        <Container>
          {erro && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}

          {perfil.papel === "admin" && (
            <form onSubmit={criar} className={`${card} mb-6 grid gap-3 sm:grid-cols-2`}>
              <h2 className="sm:col-span-2 text-lg font-bold text-[var(--sesi-black)]">Agendar aula ao vivo</h2>
              <label className="text-sm font-semibold sm:col-span-2">
                Título
                <input required maxLength={200} value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--sesi-gray)] px-3 py-2.5 text-sm outline-none focus:border-[var(--sesi-red)]" />
              </label>
              <label className="text-sm font-semibold">
                Data e hora
                <input required type="datetime-local" value={form.dataHora} onChange={(e) => setForm((f) => ({ ...f, dataHora: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--sesi-gray)] px-3 py-2.5 text-sm outline-none focus:border-[var(--sesi-red)]" />
              </label>
              <label className="text-sm font-semibold">
                Duração (min)
                <input required type="number" min={15} max={240} value={form.duracao} onChange={(e) => setForm((f) => ({ ...f, duracao: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-[var(--sesi-gray)] px-3 py-2.5 text-sm outline-none focus:border-[var(--sesi-red)]" />
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
                Descrição (opcional)
                <textarea rows={2} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--sesi-gray)] px-3 py-2.5 text-sm outline-none focus:border-[var(--sesi-red)]" />
              </label>
              <div className="sm:col-span-2">
                <button type="submit" disabled={criando} className="rounded-lg bg-[var(--sesi-red)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {criando ? "Agendando..." : "Agendar aula"}
                </button>
              </div>
            </form>
          )}

          {carregando ? (
            <p className="text-sm text-[var(--sesi-muted)]">Carregando aulas...</p>
          ) : aulas.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--sesi-gray)] p-6 text-sm text-[var(--sesi-muted)]">Nenhuma aula ao vivo agendada ainda.</p>
          ) : (
            <div className="grid gap-4">
              {aulas.map((aula) => (
                <article key={aula.id} className={card}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-[var(--sesi-black)]">{aula.titulo}</h2>
                      <p className="text-xs text-[var(--sesi-muted)]">
                        {new Date(aula.dataHora).toLocaleString("pt-BR")} · {aula.duracaoMinutos} min · {aula.presentes} presentes
                      </p>
                      {aula.descricao && <p className="mt-2 text-sm text-[var(--sesi-muted)]">{aula.descricao}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void checkIn(aula)} className="rounded-lg border border-[var(--sesi-gray)] px-3 py-2 text-sm font-semibold hover:border-[var(--sesi-red)]">
                        Confirmar presença
                      </button>
                      <button type="button" onClick={() => setAulaAtiva(aulaAtiva?.id === aula.id ? null : aula)} className="rounded-lg bg-[var(--sesi-red)] px-3 py-2 text-sm font-semibold text-white">
                        {aulaAtiva?.id === aula.id ? "Fechar sala" : "Entrar na sala"}
                      </button>
                    </div>
                  </div>
                  {aulaAtiva?.id === aula.id && (
                    <div className="mt-4 aspect-video w-full overflow-hidden rounded-lg border border-[var(--sesi-gray)]">
                      <iframe
                        src={aula.urlSala}
                        title={aula.titulo}
                        allow="camera; microphone; fullscreen; display-capture"
                        className="h-full w-full"
                      />
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </Container>
      </section>
    </MainLayout>
  )
}
