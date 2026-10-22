import { Routes as RouterRoutes, Route } from 'react-router-dom'
import { Home } from '@/features/landing/Home'

export function Routes() {
  return (
    <RouterRoutes>
      <Route path="/" element={<Home />} />
    </RouterRoutes>
  )
}
