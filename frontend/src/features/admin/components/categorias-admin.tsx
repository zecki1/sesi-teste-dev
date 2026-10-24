import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  atualizarCategoria,
  buscarCategoriasSimilares,
  criarCategoria,
  excluirCategoria,
  listarCategoriasAdmin,
  type CategoriaAdminDto,
  type CategoriaSalvarRequest,
} from "@/lib/api/catalogo"

const COR_PADRAO = "#6B7280"
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

interface FormularioCategoria {
  nome: string
  nomeEn: string
  nomeEs: string
  cor: string
  iconeUrl: string
  ordem: string
}

const FORMULARIO_VAZIO: FormularioCategoria = {
  nome: "",
  nomeEn: "",
  nomeEs: "",
  cor: COR_PADRAO,
  iconeUrl: "",
  ordem: "",
}

function formularioDe(categoria: CategoriaAdminDto): FormularioCategoria {
  return {
    nome: categoria.nome,
    nomeEn: categoria.nomeEn,
    nomeEs: categoria.nomeEs,
    cor: categoria.cor || COR_PADRAO,
    iconeUrl: categoria.iconeUrl,
    ordem: String(categoria.ordem),
  }
}

interface Props {
  aberto: boolean
  aoFechar: () => void
}

/**
 * Gestão de categorias do catálogo: cria, edita cores/traduções e exclui.
 * Antes de criar, busca nomes parecidos para evitar duplicidade.
 */
export function CategoriasAdmin({ aberto, aoFechar }: Props) {
  const queryClient = useQueryClient()
  const [editando, setEditando] = useState<CategoriaAdminDto | "nova" | null>(null)
  const [formulario, setFormulario] = useState<FormularioCategoria>(FORMULARIO_VAZIO)
  const [corTexto, setCorTexto] = useState(COR_PADRAO)
  const [similares, setSimilares] = useState<{ id: number; nome: string; cor: string; similaridade: number }[]>([])
  const [erro, setErro] = useState("")
  const [aviso, setAviso] = useState("")
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<number | null>(null)

  const categoriasQuery = useQuery({
    queryKey: ["categorias-admin"],
    queryFn: listarCategoriasAdmin,
    enabled: aberto,
  })

  const categorias = useMemo(
    () => [...(categoriasQuery.data ?? [])].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)),
    [categoriasQuery.data],
  )

  const idEmEdicao = editando && editando !== "nova" ? editando.id : undefined

  useEffect(() => {
    const nome = formulario.nome.trim()
    if (!aberto || editando === null || nome.length < 2) {
      setSimilares([])
      return
    }

    let ativo = true
    const timer = window.setTimeout(() => {
      buscarCategoriasSimilares(nome, idEmEdicao)
        .then((resultado) => {
          if (ativo) setSimilares(resultado)
        })
        .catch(() => {
          if (ativo) setSimilares([])
        })
    }, 350)

    return () => {
      ativo = false
      window.clearTimeout(timer)
    }
  }, [aberto, editando, formulario.nome, idEmEdicao])

  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(() => setAviso(""), 4000)
    return () => window.clearTimeout(timer)
  }, [aviso])

  useEffect(() => {
    if (!aberto) {
      setEditando(null)
      setFormulario(FORMULARIO_VAZIO)
      setCorTexto(COR_PADRAO)
      setSimilares([])
      setErro("")
      setAviso("")
      setConfirmandoExclusao(null)
    }
  }, [aberto])

  const invalidarCatalogo = () => {
    for (const chave of ["categorias-admin", "facetas", "cursos", "curso", "cursos-admin"]) {
      queryClient.invalidateQueries({ queryKey: [chave] })
    }
  }

  const salvar = useMutation({
    mutationFn: (payload: CategoriaSalvarRequest) =>
      idEmEdicao ? atualizarCategoria(idEmEdicao, payload) : criarCategoria(payload),
    onSuccess: (categoria) => {
      invalidarCatalogo()
      setAviso(`Categoria "${categoria.nome}" salva com a cor ${categoria.cor}.`)
      setEditando(null)
      setFormulario(FORMULARIO_VAZIO)
      setCorTexto(COR_PADRAO)
      setSimilares([])
      setErro("")
    },
    onError: (falha: unknown) => {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar a categoria.")
    },
  })

  const excluir = useMutation({
    mutationFn: (id: number) => excluirCategoria(id),
    onSuccess: () => {
      invalidarCatalogo()
      setAviso("Categoria excluída.")
      setConfirmandoExclusao(null)
      setErro("")
      if (idEmEdicao) {
        setEditando(null)
        setFormulario(FORMULARIO_VAZIO)
      }
    },
    onError: (falha: unknown) => {
      setErro(falha instanceof Error ? falha.message : "Não foi possível excluir a categoria.")
      setConfirmandoExclusao(null)
    },
  })

  if (!aberto) return null

  const abrirNova = () => {
    setEditando("nova")
    setFormulario(FORMULARIO_VAZIO)
    setCorTexto(COR_PADRAO)
    setSimilares([])
    setErro("")
    setConfirmandoExclusao(null)
  }

  const abrirEdicao = (categoria: CategoriaAdminDto) => {
    setEditando(categoria)
    setFormulario(formularioDe(categoria))
    setCorTexto(categoria.cor || COR_PADRAO)
    setSimilares([])
    setErro("")
    setConfirmandoExclusao(null)
  }

  const alterar = (campo: keyof FormularioCategoria, valor: string) => {
    setFormulario((atual) => ({ ...atual, [campo]: valor }))
    if (campo === "cor") setCorTexto(valor)
  }

  const alterarCor = (valor: string) => {
    setCorTexto(valor)
    if (HEX.test(valor)) setFormulario((atual) => ({ ...atual, cor: valor.toUpperCase() }))
  }

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault()
    setErro("")

    const nome = formulario.nome.trim()
    if (nome.length < 2) {
      setErro("Informe o nome da categoria com pelo menos 2 caracteres.")
      return
    }
    if (!HEX.test(formulario.cor)) {
      setErro("Informe a cor no formato hexadecimal, por exemplo #DEC8F8.")
      return
    }
    if (similares.length > 0 && !window.confirm(
      `Já existem categorias com nome parecido (${similares.map((item) => item.nome).join(", ")}). Deseja criar mesmo assim?`,
    )) {
      return
    }

    salvar.mutate({
      nome,
      cor: formulario.cor.toUpperCase(),
      iconeUrl: formulario.iconeUrl.trim() || null,
      ordem: formulario.ordem ? Number(formulario.ordem) : null,
      nomeEn: formulario.nomeEn.trim() || null,
      nomeEs: formulario.nomeEs.trim() || null,
    })
  }

  const rotulo = "flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--sesi-muted)]"
  const campo = "rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white px-3 py-2.5 text-sm font-normal text-[var(--sesi-black)]"

  return (
    <div
      className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="categorias-admin-titulo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar()
      }}
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[var(--radius-lg)] bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="categorias-admin-titulo" className="text-2xl font-bold text-[var(--sesi-black)]">
              Categorias
            </h2>
            <p className="mt-1 text-sm text-[var(--sesi-muted)]">
              A cor define o fundo do badge da categoria no catálogo, na home e no detalhe do curso.
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar gestão de categorias"
            className="shrink-0 rounded p-1 text-[var(--sesi-muted)] transition hover:bg-[var(--sesi-gray)] hover:text-[var(--sesi-black)]"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {erro && (
          <p role="alert" className="mt-4 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {erro}
          </p>
        )}
        {aviso && (
          <p role="status" className="mt-4 rounded-[var(--radius-lg)] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {aviso}
          </p>
        )}

        <div className="mt-5 grid gap-6 md:grid-cols-[1fr_1fr]">
          <section aria-label="Categorias cadastradas">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--sesi-muted)]">Cadastradas</h3>
              <button
                type="button"
                onClick={abrirNova}
                className="rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)]"
              >
                + Nova categoria
              </button>
            </div>

            {categoriasQuery.isLoading ? (
              <p className="mt-4 text-sm text-[var(--sesi-muted)]">Carregando categorias…</p>
            ) : categorias.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--sesi-muted)]">Nenhuma categoria cadastrada.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {categorias.map((categoria) => (
                  <li
                    key={categoria.id}
                    className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] px-3 py-2.5"
                  >
                    <span
                      aria-hidden="true"
                      className="h-6 w-6 shrink-0 rounded-full border border-black/10"
                      style={{ backgroundColor: categoria.cor }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--sesi-black)]">{categoria.nome}</p>
                      <p className="text-xs text-[var(--sesi-muted)]">
                        {categoria.slug} · {categoria.cursos} curso(s) · {categoria.cor}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => abrirEdicao(categoria)}
                        className="rounded border border-[var(--sesi-gray)] px-2.5 py-1.5 text-xs font-semibold text-[var(--sesi-black)] transition hover:bg-[var(--sesi-beige)]"
                      >
                        Editar
                      </button>
                      {confirmandoExclusao === categoria.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => excluir.mutate(categoria.id)}
                            disabled={excluir.isPending}
                            className="rounded bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmandoExclusao(null)}
                            className="rounded border border-[var(--sesi-gray)] px-2.5 py-1.5 text-xs font-semibold"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setErro("")
                            setConfirmandoExclusao(categoria.id)
                          }}
                          className="rounded border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Formulário de categoria">
            {editando === null ? (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--sesi-gray)] p-5 text-sm text-[var(--sesi-muted)]">
                Selecione uma categoria para editar ou crie uma nova. Ao digitar o nome, categorias parecidas são
                sugeridas para evitar duplicidade.
              </div>
            ) : (
              <form onSubmit={enviar} className="flex flex-col gap-3">
                <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--sesi-muted)]">
                  {editando === "nova" ? "Nova categoria" : `Editando: ${editando.nome}`}
                </h3>

                <label className={rotulo} htmlFor="categoria-nome">
                  Nome (pt-BR)
                  <input
                    id="categoria-nome"
                    value={formulario.nome}
                    onChange={(evento) => alterar("nome", evento.target.value)}
                    maxLength={120}
                    required
                    className={campo}
                  />
                </label>

                {similares.length > 0 && (
                  <div className="rounded-[var(--radius-lg)] border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                    <p className="font-semibold">Categorias com nome parecido:</p>
                    <ul className="mt-1 flex flex-col gap-1">
                      {similares.map((similar) => (
                        <li key={similar.id}>
                          <button
                            type="button"
                            onClick={() => {
                              const existente = categorias.find((item) => item.id === similar.id)
                              if (existente) abrirEdicao(existente)
                            }}
                            className="text-left underline decoration-amber-500 underline-offset-2 hover:text-amber-950"
                          >
                            {similar.nome} ({similar.similaridade}% de semelhança)
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <label className={rotulo} htmlFor="categoria-nome-en">
                    Nome (en-US)
                    <input
                      id="categoria-nome-en"
                      value={formulario.nomeEn}
                      onChange={(evento) => alterar("nomeEn", evento.target.value)}
                      maxLength={120}
                      className={campo}
                    />
                  </label>
                  <label className={rotulo} htmlFor="categoria-nome-es">
                    Nome (es-ES)
                    <input
                      id="categoria-nome-es"
                      value={formulario.nomeEs}
                      onChange={(evento) => alterar("nomeEs", evento.target.value)}
                      maxLength={120}
                      className={campo}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className={rotulo} htmlFor="categoria-cor">
                    Cor do badge
                    <span className="flex items-center gap-2">
                      <input
                        id="categoria-cor"
                        type="color"
                        value={HEX.test(formulario.cor) ? formulario.cor : COR_PADRAO}
                        onChange={(evento) => alterarCor(evento.target.value.toUpperCase())}
                        className="h-10 w-12 cursor-pointer rounded border border-[var(--sesi-gray)] bg-white p-1"
                        aria-label="Selecionar cor da categoria"
                      />
                      <input
                        value={corTexto}
                        onChange={(evento) => alterarCor(evento.target.value)}
                        onBlur={() => {
                          if (!HEX.test(corTexto)) setCorTexto(formulario.cor)
                        }}
                        maxLength={7}
                        aria-label="Cor em hexadecimal"
                        className={`${campo} min-w-0 flex-1 font-mono uppercase`}
                      />
                    </span>
                  </label>
                  <label className={rotulo} htmlFor="categoria-ordem">
                    Ordem
                    <input
                      id="categoria-ordem"
                      type="number"
                      min={1}
                      value={formulario.ordem}
                      onChange={(evento) => alterar("ordem", evento.target.value)}
                      className={campo}
                    />
                  </label>
                </div>

                <label className={rotulo} htmlFor="categoria-icone">
                  Ícone (caminho opcional)
                  <input
                    id="categoria-icone"
                    value={formulario.iconeUrl}
                    onChange={(evento) => alterar("iconeUrl", evento.target.value)}
                    placeholder="/icons/matematica.svg"
                    className={campo}
                  />
                </label>

                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={salvar.isPending}
                    className="rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)] disabled:opacity-60"
                  >
                    {salvar.isPending ? "Salvando…" : "Salvar categoria"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditando(null)
                      setFormulario(FORMULARIO_VAZIO)
                      setCorTexto(COR_PADRAO)
                      setSimilares([])
                      setErro("")
                    }}
                    className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] px-4 py-2.5 text-sm font-semibold"
                  >
                    Cancelar
                  </button>
                  <span
                    className="ml-auto rounded-full px-3 py-1 text-xs font-semibold uppercase text-black"
                    style={{ backgroundColor: HEX.test(formulario.cor) ? formulario.cor : COR_PADRAO }}
                  >
                    Prévia do badge
                  </span>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
