import { spawn } from "node:child_process"
import { access } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const apiProject = path.resolve(frontendRoot, "..", "backend", "Sesi.Catalogo.Api", "Sesi.Catalogo.Api.csproj")
const viteEntrypoint = path.join(frontendRoot, "node_modules", "vite", "bin", "vite.js")
const apiHealthUrl = process.env.API_HEALTH_URL ?? "http://localhost:5077/health"
const children = new Set()
let stopping = false

async function apiJaEstaAtiva() {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    try {
      const response = await fetch(apiHealthUrl, { signal: AbortSignal.timeout(1000) })
      if (response.ok) return true
    } catch {
      if (tentativa === 3) return false
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}

async function vitePortaAtiva() {
  for (let porta = 5173; porta <= 5174; porta++) {
    try {
      const response = await fetch(`http://localhost:${porta}/@vite/client`, {
        signal: AbortSignal.timeout(500),
      })
      if (response.ok) return porta
    } catch {
      // Uma porta sem Vite ativo é esperada durante a inicialização local.
    }
  }
  return null
}

function iniciar(comando, argumentos, nome, env = process.env) {
  const processo = spawn(comando, argumentos, {
    cwd: frontendRoot,
    env,
    stdio: "inherit",
    windowsHide: true,
  })
  children.add(processo)
  processo.once("error", (error) => {
    console.error(`Não foi possível iniciar ${nome}:`, error.message)
    encerrar(1)
  })
  processo.once("close", (code) => {
    children.delete(processo)
    if (stopping) return

    void (async () => {
      if (nome === "API .NET" && await apiJaEstaAtiva()) {
        console.info("A API continua respondendo em localhost:5077; mantendo o Vite ativo.")
        return
      }
      console.error(`${nome} encerrou${code === null ? "" : ` (código ${code})`}.`)
      encerrar(code || 1)
    })()
  })
  return processo
}

function encerrar(exitCode = 0) {
  if (stopping) return
  stopping = true
  for (const processo of children) processo.kill()
  process.exitCode = exitCode
}

process.once("SIGINT", () => encerrar(0))
process.once("SIGTERM", () => encerrar(0))

try {
  await access(apiProject)
  await access(viteEntrypoint)
} catch (error) {
  console.error("Não encontrei o projeto da API ou o Vite instalado.", error)
  process.exit(1)
}

if (await apiJaEstaAtiva()) {
  console.info("API já está respondendo em localhost:5077.")
} else {
  iniciar(
    "dotnet",
    ["run", "--project", apiProject, "--launch-profile", "http"],
    "API .NET",
    { ...process.env, SESI_DEV_COORDINATOR: "1" },
  )
}

if (!stopping) {
  const portaVite = await vitePortaAtiva()
  if (portaVite !== null) {
    console.info(`Vite já está respondendo em localhost:${portaVite}.`)
  } else {
    iniciar(process.execPath, [viteEntrypoint], "Vite")
  }
}
