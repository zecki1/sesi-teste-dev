import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './styles/globals.css'
import '@fontsource/opendyslexic/400.css'
import './i18n'
import './styles/a11y.css'
import './styles/dark.css'
import { aplicarNaRaiz, lerConfig } from './lib/a11y/config'

// Aplica tema/fonte/filtro antes da primeira pintura para evitar "flash" claro.
aplicarNaRaiz(lerConfig())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
