import { useEffect, useRef, useState } from "react"
import { FaRobot } from "react-icons/fa"
import { usePerfil } from "@/lib/auth/perfil"
import { obterHistoricoTutor, limparHistoricoTutor, perguntarTutor } from "@/lib/api/academico"
import { lerConfig } from "@/lib/a11y/config"

interface Mensagem {
  papel: "user" | "assistant"
  texto: string
  criadoEm?: string
}

const SAUDACAO = "Olá! Eu sou o Super Sesinho, seu tutor virtual. Como posso ajudar nos seus estudos hoje?"

/**
 * `obterContexto` permite que o tutor leia o conteúdo aberto na tela (por
 * exemplo, o texto do curso SCORM) e responda com base nele.
 */
export function SuperSesinhoTutor({ obterContexto }: { obterContexto?: () => string | undefined } = {}) {
  const perfil = usePerfil()
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([{ papel: "assistant", texto: SAUDACAO }])
  const [entrada, setEntrada] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)
  const [erro, setErro] = useState("")
  const [vlibrasAtivo, setVlibrasAtivo] = useState(() => lerConfig().vlibras)
  const fimRef = useRef<HTMLDivElement>(null)

  // Oculta os ícones da esquerda no mobile quando o chat está aberto.
  useEffect(() => {
    if (aberto) document.body.classList.add("sesi-tutor-aberto")
    else document.body.classList.remove("sesi-tutor-aberto")
    const botaoMenu = document.getElementById("botaoMenu")
    if (botaoMenu) botaoMenu.style.display = aberto ? "none" : ""
    return () => {
      document.body.classList.remove("sesi-tutor-aberto")
      const bm = document.getElementById("botaoMenu")
      if (bm) bm.style.display = ""
    }
  }, [aberto])

  // O botão do VLibras ocupa o canto inferior direito: desloca o tutor para não sobrepor.
  useEffect(() => {
    const sincronizar = () => setVlibrasAtivo(lerConfig().vlibras)
    window.addEventListener("sesi:acessibilidade-atualizada", sincronizar)
    window.addEventListener("storage", sincronizar)
    return () => {
      window.removeEventListener("sesi:acessibilidade-atualizada", sincronizar)
      window.removeEventListener("storage", sincronizar)
    }
  }, [])

  const posicao = vlibrasAtivo ? "right-4" : "right-4"

  const carregarHistorico = async () => {
    if (!perfil?.email) return
    setCarregandoHistorico(true)
    try {
      const lista = await obterHistoricoTutor(perfil.email)
      if (lista.length > 0) {
        setMensagens(lista.map((m) => ({ papel: m.papel === "user" ? "user" : "assistant", texto: m.texto, criadoEm: m.criadoEm })))
      } else {
        setMensagens([{ papel: "assistant", texto: SAUDACAO }])
      }
    } catch {
      // mantém a saudação
    } finally {
      setCarregandoHistorico(false)
    }
  }

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensagens, carregando])

  useEffect(() => {
    if (aberto) void carregarHistorico()
  }, [aberto, perfil?.email])

  const enviar = async () => {
    const texto = entrada.trim()
    if (!texto || carregando) return
    const novas: Mensagem[] = [...mensagens, { papel: "user", texto }]
    setMensagens(novas)
    setEntrada("")
    setCarregando(true)
    setErro("")
    try {
      let conteudo = ""
      const contexto = obterContexto?.()
      try {
        const dados = await perguntarTutor(texto, perfil?.email, perfil?.nome, novas.map((m) => ({ papel: m.papel, texto: m.texto })), contexto)
        conteudo = dados.resposta
      } catch (falhaProxy) {
        // Fora do desenvolvimento o Ollama fica só no servidor; sem fallback direto.
        if (!import.meta.env.DEV) throw falhaProxy
        const resposta = await fetch("http://localhost:11434/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama3.2:3b",
            stream: false,
            messages: [
              {
                role: "system",
                content:
                  "Você é o Super Sesinho, tutor virtual amigável e paciente da plataforma de cursos do SESI. Responda em português do Brasil, de forma clara e didática, em no máximo 4 parágrafos curtos. Quando não souber, admita e sugira onde procurar. " +
                  "IMPORTANTE: responda APENAS sobre o AVA do SESI e os dados do curso (navegação, cronograma, turma, notas, presenças, materiais, conceitos teóricos). NUNCA dê respostas de provas, atividades, exercícios ou avaliações; em vez disso, oriente o aluno a consultar o material e o professor. " +
                  (contexto ? `Use o conteúdo do curso abaixo para responder com precisão: ${contexto} ` : "") +
                  (perfil ? `O aluno se chama ${perfil.nome}.` : ""),
              },
              ...novas.map((m) => ({ role: m.papel === "user" ? "user" : "assistant", content: m.texto })),
            ],
          }),
        })
        if (!resposta.ok) throw new Error(`Ollama respondeu ${resposta.status}`)
        const dados = (await resposta.json()) as { message?: { content?: string } }
        conteudo = dados.message?.content?.trim() || "Não consegui gerar uma resposta agora."
      }
      setMensagens((atuais) => [...atuais, { papel: "assistant", texto: conteudo }])
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? `Não foi possível falar com o tutor local (Ollama). ${falha.message}`
          : "Falha ao falar com o tutor.",
      )
    } finally {
      setCarregando(false)
    }
  }

  const limpar = async () => {
    if (!perfil?.email) return
    if (!window.confirm("Limpar o histórico do tutor?")) return
    try {
      await limparHistoricoTutor(perfil.email)
      setMensagens([{ papel: "assistant", texto: SAUDACAO }])
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível limpar o histórico.")
    }
  }

  return (
    <>
      {aberto && (
        <div
          role="dialog"
          aria-label="Super Sesinho - tutor virtual"
          className={`fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-[var(--sesi-gray)] bg-white shadow-2xl ${
            // Mobile: tela cheia com margem de 2px
            "bottom-[2px] right-[2px] h-[calc(100vh-4px)] w-[calc(100vw-4px)]"
          } sm:bottom-24 sm:right-6 sm:h-[460px] sm:w-[360px] sm:max-w-[calc(100vw-2rem)]`}
        >
          <header className="flex items-center justify-between bg-[var(--sesi-black)] px-4 py-3 text-white">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">Tutor virtual · histórico 7 dias</p>
              <h2 className="text-sm font-bold">Super Sesinho</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void limpar()}
                className="rounded-full px-2 py-1 text-xs text-white/80 hover:bg-white/10"
                aria-label="Limpar histórico"
                title="Limpar histórico"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-full p-1 text-white/80 hover:bg-white/10"
                aria-label="Fechar tutor"
              >
                ✕
              </button>
            </div>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-[#FAFAFA] p-4">
            {carregandoHistorico && <p className="text-xs text-[var(--sesi-muted)]">Carregando histórico...</p>}
            {mensagens.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.papel === "user" ? "ml-auto bg-[var(--sesi-red)] text-white" : "bg-white text-[var(--sesi-black)] shadow-sm"}`}
              >
                <p className="whitespace-pre-wrap">{m.texto}</p>
                {m.criadoEm && (
                  <p className="mt-1 text-[10px] opacity-70">{new Date(m.criadoEm).toLocaleString("pt-BR")}</p>
                )}
              </div>
            ))}
            {carregando && (
              <div className="max-w-[85%] rounded-2xl bg-white px-3 py-2 text-sm text-[var(--sesi-muted)] shadow-sm">
                Pensando...
              </div>
            )}
            {erro && <p role="alert" className="text-xs text-red-700">{erro}</p>}
            <div ref={fimRef} />
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); void enviar() }}
            className="flex gap-2 border-t border-[var(--sesi-gray)] bg-white p-3"
          >
            <input
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder="Pergunte algo..."
              className="flex-1 rounded-lg border border-[var(--sesi-gray)] px-3 py-2 text-sm outline-none focus:border-[var(--sesi-red)]"
            />
            <button
              type="submit"
              disabled={carregando || !entrada.trim()}
              className="rounded-lg bg-[var(--sesi-red)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Enviar
            </button>
          </form>
        </div>
      )}
      {!aberto && (
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className={`fixed bottom-6 ${posicao} z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--sesi-red)] text-2xl text-white shadow-xl transition hover:bg-[var(--sesi-red-dark)]`}
          aria-label="Abrir Super Sesinho, tutor virtual"
          title="Super Sesinho - tutor virtual"
        >
          <FaRobot size={24} />
        </button>
      )}
    </>
  )
}