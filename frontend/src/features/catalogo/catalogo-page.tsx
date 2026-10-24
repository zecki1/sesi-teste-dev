import { useState } from "react"
import { Link } from "react-router-dom"
import { MainLayout } from "@/components/layout/main-layout"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCursos, useFacetas } from "@/hooks/use-catalogo"
import { IconeCategoria, estiloBadgeCategoria } from "@/lib/ui/icones-categoria"
import { imagemDoCurso } from "@/lib/ui/imagens-cursos"

export function CatalogoPage() {
  const [busca, setBusca] = useState("")
  const [categoria, setCategoria] = useState("")
  const [modalidade, setModalidade] = useState("")
  const [status, setStatus] = useState("")
  const [pagina, setPagina] = useState(1)

  const { data: facetas } = useFacetas()
  const { data, isLoading, isError } = useCursos({
    busca: busca || undefined,
    categoria: categoria || undefined,
    modalidade: modalidade || undefined,
    status: status || undefined,
    ordenar: "recentes",
    pagina,
    tamanho: 48,
  })

  const temFiltros = busca || categoria || modalidade || status

  const limparFiltros = () => {
    setBusca("")
    setCategoria("")
    setModalidade("")
    setStatus("")
    setPagina(1)
  }

  return (
    <MainLayout>
      <section className="bg-[var(--sesi-red)] py-12 text-white">
        <Container>
          <h1 className="font-['Open_Sans_Condensed',sans-serif] text-4xl font-bold sm:text-5xl">Catálogo de Cursos</h1>
          <p className="mt-2 text-lg">Consulte, pesquise e filtre os cursos disponíveis</p>
        </Container>
      </section>

      <section className="py-10">
        <Container className="flex flex-col gap-8">
          <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] p-4 md:flex-row md:flex-wrap md:items-end">
            <div className="flex min-w-[240px] flex-1 flex-col gap-2">
              <label htmlFor="busca" className="text-sm font-semibold">Pesquisar pelo nome</label>
              <input id="busca" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1) }} placeholder="Digite o nome do curso" className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] px-4 py-2" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="categoria" className="text-sm font-semibold">Categoria</label>
              <select id="categoria" value={categoria} onChange={(e) => { setCategoria(e.target.value); setPagina(1) }} className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] px-4 py-2">
                <option value="">Todas</option>
                {facetas?.categorias.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="modalidade" className="text-sm font-semibold">Modalidade</label>
              <select id="modalidade" value={modalidade} onChange={(e) => { setModalidade(e.target.value); setPagina(1) }} className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] px-4 py-2">
                <option value="">Todas</option>
                {facetas?.modalidades.map((m) => <option key={m.slug} value={m.slug}>{m.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="status" className="text-sm font-semibold">Status</label>
              <select id="status" value={status} onChange={(e) => { setStatus(e.target.value); setPagina(1) }} className="rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] px-4 py-2">
                <option value="">Todos</option>
                {facetas?.status.map((s) => <option key={s.slug} value={s.slug}>{s.nome}</option>)}
              </select>
            </div>
            {temFiltros && (
              <Button variant="secondary" onClick={limparFiltros} className="border-[var(--sesi-black)]">Limpar filtros</Button>
            )}
          </div>

          {(isLoading || !data) && (
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
            </div>
          )}
          {!isLoading && data && (
            <div className="flex items-center justify-between">
              <p className="text-[var(--sesi-muted)]">{`${data.total} resultado(s) encontrado(s)`}</p>
            </div>
          )}

          {isLoading && (
            <div
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              aria-label="Carregando cursos"
              aria-busy="true"
              role="status"
            >
              {Array.from({ length: 6 }, (_, indice) => (
                <div
                  key={indice}
                  className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] bg-white p-6"
                >
                  <Skeleton className="h-7 w-28 rounded-full" />
                  <div className="flex flex-col gap-3">
                    <Skeleton className="h-7 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="mt-2 h-3 w-1/3" />
                  </div>
                </div>
              ))}
              <span className="sr-only">Carregando cursos...</span>
            </div>
          )}
          {isError && (
            <div className="flex items-center justify-center py-12">
              <p className="text-red-600">Erro ao carregar cursos. Verifique se a API está em execução e acessível.</p>
            </div>
          )}

          {!isLoading && !isError && data && data.itens.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <p className="text-xl font-semibold">Nenhum curso encontrado</p>
              <p className="text-[var(--sesi-muted)]">Tente ajustar os filtros ou limpar a pesquisa.</p>
              {temFiltros && <Button variant="primary" onClick={limparFiltros}>Limpar filtros</Button>}
            </div>
          )}

          {!isLoading && !isError && data && data.itens.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.itens.map((curso) => {
              return (
                <Link
                  key={curso.slug}
                  to={`/curso/${curso.slug}`}
                  className="group relative flex aspect-[4/5] flex-col overflow-hidden rounded-[var(--radius-lg)] bg-[var(--sesi-black)] "
                >
                  <img
                    data-capa
                    src={imagemDoCurso(curso)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-[linear-gradient(to_top,var(--sesi-red)_0%,rgba(227,5,19,0.9)_30%,rgba(227,5,19,0.45)_62%,rgba(227,5,19,0)_88%)]"
                  />
                  <div className="relative z-10 flex h-full flex-col justify-between gap-6 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span
                        style={estiloBadgeCategoria(curso.categoria.cor)}
                        className="flex w-fit items-center gap-2 rounded px-3 py-1 text-sm font-semibold uppercase tracking-wide"
                      >
                        <IconeCategoria slug={curso.categoria.slug} className="h-4 w-4 shrink-0" />
                        {curso.categoria.nome}
                      </span>
                      <span className="w-fit rounded-[var(--radius-pill)] bg-[var(--sesi-black)]/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                        {curso.status.nome}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 text-white">
                      <h3 className="line-clamp-3 font-['Open_Sans_Condensed',sans-serif] text-2xl font-bold leading-tight">
                        {curso.nomeCompleto}
                      </h3>
                      <p className="line-clamp-2 text-sm">{curso.descricao}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide">
                        {curso.cargaHoraria}h · {curso.modalidade.nome}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
          )}

          {data && data.total > data.tamanho && (
            <div className="flex items-center justify-center gap-4">
              <Button variant="secondary" disabled={pagina === 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>Anterior</Button>
              <span>Página {pagina}</span>
              <Button variant="secondary" disabled={pagina * data.tamanho >= data.total} onClick={() => setPagina((p) => p + 1)}>Próxima</Button>
            </div>
          )}
        </Container>
      </section>
    </MainLayout>
  )
}
