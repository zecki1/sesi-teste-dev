import { Routes as RouterRoutes, Route } from 'react-router-dom'
import { Home } from '@/features/landing/Home'
import { CatalogoPage } from '@/features/catalogo/catalogo-page'
import { CursoDetalhePage } from '@/features/curso/curso-detalhe-page'
import { AvaPage } from '@/features/ava/ava-page'

export function Routes() {
  return (
    <RouterRoutes>
      <Route path="/" element={<Home />} />
      <Route path="/catalogo" element={<CatalogoPage />} />
      <Route path="/curso/:slug" element={<CursoDetalhePage />} />
      <Route path="/area-do-aluno" element={<AvaPage />} />
    </RouterRoutes>
  )
}
