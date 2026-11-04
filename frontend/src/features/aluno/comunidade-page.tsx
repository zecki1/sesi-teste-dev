import { FormEvent, useEffect, useRef, useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { Container } from "@/components/layout/container"
import { MainLayout } from "@/components/layout/main-layout"
import { usePerfil } from "@/lib/auth/perfil"
import {
  enviarComunidade,
  listarComunidade,
  type MensagemComunidade,
} from "@/lib/api/academico"

type Canal = "forum" | "chat" | "plantao"

const CANAIS: { id: Canal; label: string; descricao: string }[] = [
  { id: "forum", label: "Fórum", descricao: "Discussões temáticas da turma." },
  { id: "chat", label: "Chat", descricao: "Conversa rápida entre os colegas." },
  { id: "plantao", label: "Plantão de dúvidas", descricao: "Pergunte e ajude seus colegas." },
]

const card = "rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5"

export function ComunidadePage() {
  const perfil = usePerfil()
  const { turmaId: turmaIdParam } = useParams()
  const turmaId = Number(turmaIdParam)
  const [canal, setCanal] = useState<Canal>("forum")
  const [mensagens, setMensagens] = useState<MensagemComunidade[]>([])
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [conteudo, setConteudo] = useState("")
  const [responderA, setResponderA] = useState<number | null>(null)
  const fimChatRef = useRef<HTMLDivElement>(null)

  const carregar = async () => {
    if (!turmaId) return
    setCarregando(true)
    setErro("")
    try {
      const lista = await listarComunidade(turmaId, canal)
      setMensagens(lista)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível carregar a comunidade.")
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void carregar()
  }, [turmaId, canal])

  useEffect(() => {
    if (canal !== "chat") return
    const id = window.setInterval(() => {
      void listarComunidade(turmaId, canal)
        .then((lista) => setMensagens(lista))
        .catch(() => {})
    }, 5000)
    return () => window.clearInterval(id)
  }, [turmaId, canal])

  useEffect(() => {
    if (canal === "chat") fimChatRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensagens, canal])

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

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!conteudo.trim()) return
    setEnviando(true)
    setErro("")
    try {
      await enviarComunidade({
        turmaId,
        usuarioId: perfil.email,
        usuarioNome: perfil.nome,
        canal,
        titulo: canal === "chat" ? null : (titulo.trim() || null),
        conteudo: conteudo.trim(),
        parentId: responderA,
      })
      setTitulo("")
      setConteudo("")
      setResponderA(null)
      await carregar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar a mensagem.")
    } finally {
      setEnviando(false)
    }
  }

  const raiz = mensagens.filter((m) => !m.parentId)
  const respostasDe = (id: number) => mensagens.filter((m) => m.parentId === id)

  const renderMensagem = (m: MensagemComunidade, aninhada = false) => (
    <article
      key={m.id}
      className={`rounded-lg border border-[var(--sesi-gray)] bg-white p-4 ${aninhada ? "ml-6 border-l-4 border-l-[var(--sesi-red)]" : ""}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--sesi-black)]">
          {m.usuarioNome || m.usuarioId}
          {m.usuarioId === perfil.email && <span className="ml-2 text-xs text-[var(--sesi-muted)]">(você)</span>}
        </p>
        <p className="text-xs text-[var(--sesi-muted)]">{new Date(m.criadoEm).toLocaleString("pt-BR")}</p>
      </div>
      {m.titulo && <h3 className="mt-1 font-semibold text-[var(--sesi-black)]">{m.titulo}</h3>}
      <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--sesi-muted)]">{m.conteudo}</p>
      {canal !== "chat" && (
        <button
          type="button"
          onClick={() => setResponderA(m.id)}
          className="mt-2 text-xs font-semibold text-[var(--sesi-red)] hover:underline"
        >
          Responder
        </button>
      )}
      {respostasDe(m.id).map((r) => renderMensagem(r, true))}
    </article>
  )

  return (
    <MainLayout>
      <section className="bg-[var(--sesi-black)] py-10 text-white">
        <Container className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-[var(--sesi-beige)]">Comunidade da turma</p>
            <h1 className="text-2xl font-bold sm:text-3xl">Turma {turmaId}</h1>
          </div>
          <Link
            to="/area-do-aluno/boletim"
            className="rounded-[var(--radius-lg)] border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-[var(--sesi-black)]"
          >
            Voltar
          </Link>
        </Container>
      </section>

      <section className="bg-[var(--sesi-white)] py-10">
        <Container>
          <div className="mb-6 flex flex-wrap gap-2 border-b border-[var(--sesi-gray)]" role="tablist">
            {CANAIS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={canal === item.id}
                onClick={() => { setCanal(item.id); setResponderA(null) }}
                className={`border-b-2 px-4 py-3 text-sm font-semibold ${canal === item.id ? "border-[var(--sesi-red)] text-[var(--sesi-red)]" : "border-transparent text-[var(--sesi-muted)]"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mb-4 text-sm text-[var(--sesi-muted)]">{CANAIS.find((c) => c.id === canal)?.descricao}</p>

          {erro && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}

          <div className={`${card} mb-6`}>
            <form onSubmit={enviar} className="grid gap-3">
              {canal !== "chat" && (
                <label className="text-sm font-semibold">
                  Título (opcional)
                  <input
                    maxLength={200}
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--sesi-gray)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--sesi-red)]"
                  />
                </label>
              )}
              {responderA && (
                <p className="text-xs text-[var(--sesi-muted)]">
                  Respondendo à mensagem #{responderA}{" "}
                  <button type="button" onClick={() => setResponderA(null)} className="font-semibold text-[var(--sesi-red)]">
                    cancelar
                  </button>
                </p>
              )}
              <label className="text-sm font-semibold">
                Mensagem
                <textarea
                  required
                  rows={canal === "chat" ? 2 : 4}
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--sesi-gray)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--sesi-red)]"
                />
              </label>
              <button type="submit" disabled={enviando} className="w-fit rounded-lg bg-[var(--sesi-red)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)] disabled:opacity-60">
                {enviando ? "Enviando..." : "Enviar"}
              </button>
            </form>
          </div>

          {carregando ? (
            <p className="text-sm text-[var(--sesi-muted)]">Carregando...</p>
          ) : canal === "chat" ? (
            <div className="flex flex-col gap-3">
              {mensagens.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.usuarioId === perfil.email ? "ml-auto bg-[var(--sesi-red)] text-white" : "bg-[#F5F5F5] text-[var(--sesi-black)]"}`}
                >
                  <p className="text-xs font-semibold opacity-80">{m.usuarioNome || m.usuarioId}</p>
                  <p className="whitespace-pre-wrap">{m.conteudo}</p>
                  <p className="mt-1 text-[10px] opacity-70">{new Date(m.criadoEm).toLocaleTimeString("pt-BR")}</p>
                </div>
              ))}
              <div ref={fimChatRef} />
            </div>
          ) : (
            <div className="grid gap-3">
              {mensagens.length === 0 && <p className="text-sm text-[var(--sesi-muted)]">Nenhuma mensagem ainda. Seja o primeiro!</p>}
              {raiz.map((m) => renderMensagem(m))}
            </div>
          )}
        </Container>
      </section>
    </MainLayout>
  )
}
