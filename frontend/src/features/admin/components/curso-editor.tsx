import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import type { FacetasDto, PerguntaAdminDto } from "@/lib/api/catalogo"
import { enviarImagem } from "@/lib/api/catalogo"
import { configScormPadrao, type ScormPaginaConfig } from "@/features/scorm/scorm-config"
import { detectarVersaoScorm } from "@/features/scorm/detectar-versao-scorm"
import { obterPacoteScorm, urlDownloadScorm, type PacoteScormDto } from "@/features/scorm/scorm-api"
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock"
import {
  gerarSlug,
  novoId,
  type AulaAdmin,
  type Bloco,
  type CursoAdmin,
  type ModuloAdmin,
  type TipoBloco,
  type TipoCurso,
} from "../store"

interface CursoEditorProps {
  curso: CursoAdmin
  facetas?: FacetasDto
  salvando?: boolean
  progressoUploadScorm?: number | null
  limitePacoteMb?: number
  onSalvar: (curso: CursoAdmin, arquivoPacote?: File) => void
  onCancelar: () => void
}

const campo =
  "w-full rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--sesi-red)] focus:ring-2 focus:ring-[var(--sesi-red)]/20"

const rotulo = "text-xs font-semibold uppercase tracking-wide text-[var(--sesi-muted)]"

const IDIOMAS_CONTEUDO = [
  { codigo: "pt-BR", bandeira: "🇧🇷", nome: "Português" },
  { codigo: "en-US", bandeira: "🇺🇸", nome: "English" },
  { codigo: "es-ES", bandeira: "🇪🇸", nome: "Español" },
] as const

type IdiomaConteudo = (typeof IDIOMAS_CONTEUDO)[number]["codigo"]

const CAMPOS_PERGUNTA: Record<IdiomaConteudo, { pergunta: keyof PerguntaAdminDto; resposta: keyof PerguntaAdminDto }> = {
  "pt-BR": { pergunta: "perguntaPt", resposta: "respostaPt" },
  "en-US": { pergunta: "perguntaEn", resposta: "respostaEn" },
  "es-ES": { pergunta: "perguntaEs", resposta: "respostaEs" },
}

function perguntaVazia(ordem: number): PerguntaAdminDto {
  return {
    id: 0,
    ordem,
    ativa: true,
    perguntaPt: "",
    respostaPt: "",
    perguntaEn: "",
    respostaEn: "",
    perguntaEs: "",
    respostaEs: "",
  }
}
const normalizarBusca = (valor: string) =>
  valor.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim()

function distanciaEdicao(a: string, b: string) {
  const linha = Array.from({ length: b.length + 1 }, (_, indice) => indice)
  for (let indiceA = 1; indiceA <= a.length; indiceA += 1) {
    let diagonal = linha[0]
    linha[0] = indiceA
    for (let indiceB = 1; indiceB <= b.length; indiceB += 1) {
      const acima = linha[indiceB]
      linha[indiceB] = Math.min(
        linha[indiceB] + 1,
        linha[indiceB - 1] + 1,
        diagonal + (a[indiceA - 1] === b[indiceB - 1] ? 0 : 1),
      )
      diagonal = acima
    }
  }
  return linha[b.length]
}

const TIPOS_BLOCO: { valor: TipoBloco; nome: string }[] = [
  { valor: "texto", nome: "Texto" },
  { valor: "video", nome: "Vídeo (URL)" },
  { valor: "imagem", nome: "Imagem (URL)" },
  { valor: "quiz", nome: "Quiz (pergunta)" },
]

function Campo({ titulo, children, largura = "" }: { titulo: string; children: ReactNode; largura?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${largura}`}>
      <span className={rotulo}>{titulo}</span>
      {children}
    </label>
  )
}

export function CursoEditor({
  curso,
  facetas,
  salvando = false,
  progressoUploadScorm = null,
  limitePacoteMb = 100,
  onSalvar,
  onCancelar,
}: CursoEditorProps) {
  const [draft, setDraft] = useState<CursoAdmin>(curso)
const [enviandoCapa, setEnviandoCapa] = useState(false)
const [erroCapa, setErroCapa] = useState("")
const [enviandoImagemScorm, setEnviandoImagemScorm] = useState(false)
  const [erro, setErro] = useState("")
  const [slugTocado, setSlugTocado] = useState(curso.origem === "api" || Boolean(curso.slug))
  const [buscaCategoria, setBuscaCategoria] = useState(curso.categoria)
  const [categoriaAberta, setCategoriaAberta] = useState(false)
  const [arquivoPacote, setArquivoPacote] = useState<File | null>(null)
  const [detectandoVersao, setDetectandoVersao] = useState(false)
  const [pacoteAtual, setPacoteAtual] = useState<PacoteScormDto | null>(null)
  const [carregandoPacoteAtual, setCarregandoPacoteAtual] = useState(false)
  const [idiomaPerguntas, setIdiomaPerguntas] = useState<IdiomaConteudo>("pt-BR")
  const deteccaoAtual = useRef(0)
  useBodyScrollLock(progressoUploadScorm !== null)

  useEffect(() => {
    if (draft.tipo !== "scorm" || curso.origem !== "api" || !curso.slug) {
      setPacoteAtual(null)
      setCarregandoPacoteAtual(false)
      return
    }

    let ativo = true
    setCarregandoPacoteAtual(true)
    obterPacoteScorm(curso.slug)
      .then((pacote) => {
        if (!ativo) return
        setPacoteAtual(pacote)
        if (pacote) {
          setDraft((atual) => ({
            ...atual,
            scorm: {
              ...(atual.scorm ?? configScormPadrao(atual)),
              arquivo: pacote.nomeArquivo,
              tamanho: pacote.tamanho,
              versao: pacote.versao === "2004" ? "2004" : "1.2",
            },
          }))
        }
      })
      .catch((falha: unknown) => {
        if (ativo) setErro(falha instanceof Error ? falha.message : "Não foi possível consultar o pacote SCORM.")
      })
      .finally(() => {
        if (ativo) setCarregandoPacoteAtual(false)
      })

    return () => {
      ativo = false
    }
  }, [curso.origem, curso.slug, draft.tipo])

  useEffect(() => {
    setBuscaCategoria(curso.categoria)
  }, [curso.id, curso.categoria])

  const categoriasFiltradas = useMemo(() => {
    const consulta = normalizarBusca(buscaCategoria)
    const categorias = facetas?.categorias ?? []
    if (!consulta) return categorias

    return categorias
      .map((categoria) => {
        const nome = normalizarBusca(categoria.nome)
        const distancia = distanciaEdicao(consulta, nome)
        const similaridade = 1 - distancia / Math.max(consulta.length, nome.length)
        const corresponde = nome.includes(consulta) || similaridade >= 0.68
        return { categoria, corresponde, similaridade }
      })
      .filter((item) => item.corresponde)
      .sort((a, b) => b.similaridade - a.similaridade || a.categoria.nome.localeCompare(b.categoria.nome))
      .map((item) => item.categoria)
  }, [buscaCategoria, facetas?.categorias])

  const alterar = <C extends keyof CursoAdmin>(chave: C, valor: CursoAdmin[C]) => {
    setDraft((atual) => ({ ...atual, [chave]: valor }))
  }

  const alterarScorm = (alteracao: Partial<ScormPaginaConfig>) => {
    setDraft((atual) => ({
      ...atual,
      scorm: { ...(atual.scorm ?? configScormPadrao(atual)), ...alteracao },
    }))
  }

  const alterarModulo = (moduloId: string, alteracao: Partial<ModuloAdmin>) => {
    setDraft((atual) => ({
      ...atual,
      modulos: atual.modulos.map((modulo) => (modulo.id === moduloId ? { ...modulo, ...alteracao } : modulo)),
    }))
  }

  const alterarPerguntas = (perguntas: PerguntaAdminDto[]) => {
    setDraft((atual) => ({ ...atual, perguntas: perguntas.map((pergunta, ordem) => ({ ...pergunta, ordem })) }))
  }

  const alterarPergunta = (indice: number, alteracao: Partial<PerguntaAdminDto>) => {
    const atuais = draft.perguntas ?? []
    alterarPerguntas(atuais.map((pergunta, posicao) => (posicao === indice ? { ...pergunta, ...alteracao } : pergunta)))
  }

  const adicionarPergunta = () => {
    const atuais = draft.perguntas ?? []
    if (atuais.length >= 10) return
    alterarPerguntas([...atuais, perguntaVazia(atuais.length)])
  }

  const removerPergunta = (indice: number) => {
    const atuais = draft.perguntas ?? []
    alterarPerguntas(atuais.filter((_, posicao) => posicao !== indice))
  }

  const alternarIdiomaScorm = (idioma: IdiomaConteudo) => {
    const atuais = draft.scorm?.idiomas ?? ["pt-BR"]
    const idiomas = atuais.includes(idioma)
      ? atuais.filter((item) => item !== idioma)
      : [...atuais, idioma]
    const padrao = draft.scorm?.idiomaPadrao
    alterarScorm({
      idiomas,
      idiomaPadrao: padrao && idiomas.includes(padrao) ? padrao : idiomas[0],
    })
  }

  const alterarAula = (moduloId: string, aulaId: string, alteracao: Partial<AulaAdmin>) => {
    setDraft((atual) => ({
      ...atual,
      modulos: atual.modulos.map((modulo) =>
        modulo.id === moduloId
          ? { ...modulo, aulas: modulo.aulas.map((aula) => (aula.id === aulaId ? { ...aula, ...alteracao } : aula)) }
          : modulo,
      ),
    }))
  }

  const alterarBloco = (moduloId: string, aulaId: string, blocoId: string, alteracao: Partial<Bloco>) => {
    setDraft((atual) => ({
      ...atual,
      modulos: atual.modulos.map((modulo) =>
        modulo.id === moduloId
          ? {
              ...modulo,
              aulas: modulo.aulas.map((aula) =>
                aula.id === aulaId
                  ? { ...aula, blocos: aula.blocos.map((bloco) => (bloco.id === blocoId ? { ...bloco, ...alteracao } : bloco)) }
                  : aula,
              ),
            }
          : modulo,
      ),
    }))
  }

  const adicionarModulo = () => {
    alterar("modulos", [
      ...draft.modulos,
      { id: novoId(), titulo: `Módulo ${draft.modulos.length + 1}`, aulas: [{ id: novoId(), titulo: "Aula 1", blocos: [{ id: novoId(), tipo: "texto", conteudo: "" }] }] },
    ])
  }

  const removerModulo = (moduloId: string) => alterar("modulos", draft.modulos.filter((modulo) => modulo.id !== moduloId))

  const adicionarAula = (moduloId: string) => {
    const modulo = draft.modulos.find((item) => item.id === moduloId)
    if (!modulo) return
    alterarModulo(moduloId, {
      aulas: [...modulo.aulas, { id: novoId(), titulo: `Aula ${modulo.aulas.length + 1}`, blocos: [{ id: novoId(), tipo: "texto", conteudo: "" }] }],
    })
  }

  const removerAula = (moduloId: string, aulaId: string) => {
    const modulo = draft.modulos.find((item) => item.id === moduloId)
    if (!modulo) return
    alterarModulo(moduloId, { aulas: modulo.aulas.filter((aula) => aula.id !== aulaId) })
  }

  const adicionarBloco = (moduloId: string, aulaId: string) => {
    const modulo = draft.modulos.find((item) => item.id === moduloId)
    const aula = modulo?.aulas.find((item) => item.id === aulaId)
    if (!aula) return
    alterarAula(moduloId, aulaId, { blocos: [...aula.blocos, { id: novoId(), tipo: "texto", conteudo: "" }] })
  }

  const removerBloco = (moduloId: string, aulaId: string, blocoId: string) => {
    const modulo = draft.modulos.find((item) => item.id === moduloId)
    const aula = modulo?.aulas.find((item) => item.id === aulaId)
    if (!aula) return
    alterarAula(moduloId, aulaId, { blocos: aula.blocos.filter((bloco) => bloco.id !== blocoId) })
  }

  const aoEnviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!draft.nomeCompleto.trim() || !draft.nomeBreve.trim() || !draft.slug.trim()) {
      setErro("Preencha nome completo, nome breve e slug.")
      return
    }
    if (!draft.descricao.trim() || draft.cargaHoraria <= 0) {
      setErro("Informe a descrição e uma carga horária maior que zero.")
      return
    }
    if (draft.tipo === "scorm" && draft.scorm) {
      const configuracao = draft.scorm
      const tituloEfetivo = configuracao.titulo.trim() || draft.nomeCompleto.trim()
      if (tituloEfetivo.length > 200 || configuracao.subtitulo.length > 500 || configuracao.descricao.length > 2000) {
        setErro("O título deve ter até 200 caracteres, o subtítulo até 500 e a descrição até 2.000.")
        return
      }
      if (configuracao.bannerUrl.length > 2048 || configuracao.imagemUrl.length > 2048 || configuracao.urlLancamento.length > 2048) {
        setErro("Cada URL da página SCORM deve ter até 2.048 caracteres.")
        return
      }
      if (configuracao.botaoTexto.trim().length > 50 || (configuracao.cargaHoraria || draft.cargaHoraria) <= 0) {
        setErro("O texto do botão deve ter até 50 caracteres e a carga horária deve ser maior que zero.")
        return
      }
    }
    if (!facetas?.categorias.some((categoria) => normalizarBusca(categoria.nome) === normalizarBusca(draft.categoria))) {
      setErro("Selecione uma categoria já cadastrada.")
      return
    }
    if (draft.tipo === "scorm" && !arquivoPacote && !pacoteAtual) {
      setErro("Anexe o pacote SCORM (.zip) para continuar.")
      return
    }
    if (detectandoVersao) {
      setErro("Aguarde a identificação automática da versão do pacote SCORM.")
      return
    }
    if (
      draft.dataPublicacao &&
      draft.dataLiberacaoMatricula &&
      draft.dataLiberacaoMatricula < draft.dataPublicacao
    ) {
      setErro("A liberação de matrícula não pode anteceder a data de publicação.")
      return
    }
    setErro("")
    const slugFinal = gerarSlug(draft.slug || draft.nomeBreve)

    onSalvar({
      ...draft,
      nomeBreve: draft.nomeBreve.trim(),
      nomeCompleto: draft.nomeCompleto.trim(),
      slug: slugFinal,
      criadoEm: draft.criadoEm || new Date().toISOString(),
    }, draft.tipo === "scorm" ? arquivoPacote ?? undefined : undefined)
  }

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button type="button" onClick={onCancelar} className="text-sm font-semibold text-[var(--sesi-muted)] hover:text-[var(--sesi-black)]">
            ← Voltar para a lista
          </button>
          <h2 className="mt-2 text-2xl font-bold text-[var(--sesi-black)]">
            {curso.origem === "api" ? "Editar curso" : "Novo curso"}
          </h2>
          <p className="text-sm text-[var(--sesi-muted)]">
            {curso.origem === "api"
              ? "Os metadados, módulos e aulas são gravados na API do catálogo. Blocos e SCORM seguem demonstrativos."
              : "Preencha os metadados, monte os módulos e aulas e envie para a API do catálogo."}
          </p>
        </div>
        <button
          type="submit"
          disabled={salvando || carregandoPacoteAtual || detectandoVersao}
          className="rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar curso"}
        </button>
      </div>

      <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
        <h3 className="mb-4 text-lg font-bold text-[var(--sesi-black)]">Formato do conteúdo</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { valor: "blocos", titulo: "Curso em blocos", descricao: "Monte módulos, aulas e blocos de conteúdo, no estilo Rise." },
              { valor: "scorm", titulo: "Pacote SCORM", descricao: "Envie um .zip SCORM 1.2 ou 2004 com os metadados do curso." },
            ] as { valor: TipoCurso; titulo: string; descricao: string }[]
          ).map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => {
                alterar("tipo", opcao.valor)
                if (opcao.valor === "scorm" && !draft.scorm) alterarScorm({})
              }}
              aria-pressed={draft.tipo === opcao.valor}
              className={`rounded-[var(--radius-lg)] border p-4 text-left transition ${
                draft.tipo === opcao.valor
                  ? "border-[var(--sesi-red)] bg-[var(--sesi-red)]/5 ring-1 ring-[var(--sesi-red)]"
                  : "border-[var(--sesi-gray)] hover:border-[var(--sesi-red)]"
              }`}
            >
              <span className="block text-sm font-bold text-[var(--sesi-black)]">{opcao.titulo}</span>
              <span className="mt-1 block text-xs text-[var(--sesi-muted)]">{opcao.descricao}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
        <h3 className="mb-4 text-lg font-bold text-[var(--sesi-black)]">Metadados do curso</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo titulo="Nome completo" largura="sm:col-span-2">
            <input
              value={draft.nomeCompleto}
              onChange={(evento) => {
                const valor = evento.target.value
                setDraft((atual) => ({
                  ...atual,
                  nomeCompleto: valor,
                  nomeBreve: atual.nomeBreve || valor.split(" ").slice(0, 3).join(" "),
                  slug: slugTocado ? atual.slug : gerarSlug(valor),
                }))
              }}
              className={campo}
              required
            />
          </Campo>
          <Campo titulo="Nome breve">
            <input value={draft.nomeBreve} onChange={(evento) => alterar("nomeBreve", evento.target.value)} className={campo} required />
          </Campo>
          <Campo titulo="Slug (URL)">
            <input
              value={draft.slug}
              onChange={(evento) => {
                setSlugTocado(true)
                alterar("slug", gerarSlug(evento.target.value))
              }}
              className={campo}
              readOnly={curso.origem === "api"}
              required
            />
          </Campo>
          <div className="relative flex flex-col gap-1.5">
            <label htmlFor="categoria-curso" className={rotulo}>Categoria</label>
            <input
              id="categoria-curso"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={categoriaAberta}
              aria-controls="opcoes-categoria"
              aria-invalid={!facetas?.categorias.some((categoria) => normalizarBusca(categoria.nome) === normalizarBusca(draft.categoria))}
              autoComplete="off"
              value={buscaCategoria}
              onFocus={() => setCategoriaAberta(true)}
              onBlur={() => setCategoriaAberta(false)}
              onChange={(evento) => {
                setBuscaCategoria(evento.target.value)
                alterar("categoria", evento.target.value)
                setCategoriaAberta(true)
              }}
              className={campo}
              placeholder="Busque uma categoria cadastrada"
              required
            />
            {categoriaAberta && (
              <ul
                id="opcoes-categoria"
                role="listbox"
                className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--sesi-gray)] bg-white p-1 shadow-xl"
              >
                {categoriasFiltradas.length > 0 ? categoriasFiltradas.map((categoria) => (
                  <li key={categoria.id} role="option" aria-selected={draft.categoria === categoria.nome}>
                    <button
                      type="button"
                      onMouseDown={(evento) => evento.preventDefault()}
                      onClick={() => {
                        setBuscaCategoria(categoria.nome)
                        alterar("categoria", categoria.nome)
                        setCategoriaAberta(false)
                      }}
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#F5F5F5] focus-visible:bg-[#F5F5F5]"
                    >
                      {categoria.nome}
                    </button>
                  </li>
                )) : (
                  <li className="px-3 py-2 text-sm text-[var(--sesi-muted)]">
                    Nenhuma categoria cadastrada corresponde à busca.
                  </li>
                )}
              </ul>
            )}
            {buscaCategoria && !categoriasFiltradas.some((categoria) => normalizarBusca(categoria.nome) === normalizarBusca(draft.categoria)) && (
              <span className="text-xs text-[var(--sesi-muted)]">Selecione uma categoria existente para evitar duplicidades.</span>
            )}
          </div>
          <Campo titulo="Modalidade">
            <select value={draft.modalidade} onChange={(evento) => alterar("modalidade", evento.target.value)} className={campo} required>
              <option value="">Selecione</option>
              {facetas?.modalidades.map((modalidade) => (
                <option key={modalidade.id} value={modalidade.nome}>
                  {modalidade.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo titulo="Status">
            <select value={draft.status} onChange={(evento) => alterar("status", evento.target.value)} className={campo} required>
              <option value="">Selecione</option>
              {facetas?.status.map((status) => (
                <option key={status.id} value={status.nome}>
                  {status.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo titulo="Etapa interna do curso">
            <select
              value={draft.etapaDesenvolvimento}
              onChange={(evento) =>
                alterar("etapaDesenvolvimento", evento.target.value as CursoAdmin["etapaDesenvolvimento"])
              }
              className={campo}
              required
            >
              <option value="Rascunho">Rascunho</option>
              <option value="Homologado">Homologado</option>
              <option value="Publicado">Publicado</option>
            </select>
            <span className="text-xs text-[var(--sesi-muted)]">
              Rascunhos e cursos em homologação não aparecem no catálogo. Publicar libera a visibilidade conforme as datas.
            </span>
          </Campo>
          <Campo titulo="Carga horária (horas)">
            <input
              type="number"
              min={1}
              value={draft.cargaHoraria || ""}
              onChange={(evento) => alterar("cargaHoraria", Number(evento.target.value))}
              className={campo}
              required
            />
          </Campo>
          <Campo titulo="Público-alvo">
            <input value={draft.publicoAlvo} onChange={(evento) => alterar("publicoAlvo", evento.target.value)} className={campo} />
          </Campo>
          <Campo titulo="Data de disponibilização">
            <input
              type="date"
              value={draft.dataDisponibilizacao ?? ""}
              onChange={(evento) => alterar("dataDisponibilizacao", evento.target.value)}
              className={campo}
            />
          </Campo>
          <Campo titulo="Data de publicação">
            <input
              type="date"
              value={draft.dataPublicacao ?? ""}
              onChange={(evento) => alterar("dataPublicacao", evento.target.value)}
              className={campo}
            />
          </Campo>
          <Campo titulo="Liberação das matrículas">
            <input
              type="date"
              value={draft.dataLiberacaoMatricula ?? ""}
              onChange={(evento) => alterar("dataLiberacaoMatricula", evento.target.value)}
              className={campo}
            />
          </Campo>
          <Campo titulo="URL da capa">
            <div className="flex flex-col gap-2">
              <input
                value={draft.imagemUrl}
                onChange={(evento) => alterar("imagemUrl", evento.target.value)}
                placeholder="/cursos/exemplo.svg ou https://..."
                className={campo}
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--sesi-muted)]">
                <span className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white px-3 py-2 text-xs font-semibold text-[var(--sesi-black)] transition hover:border-[var(--sesi-red)]">
                  {enviandoCapa ? "Enviando..." : "Subir do computador"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={enviandoCapa}
                  className="sr-only"
                  onChange={async (evento) => {
                    const arquivo = evento.target.files?.[0]
                    if (!arquivo) return
                    setEnviandoCapa(true)
                    setErroCapa("")
                    try {
                      const url = await enviarImagem(arquivo)
                      alterar("imagemUrl", url)
                    } catch (falha) {
                      setErroCapa(falha instanceof Error ? falha.message : "Falha ao enviar a imagem.")
                    } finally {
                      setEnviandoCapa(false)
                      evento.target.value = ""
                    }
                  }}
                />
              </label>
              {erroCapa && <p role="alert" className="text-xs text-[var(--sesi-red)]">{erroCapa}</p>}
              <p className="text-xs text-[var(--sesi-muted)]">
                Ou cole uma URL (Unsplash etc.). Limite de 5 MB por arquivo.
              </p>
            </div>
          </Campo>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={draft.destaque}
                onChange={(evento) => alterar("destaque", evento.target.checked)}
                className="h-4 w-4 accent-[var(--sesi-red)]"
              />
              Exibir como destaque na home
            </label>
          </div>
          <Campo titulo="Descrição" largura="sm:col-span-2">
            <textarea value={draft.descricao} onChange={(evento) => alterar("descricao", evento.target.value)} rows={4} className={campo} required />
          </Campo>
          {draft.imagemUrl && (
            <div className="sm:col-span-2">
              <p className={rotulo}>Prévia da capa</p>
              <img src={draft.imagemUrl} alt="" className="mt-2 h-32 w-full max-w-sm rounded-[var(--radius-lg)] object-cover" />
            </div>
          )}
        </div>
      </section>

      {draft.tipo === "blocos" ? (
        <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[var(--sesi-black)]">Módulos, aulas e blocos</h3>
              <p className="text-xs text-[var(--sesi-muted)]">Organize o conteúdo como em um curso do Articulate Rise.</p>
            </div>
            <button
              type="button"
              onClick={adicionarModulo}
              className="rounded-[var(--radius-lg)] border border-[var(--sesi-black)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--sesi-black)] hover:text-white"
            >
              + Módulo
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {draft.modulos.map((modulo, indiceModulo) => (
              <div key={modulo.id} className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-[#F5F5F5] p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--sesi-black)] text-xs font-bold text-white">
                    {indiceModulo + 1}
                  </span>
                  <input
                    value={modulo.titulo}
                    onChange={(evento) => alterarModulo(modulo.id, { titulo: evento.target.value })}
                    aria-label={`Título do módulo ${indiceModulo + 1}`}
                    className={campo}
                  />
                  <button
                    type="button"
                    onClick={() => removerModulo(modulo.id)}
                    className="shrink-0 text-sm font-semibold text-[var(--sesi-red)] hover:underline"
                  >
                    Remover
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-3 pl-0 sm:pl-11">
                  {modulo.aulas.map((aula, indiceAula) => (
                    <div key={aula.id} className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-3">
                      <div className="flex items-center gap-3">
                        <span className="whitespace-nowrap text-xs font-bold text-[var(--sesi-muted)]">Aula {indiceAula + 1}</span>
                        <input
                          value={aula.titulo}
                          onChange={(evento) => alterarAula(modulo.id, aula.id, { titulo: evento.target.value })}
                          aria-label={`Título da aula ${indiceAula + 1}`}
                          className={campo}
                        />
                        <button
                          type="button"
                          onClick={() => removerAula(modulo.id, aula.id)}
                          className="shrink-0 text-xs font-semibold text-[var(--sesi-red)] hover:underline"
                        >
                          Remover
                        </button>
                      </div>

                      <div className="mt-3 flex flex-col gap-2">
                        {aula.blocos.map((bloco) => (
                          <div key={bloco.id} className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--sesi-gray)] p-2 sm:flex-row sm:items-start">
                            <select
                              value={bloco.tipo}
                              onChange={(evento) => alterarBloco(modulo.id, aula.id, bloco.id, { tipo: evento.target.value as TipoBloco })}
                              aria-label="Tipo do bloco"
                              className={`${campo} sm:w-40`}
                            >
                              {TIPOS_BLOCO.map((tipo) => (
                                <option key={tipo.valor} value={tipo.valor}>
                                  {tipo.nome}
                                </option>
                              ))}
                            </select>
                            <textarea
                              value={bloco.conteudo}
                              onChange={(evento) => alterarBloco(modulo.id, aula.id, bloco.id, { conteudo: evento.target.value })}
                              rows={2}
                              placeholder={bloco.tipo === "texto" ? "Escreva o conteúdo..." : "Cole a URL ou o enunciado..."}
                              aria-label="Conteúdo do bloco"
                              className={campo}
                            />
                            <button
                              type="button"
                              onClick={() => removerBloco(modulo.id, aula.id, bloco.id)}
                              aria-label="Remover bloco"
                              className="shrink-0 px-2 text-sm font-bold text-[var(--sesi-red)]"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => adicionarBloco(modulo.id, aula.id)}
                          className="w-fit text-xs font-semibold text-[var(--sesi-black)] underline-offset-4 hover:underline"
                        >
                          + Adicionar bloco
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => adicionarAula(modulo.id)}
                    className="w-fit rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white px-3 py-1.5 text-xs font-semibold transition hover:border-[var(--sesi-black)]"
                  >
                    + Aula
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
          <h3 className="text-lg font-bold text-[var(--sesi-black)]">Pacote SCORM</h3>
          <p className="mb-4 text-xs text-[var(--sesi-muted)]">
            Envie um .zip SCORM 1.2 ou 2004. O limite atual é {limitePacoteMb} MB. Cada curso mantém um pacote ativo; o pacote publicado só é substituído depois que o novo arquivo for validado.
          </p>
          {carregandoPacoteAtual ? (
            <p className="mb-4 text-sm text-[var(--sesi-muted)]">Consultando pacote publicado...</p>
          ) : pacoteAtual ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-[#F5F5F5] p-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sesi-muted)]">Pacote ativo</p>
                <p className="truncate text-sm font-semibold text-[var(--sesi-black)]">{pacoteAtual.nomeArquivo}</p>
                <p className="text-xs text-[var(--sesi-muted)]">
                  {(pacoteAtual.tamanho / (1024 * 1024)).toFixed(1)} MB · SCORM {pacoteAtual.versao}
                </p>
              </div>
              <a
                href={urlDownloadScorm(pacoteAtual)}
                download={pacoteAtual.nomeArquivo}
                className="rounded-[var(--radius-lg)] border border-[var(--sesi-black)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--sesi-black)] hover:text-white"
              >
                Baixar pacote
              </a>
            </div>
          ) : (
            <p className="mb-4 rounded-[var(--radius-lg)] bg-[#F5F5F5] px-4 py-3 text-sm text-[var(--sesi-muted)]">
              Ainda não há pacote publicado para este curso.
            </p>
          )}
          <input
            type="file"
            accept=".zip,application/zip"
            disabled={detectandoVersao || salvando}
            onChange={async (evento) => {
              const arquivo = evento.target.files?.[0]
              if (!arquivo) return
              if (arquivo.size > limitePacoteMb * 1024 * 1024) {
                setErro(`O arquivo excede o limite atual de ${limitePacoteMb} MB.`)
                evento.target.value = ""
                setArquivoPacote(null)
                return
              }
              const idDeteccao = deteccaoAtual.current + 1
              deteccaoAtual.current = idDeteccao
              setErro("")
              setArquivoPacote(arquivo)
              setDetectandoVersao(true)
              try {
                const versao = await detectarVersaoScorm(arquivo)
                if (deteccaoAtual.current !== idDeteccao) return
                alterarScorm({ arquivo: arquivo.name, tamanho: arquivo.size, versao })
              } catch (falha) {
                if (deteccaoAtual.current !== idDeteccao) return
                setArquivoPacote(null)
                evento.target.value = ""
                setErro(falha instanceof Error ? falha.message : "Não foi possível identificar a versão do pacote SCORM.")
              } finally {
                if (deteccaoAtual.current === idDeteccao) setDetectandoVersao(false)
              }
            }}
            aria-label="Arquivo SCORM"
            className="block w-full cursor-pointer rounded-[var(--radius-lg)] border border-dashed border-[var(--sesi-gray)] p-4 text-sm file:mr-4 file:rounded-[var(--radius-lg)] file:border-0 file:bg-[var(--sesi-black)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          {detectandoVersao && (
            <p className="mt-2 text-xs font-medium text-[var(--sesi-muted)]" role="status">
              Lendo o manifesto do pacote para identificar a versão...
            </p>
          )}
          {arquivoPacote && !detectandoVersao && (
            <p className="mt-2 text-xs font-semibold text-[var(--sesi-black)]">
              Versão identificada automaticamente: SCORM {draft.scorm?.versao}
            </p>
          )}
          {arquivoPacote && (
            <p className="mt-2 text-xs font-semibold text-[var(--sesi-black)]">
              {pacoteAtual ? "Será publicado como substituição após a validação: " : "Pronto para enviar: "}
              {arquivoPacote.name} · {(arquivoPacote.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          )}
          {progressoUploadScorm !== null && (
            <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/60 p-4" role="presentation">
              <div
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="upload-scorm-titulo"
                aria-describedby="upload-scorm-descricao"
                aria-live="polite"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--sesi-gray)] border-t-[var(--sesi-red)]" aria-hidden="true" />
                  <h3 id="upload-scorm-titulo" className="text-lg font-bold text-[var(--sesi-black)]">
                    {progressoUploadScorm < 100 ? "Enviando pacote SCORM" : "Validando pacote SCORM"}
                  </h3>
                </div>
                <p id="upload-scorm-descricao" className="mb-4 text-sm text-[var(--sesi-muted)]">
                  {progressoUploadScorm < 100
                    ? "Aguarde enquanto o pacote é enviado. Não feche esta janela."
                    : "Upload concluído. O pacote está sendo processado e validado."}
                </p>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-[var(--sesi-black)]">Progresso do upload</span>
                  <span className="font-bold tabular-nums text-[var(--sesi-red)]">{progressoUploadScorm}%</span>
                </div>
                <div
                  className="h-3 overflow-hidden rounded-full bg-[#F1F1F1]"
                  role="progressbar"
                  aria-label="Progresso do upload do pacote SCORM"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressoUploadScorm}
                >
                  <div
                    className="h-full rounded-full bg-[var(--sesi-red)] transition-[width] duration-200"
                    style={{ width: `${progressoUploadScorm}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Campo titulo="Versão do SCORM">
              <div className={`${campo} flex items-center bg-[#F5F5F5]`} aria-live="polite">
                {pacoteAtual && !arquivoPacote
                  ? `SCORM ${pacoteAtual.versao}`
                  : arquivoPacote && !detectandoVersao
                    ? `SCORM ${draft.scorm?.versao}`
                    : detectandoVersao
                      ? "Identificando versão..."
                      : "A versão será identificada pelo manifesto do pacote"}
              </div>
            </Campo>
            {draft.scorm && (
              <div className="flex flex-col justify-end rounded-[var(--radius-lg)] bg-[#F5F5F5] px-4 py-2 text-sm">
                <span className="font-semibold text-[var(--sesi-black)]">{pacoteAtual?.nomeArquivo ?? draft.scorm.arquivo}</span>
                <span className="text-xs text-[var(--sesi-muted)]">
                  {pacoteAtual
                    ? `${(pacoteAtual.tamanho / (1024 * 1024)).toFixed(1)} MB`
                    : `${(draft.scorm.tamanho / 1024).toFixed(1)} KB`}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      <section data-config-scorm className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[var(--sesi-black)]">Página do curso SCORM</h3>
            <p className="mt-1 max-w-2xl text-xs text-[var(--sesi-muted)]">
              Configure os textos e as imagens da página pública. As alterações são persistidas pela API e compartilhadas entre os visitantes.
            </p>
          </div>
          {draft.slug && (
            <a
              href={`/curso/${draft.slug}/scorm`}
              target="_blank"
              rel="noreferrer"
              className="rounded-[var(--radius-lg)] border border-[var(--sesi-black)] px-4 py-2 text-xs font-semibold transition hover:bg-[var(--sesi-black)] hover:text-white"
            >
              Abrir página SCORM ↗
            </a>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo titulo="Título da página">
            <input
              value={draft.scorm?.titulo ?? ""}
              onChange={(evento) => alterarScorm({ titulo: evento.target.value })}
              placeholder={draft.nomeCompleto || "Nome do curso"}
              maxLength={200}
              className={campo}
            />
          </Campo>
          <Campo titulo="Subtítulo">
            <input
              value={draft.scorm?.subtitulo ?? ""}
              onChange={(evento) => alterarScorm({ subtitulo: evento.target.value })}
              placeholder="Categoria · modalidade · curso autoinstrucional"
              maxLength={500}
              className={campo}
            />
          </Campo>
          <Campo titulo="URL do banner">
            <input
              value={draft.scorm?.bannerUrl ?? ""}
              onChange={(evento) => alterarScorm({ bannerUrl: evento.target.value })}
              placeholder="vazio usa o banner padrão"
              maxLength={2048}
              className={campo}
            />
          </Campo>
          <Campo titulo="URL da imagem do curso">
            <div className="flex flex-col gap-2">
              <input
                value={draft.scorm?.imagemUrl ?? ""}
                onChange={(evento) => alterarScorm({ imagemUrl: evento.target.value })}
                placeholder={draft.imagemUrl || "/cursos/exemplo.webp"}
                maxLength={2048}
                className={campo}
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--sesi-muted)]">
                <span className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white px-3 py-2 text-xs font-semibold text-[var(--sesi-black)] transition hover:border-[var(--sesi-red)]">
                  {enviandoImagemScorm ? "Enviando..." : "Subir do computador"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={enviandoImagemScorm}
                  className="sr-only"
                  onChange={async (evento) => {
                    const arquivo = evento.target.files?.[0]
                    if (!arquivo) return
                    setEnviandoImagemScorm(true)
                    try {
                      const url = await enviarImagem(arquivo)
                      alterarScorm({ imagemUrl: url })
                    } catch (falha) {
                      // eslint-disable-next-line no-alert
                      window.alert(falha instanceof Error ? falha.message : "Falha ao enviar a imagem.")
                    } finally {
                      setEnviandoImagemScorm(false)
                      evento.target.value = ""
                    }
                  }}
                />
              </label>
            </div>
          </Campo>
          <Campo titulo="Carga horária da página (horas)">
            <input
              type="number"
              min={1}
              value={draft.scorm?.cargaHoraria || ""}
              onChange={(evento) => alterarScorm({ cargaHoraria: Number(evento.target.value) })}
              placeholder={String(draft.cargaHoraria || "")}
              required
              className={campo}
            />
          </Campo>
          <Campo titulo="Texto do botão">
            <input
              value={draft.scorm?.botaoTexto ?? ""}
              onChange={(evento) => alterarScorm({ botaoTexto: evento.target.value })}
              placeholder="Iniciar curso"
              maxLength={50}
              className={campo}
            />
          </Campo>
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--sesi-gray)] p-4 sm:col-span-2">
            <p className={rotulo}>Idiomas disponíveis no pacote SCORM</p>
            <p className="mt-1 text-xs text-[var(--sesi-muted)]">
              Marque os idiomas em que o conteúdo está traduzido. Quando o visitante escolher um idioma não marcado,
              a página SCORM exibe um alerta acima do conteúdo.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {IDIOMAS_CONTEUDO.map((idioma) => {
                const marcado = (draft.scorm?.idiomas ?? ["pt-BR"]).includes(idioma.codigo)
                return (
                  <button
                    key={idioma.codigo}
                    type="button"
                    aria-pressed={marcado}
                    onClick={() => alternarIdiomaScorm(idioma.codigo)}
                    className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-semibold transition ${
                      marcado
                        ? "border-[var(--sesi-red)] bg-[var(--sesi-red)]/10 text-[var(--sesi-black)]"
                        : "border-[var(--sesi-gray)] bg-white text-[var(--sesi-muted)] hover:border-[var(--sesi-black)]"
                    }`}
                  >
                    <span aria-hidden="true" className="text-base">{idioma.bandeira}</span>
                    {idioma.nome}
                    <span aria-hidden="true">{marcado ? "✓" : "+"}</span>
                  </button>
                )
              })}
            </div>
            <label className="mt-4 flex flex-col gap-1.5">
              <span className={rotulo}>Idioma padrão (usado quando falta tradução)</span>
              <select
                value={draft.scorm?.idiomaPadrao ?? "pt-BR"}
                onChange={(evento) => alterarScorm({ idiomaPadrao: evento.target.value })}
                className={campo}
              >
                {IDIOMAS_CONTEUDO.filter((idioma) => (draft.scorm?.idiomas ?? ["pt-BR"]).includes(idioma.codigo)).map((idioma) => (
                  <option key={idioma.codigo} value={idioma.codigo}>
                    {idioma.bandeira} {idioma.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Campo titulo="URL de lançamento do pacote" largura="sm:col-span-2">
            <input
              value={draft.scorm?.urlLancamento ?? ""}
              onChange={(evento) => alterarScorm({ urlLancamento: evento.target.value })}
              placeholder="https://... (vazio mostra o player demonstrativo)"
              maxLength={2048}
              className={campo}
            />
          </Campo>
          <Campo titulo="Descrição da página" largura="sm:col-span-2">
            <textarea
              value={draft.scorm?.descricao ?? ""}
              onChange={(evento) => alterarScorm({ descricao: evento.target.value })}
              rows={3}
              placeholder={draft.descricao || "Descrição exibida em “Sobre o curso”"}
              maxLength={2000}
              className={campo}
            />
          </Campo>
        </div>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[var(--sesi-black)]">Perguntas frequentes (3 idiomas)</h3>
            <p className="mt-1 max-w-2xl text-xs text-[var(--sesi-muted)]">
              Até 10 perguntas por curso. Cada idioma tem seu próprio texto; o que ficar vazio cai no idioma padrão
              na página pública.
            </p>
          </div>
          <button
            type="button"
            onClick={adicionarPergunta}
            disabled={(draft.perguntas?.length ?? 0) >= 10}
            className="rounded-[var(--radius-lg)] border border-[var(--sesi-black)] px-4 py-2 text-xs font-semibold transition hover:bg-[var(--sesi-black)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Adicionar pergunta
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Idioma das perguntas">
          {IDIOMAS_CONTEUDO.map((idioma) => (
            <button
              key={idioma.codigo}
              type="button"
              role="tab"
              aria-selected={idiomaPerguntas === idioma.codigo}
              onClick={() => setIdiomaPerguntas(idioma.codigo)}
              className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-semibold transition ${
                idiomaPerguntas === idioma.codigo
                  ? "border-[var(--sesi-black)] bg-[var(--sesi-black)] text-white"
                  : "border-[var(--sesi-gray)] bg-white text-[var(--sesi-muted)] hover:border-[var(--sesi-black)]"
              }`}
            >
              <span aria-hidden="true" className="text-base">{idioma.bandeira}</span>
              {idioma.nome}
            </button>
          ))}
        </div>

        {(draft.perguntas?.length ?? 0) === 0 ? (
          <p className="rounded-[var(--radius-lg)] bg-[#F5F5F5] px-4 py-3 text-sm text-[var(--sesi-muted)]">
            Nenhuma pergunta cadastrada. Use “Adicionar pergunta” para incluir as dúvidas básicas do curso.
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {(draft.perguntas ?? []).map((pergunta, indice) => {
              const campos = CAMPOS_PERGUNTA[idiomaPerguntas]
              return (
                <li key={`${pergunta.id}-${indice}`} className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--sesi-muted)]">
                      Pergunta {indice + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--sesi-muted)]">
                        <input
                          type="checkbox"
                          checked={pergunta.ativa}
                          onChange={(evento) => alterarPergunta(indice, { ativa: evento.target.checked })}
                        />
                        Ativa
                      </label>
                      <button
                        type="button"
                        onClick={() => removerPergunta(indice)}
                        className="text-xs font-semibold text-[var(--sesi-red)] hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <Campo titulo="Pergunta">
                      <input
                        value={String(pergunta[campos.pergunta] ?? "")}
                        onChange={(evento) => alterarPergunta(indice, { [campos.pergunta]: evento.target.value } as Partial<PerguntaAdminDto>)}
                        maxLength={300}
                        className={campo}
                      />
                    </Campo>
                    <Campo titulo="Resposta">
                      <textarea
                        value={String(pergunta[campos.resposta] ?? "")}
                        onChange={(evento) => alterarPergunta(indice, { [campos.resposta]: evento.target.value } as Partial<PerguntaAdminDto>)}
                        rows={3}
                        maxLength={2000}
                        className={campo}
                      />
                    </Campo>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {erro && (
        <p role="alert" className="rounded-[var(--radius-lg)] bg-[var(--sesi-red)]/10 px-4 py-3 text-sm font-semibold text-[var(--sesi-red)]">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-[var(--radius-lg)] border border-[var(--sesi-black)] px-6 py-2.5 text-sm font-semibold transition hover:bg-[var(--sesi-black)] hover:text-white"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando || detectandoVersao}
          className="rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar curso"}
        </button>
      </div>
    </form>
  )
}
