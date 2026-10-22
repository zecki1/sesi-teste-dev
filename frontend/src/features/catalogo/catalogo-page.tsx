import { useState } from "react"
import { Link } from "react-router-dom"
import { MainLayout } from "@/components/layout/main-layout"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { useCursos, useFacetas } from "@/hooks/use-catalogo"

export function CatalogoPage() {
  const [busca, setBusca] = useState("")
  const [categoria, setCategoria] = useState("")
  const [modalidade, setModalidade] = useState("")
  const [status, setStatus] = useState("")
  const [pagina, setPagina] = useState(1)

  const { data: facetas } = useFacetas()
  const { data, isLoading, isError } = useCursos({ busca: busca || undefined, categoria: categoria || undefined, modalidade: modalidade || undefined, status: status || undefined, pagina })

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
          <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] p-4 shadow-[var(--shadow-card)] md:flex-row md:flex-wrap md:items-end">
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

          <div className="flex items-center justify-between">
            <p className="text-[var(--sesi-muted)]">{isLoading ? "Carregando..." : data ? `${data.total} resultado(s) encontrado(s)` : "0 resultado(s)"}</p>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <p className="text-[var(--sesi-muted)]">Carregando cursos...</p>
            </div>
          )}
          {isError && (
            <div className="flex items-center justify-center py-12">
              <p className="text-red-600">Erro ao carregar cursos. Verifique a conexão com a API.</p>
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
            {data.itens.map((curso) => (
              <Link key={curso.slug} to={`/curso/${curso.slug}`} className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--sesi-gray)] shadow-[var(--shadow-card)] transition-shadow hover:shadow-md">
                <div className="h-48 bg-[linear-gradient(135deg,var(--sesi-red)_0%,#7f1d1d_100%)]" />
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-fit rounded-[var(--radius-pill)] bg-[var(--sesi-beige)] px-3 py-1 text-sm">{curso.categoria.nome}</span>
                    <span className="w-fit rounded-[var(--radius-pill)] border border-[var(--sesi-gray)] px-3 py-1 text-sm">{curso.modalidade.nome}</span>
                    <span className="w-fit rounded-[var(--radius-pill)] border border-[var(--sesi-gray)] px-3 py-1 text-sm">{curso.status.nome}</span>
                  </div>
                  <h3 className="text-xl font-semibold">{curso.nomeCompleto}</h3>
                  <p className="line-clamp-3 text-[var(--sesi-muted)]">{curso.descricao}</p>
                  <div className="mt-auto flex items-center justify-between text-sm text-[var(--sesi-muted)]">
                    <span>Carga horária: {curso.cargaHoraria}h</span>
                    <span>Público-alvo: {curso.publicoAlvo.split(' ')[0]}...</span>
                  </div>
                </div>
              </Link>
            ))}
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
