import { Routes as RouterRoutes, Route } from 'react-router-dom'
import { Home } from '@/features/landing/Home'
import { CatalogoPage } from '@/features/catalogo/catalogo-page'
import { CursoDetalhePage } from '@/features/curso/curso-detalhe-page'
import { ScormCursoPage } from '@/features/scorm/scorm-curso-page'
import { AlunoPage } from '@/features/aluno/aluno-page'
import { AvaPage } from '@/features/ava/ava-page'
import { AdminCursosPage } from '@/features/admin/admin-cursos-page'
import { SobrePage } from '@/features/sobre/sobre-page'
import { NotFoundPage } from '@/features/not-found/not-found-page'

export function Routes() {
  return (
    <RouterRoutes>
      <Route path="/" element={<Home />} />
      <Route path="/catalogo" element={<CatalogoPage />} />
      <Route path="/curso/:slug" element={<CursoDetalhePage />} />
      <Route path="/curso/:slug/scorm" element={<ScormCursoPage />} />
      <Route path="/area-do-aluno" element={<AlunoPage />} />
      <Route path="/area-do-aluno/curso/:slug" element={<AvaPage />} />
      <Route path="/admin/cursos" element={<AdminCursosPage />} />
      <Route path="/sobre" element={<SobrePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </RouterRoutes>
  )
}
