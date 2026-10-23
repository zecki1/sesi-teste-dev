import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Routes } from './routes'
import { AccessibilityMenu } from '@/components/a11y/AccessibilityMenu'
import { SmoothScroll } from '@/components/motion/smooth-scroll'
import { usePerfil } from '@/lib/auth/perfil'
import { aplicarIdioma, iniciarIdioma } from '@/lib/i18n/idioma'

const queryClient = new QueryClient()

function App() {
  const perfil = usePerfil()

  // Idioma do perfil tem prioridade; sem perfil, detecta pela região (fuso horário).
  useEffect(() => {
    if (perfil?.idioma) aplicarIdioma(perfil.idioma)
    else iniciarIdioma()
  }, [perfil?.idioma])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SmoothScroll />
        <Routes />
        <AccessibilityMenu />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
