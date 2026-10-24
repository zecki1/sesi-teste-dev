import { FormEvent, useEffect, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { Container } from "@/components/layout/container"
import { MainLayout } from "@/components/layout/main-layout"
import { usePerfil } from "@/lib/auth/perfil"
import {
  PAPEIS,
  atualizarChamadoGestao,
  excluirUsuarioGestao,
  listarChamadosGestao,
  listarUsuariosGestao,
  obterPermissoesGestao,
  salvarPermissoesGestao,
  salvarUsuarioGestao,
  type Chamado,
  type PapelGestao,
  type PermissaoPapel,
  type UsuarioGestao,
} from "@/lib/api/gestao"

type AbaGestao = "usuarios" | "permissoes" | "chamados"

const campo =
  "w-full rounded-lg border border-[var(--sesi-gray)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--sesi-red)]"
const botao =
  "rounded-lg bg-[var(--sesi-red)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)] disabled:opacity-60"

function permissoesIniciais(): PermissaoPapel[] {
  return PAPEIS.map((papel) => ({
    papel,
    criar: papel === "Administrador" || papel === "Gestor" || papel === "Editor" || papel === "Suporte",
    editar: papel === "Administrador" || papel === "Gestor" || papel === "Editor" || papel === "Suporte",
    excluir: papel === "Administrador" || papel === "Gestor",
    visualizar: true,
  }))
}

export function AdminGestaoPage() {
  const perfil = usePerfil()
  const [aba, setAba] = useState<AbaGestao>("usuarios")
  const [usuarios, setUsuarios] = useState<UsuarioGestao[]>([])
  const [permissoes, setPermissoes] = useState<PermissaoPapel[]>([])
  const [chamados, setChamados] = useState<Chamado[]>([])
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [papel, setPapel] = useState<PapelGestao>("Aluno")
  const [ativo, setAtivo] = useState(true)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [erro, setErro] = useState("")
  const [aviso, setAviso] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [rascunhosChamados, setRascunhosChamados] = useState<Record<string, Pick<Chamado, "status" | "resposta">>>({})

  const carregar = async () => {
    setCarregando(true)
    setErro("")
    try {
      const [listaUsuarios, listaPermissoes, listaChamados] = await Promise.all([
        listarUsuariosGestao(),
        obterPermissoesGestao(),
        listarChamadosGestao(),
      ])
      setUsuarios(listaUsuarios)
      setPermissoes(listaPermissoes)
      setChamados(listaChamados)
      setRascunhosChamados(Object.fromEntries(
        listaChamados.map((chamado) => [
          chamado.id,
          { status: chamado.status, resposta: chamado.resposta ?? "" },
        ]),
      ))
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível carregar a gestão.")
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (perfil?.papel === "admin") void carregar()
  }, [perfil?.papel])

  if (!perfil) return <Navigate to="/area-do-aluno" replace />
  if (perfil.papel !== "admin") {
    return (
      <MainLayout>
        <Container className="py-16">
          <h1 className="text-2xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-[var(--sesi-muted)]">Entre com uma conta administrativa autorizada.</p>
        </Container>
      </MainLayout>
    )
  }
  const registrarErro = (falha: unknown) =>
    setErro(falha instanceof Error ? falha.message : "Não foi possível concluir a operação.")

  const salvarUsuario = async (evento: FormEvent) => {
    evento.preventDefault()
    setSalvando(true)
    setErro("")
    setAviso("")
    try {
      await salvarUsuarioGestao({ nome: nome.trim(), email: email.trim(), papel, ativo }, editandoId ?? undefined)
      setNome("")
      setEmail("")
      setPapel("Aluno")
      setAtivo(true)
      setEditandoId(null)
      setAviso(editandoId ? "Usuário atualizado." : "Usuário cadastrado.")
      await carregar()
    } catch (falha) {
      registrarErro(falha)
    } finally {
      setSalvando(false)
    }
  }

  const editarUsuario = (usuario: UsuarioGestao) => {
    setEditandoId(usuario.id)
    setNome(usuario.nome)
    setEmail(usuario.email)
    setPapel(usuario.papel)
    setAtivo(usuario.ativo)
  }

  const removerUsuario = async (usuario: UsuarioGestao) => {
    if (!window.confirm(`Excluir o usuário ${usuario.email}?`)) return
    setErro("")
    setAviso("")
    try {
      await excluirUsuarioGestao(usuario.id)
      setAviso("Usuário excluído.")
      await carregar()
    } catch (falha) {
      registrarErro(falha)
    }
  }

  const alterarPermissao = (papelAtual: PapelGestao, campoAtual: keyof Omit<PermissaoPapel, "papel">) => {
    if (papelAtual === "Convidado" && campoAtual !== "visualizar") return
    setPermissoes((atuais) =>
      atuais.map((permissao) =>
        permissao.papel === papelAtual ? { ...permissao, [campoAtual]: !permissao[campoAtual] } : permissao,
      ),
    )
  }

  const salvarMatriz = async () => {
    setSalvando(true)
    setErro("")
    setAviso("")
    try {
      setPermissoes(await salvarPermissoesGestao(permissoes))
      setAviso("Permissões salvas na API local.")
    } catch (falha) {
      registrarErro(falha)
    } finally {
      setSalvando(false)
    }
  }

  const atualizarRascunhoChamado = (
    chamado: Chamado,
    dados: Partial<Pick<Chamado, "status" | "resposta">>,
  ) => {
    const atual = rascunhosChamados[chamado.id] ?? {
      status: chamado.status,
      resposta: chamado.resposta ?? "",
    }
    setRascunhosChamados((atuais) => ({
      ...atuais,
      [chamado.id]: {
        ...atual,
        ...dados,
      },
    }))
  }

  const salvarChamado = async (chamado: Chamado) => {
    const rascunho = rascunhosChamados[chamado.id] ?? { status: chamado.status, resposta: chamado.resposta ?? "" }
    setErro("")
    setAviso("")
    try {
      const atualizado = await atualizarChamadoGestao(chamado.id, {
        status: rascunho.status,
        resposta: rascunho.resposta,
      })
      setChamados((atuais) => atuais.map((item) => (item.id === chamado.id ? atualizado : item)))
      setAviso(`Chamado ${chamado.protocolo} atualizado.`)
    } catch (falha) {
      registrarErro(falha)
    }
  }

  const abas: { id: AbaGestao; label: string }[] = [
    { id: "usuarios", label: "Usuários" },
    { id: "permissoes", label: "Permissões" },
    { id: "chamados", label: `Chamados (${chamados.length})` },
  ]

  return (
    <MainLayout>
      <Container className="py-10 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--sesi-red)]">Administração</p>
            <h1 className="mt-1 text-3xl font-bold text-[var(--sesi-black)]">Usuários, permissões e suporte</h1>
          </div>
          <Link to="/admin/cursos" className="rounded-lg border border-[var(--sesi-gray)] px-4 py-2.5 text-sm font-semibold hover:border-[var(--sesi-red)]">
            Administração de cursos
          </Link>
        </div>

        <div role="note" className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          Gestão e papéis persistem na API local, mas o login ainda é demonstrativo. As permissões desta tela não substituem autenticação/autorização real e não devem ser usadas como controle de acesso em produção.
        </div>
        {erro && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
        {aviso && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{aviso}</p>}

        <div className="mt-8 flex flex-wrap gap-2 border-b border-[var(--sesi-gray)]" role="tablist" aria-label="Seções de gestão">
          {abas.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={aba === item.id}
              onClick={() => setAba(item.id)}
              className={`border-b-2 px-4 py-3 text-sm font-semibold ${aba === item.id ? "border-[var(--sesi-red)] text-[var(--sesi-red)]" : "border-transparent text-[var(--sesi-muted)]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {carregando ? (
          <p className="py-10 text-sm text-[var(--sesi-muted)]">Carregando gestão...</p>
        ) : (
          <>
            {aba === "usuarios" && (
              <section role="tabpanel" className="mt-6">
                <form onSubmit={salvarUsuario} className="grid gap-3 rounded-xl border border-[var(--sesi-gray)] bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_180px_auto]">
                  <label className="text-sm font-semibold">Nome
                    <input required maxLength={120} value={nome} onChange={(evento) => setNome(evento.target.value)} className={`${campo} mt-1 font-normal`} />
                  </label>
                  <label className="text-sm font-semibold">E-mail
                    <input required type="email" maxLength={254} value={email} onChange={(evento) => setEmail(evento.target.value)} className={`${campo} mt-1 font-normal`} />
                  </label>
                  <label className="text-sm font-semibold">Papel
                    <select value={papel} onChange={(evento) => setPapel(evento.target.value as PapelGestao)} className={`${campo} mt-1 font-normal`}>
                      {PAPEIS.map((opcao) => <option key={opcao}>{opcao}</option>)}
                    </select>
                  </label>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 pb-2.5 text-sm">
                      <input type="checkbox" checked={ativo} onChange={(evento) => setAtivo(evento.target.checked)} className="h-4 w-4 accent-[var(--sesi-red)]" />
                      Ativo
                    </label>
                    <button type="submit" disabled={salvando} className={botao}>{salvando ? "Salvando..." : editandoId ? "Atualizar" : "Adicionar"}</button>
                    {editandoId && <button type="button" onClick={() => { setEditandoId(null); setNome(""); setEmail(""); setPapel("Aluno"); setAtivo(true) }} className="rounded-lg border px-3 py-2.5 text-sm">Cancelar</button>}
                  </div>
                </form>
                <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--sesi-gray)] bg-white">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-[#F5F5F5] text-xs uppercase text-[var(--sesi-muted)]"><tr><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Papel</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
                    <tbody>{usuarios.map((usuario) => (
                      <tr key={usuario.id} className="border-t border-[var(--sesi-gray)]">
                        <td className="px-4 py-3"><strong>{usuario.nome}</strong><p className="text-xs text-[var(--sesi-muted)]">{usuario.email}</p></td>
                        <td className="px-4 py-3">{usuario.papel}</td>
                        <td className="px-4 py-3">{usuario.ativo ? "Ativo" : "Inativo"}</td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => editarUsuario(usuario)} className="px-2 font-semibold text-[var(--sesi-red)]">Editar</button>
                          <button type="button" onClick={() => void removerUsuario(usuario)} className="px-2 font-semibold text-red-700">Excluir</button>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </section>
            )}

            {aba === "permissoes" && (
              <section role="tabpanel" className="mt-6">
                <p className="mb-4 text-sm text-[var(--sesi-muted)]">Defina a matriz inicial por papel. Convidado permanece limitado à visualização pública.</p>
                <div className="overflow-x-auto rounded-xl border border-[var(--sesi-gray)] bg-white">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="bg-[#F5F5F5] text-xs uppercase text-[var(--sesi-muted)]"><tr><th className="px-4 py-3">Papel</th>{(["criar", "editar", "excluir", "visualizar"] as const).map((coluna) => <th key={coluna} className="px-4 py-3 text-center">{coluna}</th>)}</tr></thead>
                    <tbody>{(permissoes.length ? permissoes : permissoesIniciais()).map((linha) => (
                      <tr key={linha.papel} className="border-t border-[var(--sesi-gray)]">
                        <th scope="row" className="px-4 py-3 font-semibold">{linha.papel}</th>
                        {(["criar", "editar", "excluir", "visualizar"] as const).map((coluna) => (
                          <td key={coluna} className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={linha[coluna]}
                              disabled={linha.papel === "Convidado" && coluna !== "visualizar"}
                              onChange={() => alterarPermissao(linha.papel, coluna)}
                              aria-label={`${coluna} para ${linha.papel}`}
                              className="h-4 w-4 accent-[var(--sesi-red)]"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <button type="button" onClick={() => void salvarMatriz()} disabled={salvando} className={`${botao} mt-4`}>{salvando ? "Salvando..." : "Salvar permissões"}</button>
              </section>
            )}

            {aba === "chamados" && (
              <section role="tabpanel" className="mt-6 space-y-4">
                {chamados.length === 0 && <p className="rounded-xl border border-dashed p-6 text-sm text-[var(--sesi-muted)]">Nenhum chamado recebido.</p>}
                {chamados.map((chamado) => {
                  const rascunho = rascunhosChamados[chamado.id] ?? { status: chamado.status, resposta: chamado.resposta ?? "" }
                  return (
                    <article key={chamado.id} className="rounded-xl border border-[var(--sesi-gray)] bg-white p-4">
                      <div className="flex flex-wrap justify-between gap-2">
                        <div><h2 className="font-bold">{chamado.protocolo} · {chamado.categoria}</h2><p className="text-xs text-[var(--sesi-muted)]">{chamado.nome} · {chamado.email} · {new Date(chamado.criadoEm).toLocaleString("pt-BR")}</p></div>
                        <a href={`mailto:${encodeURIComponent(chamado.email)}`} className="text-sm font-semibold text-[var(--sesi-red)]">Responder por e-mail</a>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm">{chamado.descricao}</p>
                      <p className="mt-2 break-all text-xs text-[var(--sesi-muted)]">Página: {chamado.pagina}</p>
                      {chamado.capturaTela && (
                        <a href={chamado.capturaTela} target="_blank" rel="noreferrer" className="mt-3 inline-block">
                          <img src={chamado.capturaTela} alt={`Captura de tela anexada ao chamado ${chamado.protocolo}`} className="max-h-64 rounded-lg border border-[var(--sesi-gray)] object-contain object-top" />
                        </a>
                      )}
                      <div className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr_auto]">
                        <label className="text-xs font-semibold">Status
                          <select value={rascunho.status} onChange={(evento) => atualizarRascunhoChamado(chamado, { status: evento.target.value as Chamado["status"] })} className={`${campo} mt-1 font-normal`}>
                            <option>Aberto</option><option>Em atendimento</option><option>Resolvido</option>
                          </select>
                        </label>
                        <label className="text-xs font-semibold">Resposta/observação
                          <textarea rows={2} value={rascunho.resposta ?? ""} onChange={(evento) => atualizarRascunhoChamado(chamado, { resposta: evento.target.value })} className={`${campo} mt-1 font-normal`} />
                        </label>
                        <button type="button" onClick={() => void salvarChamado(chamado)} className={`${botao} self-end`}>Salvar</button>
                      </div>
                    </article>
                  )
                })}
              </section>
            )}
          </>
        )}
      </Container>
    </MainLayout>
  )
}
