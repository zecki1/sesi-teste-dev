import { FormEvent, useEffect, useState, type ReactNode } from "react"
import type { FacetasDto } from "@/lib/api/catalogo"
import { configScormPadrao, type ScormPaginaConfig } from "@/features/scorm/scorm-config"
import { obterPacoteScorm, urlDownloadScorm, type PacoteScormDto } from "@/features/scorm/scorm-api"
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
  const [erro, setErro] = useState("")
  const [slugTocado, setSlugTocado] = useState(curso.origem === "api" || Boolean(curso.slug))
  const [arquivoPacote, setArquivoPacote] = useState<File | null>(null)
  const [pacoteAtual, setPacoteAtual] = useState<PacoteScormDto | null>(null)
  const [carregandoPacoteAtual, setCarregandoPacoteAtual] = useState(false)

  useEffect(() => {
    if (draft.tipo !== "scorm" || !draft.slug) {
      setPacoteAtual(null)
      return
    }

    let ativo = true
    setCarregandoPacoteAtual(true)
    obterPacoteScorm(draft.slug)
      .then((pacote) => {
        if (ativo) setPacoteAtual(pacote)
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
  }, [draft.tipo, draft.slug])

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
    if (draft.tipo === "scorm" && !arquivoPacote && !pacoteAtual) {
      setErro("Anexe o pacote SCORM (.zip) para continuar.")
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
          disabled={salvando || carregandoPacoteAtual}
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
          <Campo titulo="Categoria">
            <select value={draft.categoria} onChange={(evento) => alterar("categoria", evento.target.value)} className={campo} required>
              <option value="">Selecione</option>
              {facetas?.categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.nome}>
                  {categoria.nome}
                </option>
              ))}
            </select>
          </Campo>
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
            <input
              value={draft.imagemUrl}
              onChange={(evento) => alterar("imagemUrl", evento.target.value)}
              placeholder="/cursos/exemplo.svg"
              className={campo}
            />
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
            onChange={(evento) => {
              const arquivo = evento.target.files?.[0]
              if (!arquivo) return
              if (arquivo.size > limitePacoteMb * 1024 * 1024) {
                setErro(`O arquivo excede o limite atual de ${limitePacoteMb} MB.`)
                evento.target.value = ""
                setArquivoPacote(null)
                return
              }
              setErro("")
              setArquivoPacote(arquivo)
              alterarScorm({ arquivo: arquivo.name, tamanho: arquivo.size, versao: draft.scorm?.versao ?? "1.2" })
            }}
            aria-label="Arquivo SCORM"
            className="block w-full cursor-pointer rounded-[var(--radius-lg)] border border-dashed border-[var(--sesi-gray)] p-4 text-sm file:mr-4 file:rounded-[var(--radius-lg)] file:border-0 file:bg-[var(--sesi-black)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          {arquivoPacote && (
            <p className="mt-2 text-xs font-semibold text-[var(--sesi-black)]">
              {pacoteAtual ? "Será publicado como substituição após a validação: " : "Pronto para enviar: "}
              {arquivoPacote.name} · {(arquivoPacote.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          )}
          {progressoUploadScorm !== null && (
            <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-4" role="status" aria-live="polite">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-[var(--sesi-black)]">
                  {progressoUploadScorm < 100 ? "Fazendo upload do pacote SCORM" : "Upload concluído. Processando pacote..."}
                </span>
                <span className="font-bold tabular-nums text-[var(--sesi-red)]">{progressoUploadScorm}%</span>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-[#F1F1F1]"
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
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Campo titulo="Versão do SCORM">
              <select
                value={draft.scorm?.versao ?? "1.2"}
                onChange={(evento) => alterarScorm({ versao: evento.target.value as "1.2" | "2004" })}
                className={campo}
              >
                <option value="1.2">SCORM 1.2</option>
                <option value="2004">SCORM 2004</option>
              </select>
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
              className={campo}
            />
          </Campo>
          <Campo titulo="Subtítulo">
            <input
              value={draft.scorm?.subtitulo ?? ""}
              onChange={(evento) => alterarScorm({ subtitulo: evento.target.value })}
              placeholder="Categoria · modalidade · curso autoinstrucional"
              className={campo}
            />
          </Campo>
          <Campo titulo="URL do banner">
            <input
              value={draft.scorm?.bannerUrl ?? ""}
              onChange={(evento) => alterarScorm({ bannerUrl: evento.target.value })}
              placeholder="vazio usa o banner padrão"
              className={campo}
            />
          </Campo>
          <Campo titulo="URL da imagem do curso">
            <input
              value={draft.scorm?.imagemUrl ?? ""}
              onChange={(evento) => alterarScorm({ imagemUrl: evento.target.value })}
              placeholder={draft.imagemUrl || "/cursos/exemplo.webp"}
              className={campo}
            />
          </Campo>
          <Campo titulo="Carga horária da página (horas)">
            <input
              type="number"
              min={1}
              value={draft.scorm?.cargaHoraria || ""}
              onChange={(evento) => alterarScorm({ cargaHoraria: Number(evento.target.value) })}
              placeholder={String(draft.cargaHoraria || "")}
              className={campo}
            />
          </Campo>
          <Campo titulo="Texto do botão">
            <input
              value={draft.scorm?.botaoTexto ?? ""}
              onChange={(evento) => alterarScorm({ botaoTexto: evento.target.value })}
              placeholder="Iniciar curso"
              className={campo}
            />
          </Campo>
          <Campo titulo="URL de lançamento do pacote" largura="sm:col-span-2">
            <input
              value={draft.scorm?.urlLancamento ?? ""}
              onChange={(evento) => alterarScorm({ urlLancamento: evento.target.value })}
              placeholder="https://... (vazio mostra o player demonstrativo)"
              className={campo}
            />
          </Campo>
          <Campo titulo="Descrição da página" largura="sm:col-span-2">
            <textarea
              value={draft.scorm?.descricao ?? ""}
              onChange={(evento) => alterarScorm({ descricao: evento.target.value })}
              rows={3}
              placeholder={draft.descricao || "Descrição exibida em “Sobre o curso”"}
              className={campo}
            />
          </Campo>
        </div>
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
          disabled={salvando}
          className="rounded-[var(--radius-lg)] bg-[var(--sesi-red)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--sesi-red-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar curso"}
        </button>
      </div>
    </form>
  )
}
