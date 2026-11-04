import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Em desenvolvimento o frontend roda em :5173 e a API em :5077.
// O proxy mantém tudo na mesma origem para o navegador (sem CORS, cookies no lugar).
const alvoApi = process.env.VITE_API_URL || 'http://localhost:5077'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': { target: alvoApi, changeOrigin: true },
      '/uploads': { target: alvoApi, changeOrigin: true },
      '/scorm': { target: alvoApi, changeOrigin: true },
      '/health': { target: alvoApi, changeOrigin: true },
    },
  },
})
