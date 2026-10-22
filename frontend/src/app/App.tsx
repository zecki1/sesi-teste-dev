import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Routes } from './routes'
import { AccessibilityMenu } from '@/components/a11y/AccessibilityMenu'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes />
        <AccessibilityMenu />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
