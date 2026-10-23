import { mkdir } from "node:fs/promises"
import path from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { mockApi } from "./support/mock-api"

const diretorioCapturas = path.resolve(process.cwd(), "../docs/screenshots")
const slugCurso = "matematica-para-a-precisao-medidas-e-escalas-na-metalurgia"

const perfilAluno = {
  nome: "Ana",
  sobrenome: "Souza",
  email: "aluno@teste.com",
  telefone: "(11) 99999-0000",
  dataNascimento: "1994-05-18",
  idioma: "pt-BR",
  papel: "aluno",
  acessibilidade: { filtro: "none", tamanhoFonte: "normal", dislexia: false, tema: "claro", vlibras: true },
  certificados: [],
  matriculas: [
    {
      slug: slugCurso,
      progresso: 35,
      matriculadoEm: "2026-01-05",
      proximaAula: "Proporção e escala",
      concluido: false,
    },
  ],
}

const perfilAdmin = {
  ...perfilAluno,
  nome: "Admin",
  sobrenome: "SESI",
  email: "admin@sesindustria.com.br",
  papel: "admin",
  matriculas: [],
}

test.beforeAll(async () => {
  await mkdir(diretorioCapturas, { recursive: true })
})

test.beforeEach(async ({ page }) => {
  await mockApi(page)
})

async function aguardarCapasVisiveis(page: Page) {
  const capas = page.locator("img[data-capa]")
  const quantidadeVisivel = await capas.evaluateAll((imagens) =>
    imagens.filter((imagem) => {
      const caixa = imagem.getBoundingClientRect()
      return caixa.width > 0 && caixa.height > 0 &&
        caixa.top < window.innerHeight && caixa.bottom > 0 &&
        caixa.left < window.innerWidth && caixa.right > 0
    }).length,
  )

  if (quantidadeVisivel === 0) return

  await expect.poll(() => capas.evaluateAll((imagens) => {
    const visiveis = imagens.filter((imagem) => {
      const caixa = imagem.getBoundingClientRect()
      return caixa.width > 0 && caixa.height > 0 &&
        caixa.top < window.innerHeight && caixa.bottom > 0 &&
        caixa.left < window.innerWidth && caixa.right > 0
    })
    return visiveis.every((imagem) => imagem.complete && imagem.naturalWidth > 0)
  })).toBe(true)

  await capas.evaluateAll(async (imagens) => {
    const visiveis = imagens.filter((imagem) => {
      const caixa = imagem.getBoundingClientRect()
      return caixa.width > 0 && caixa.height > 0 &&
        caixa.top < window.innerHeight && caixa.bottom > 0 &&
        caixa.left < window.innerWidth && caixa.right > 0
    })
    await Promise.all(visiveis.map((imagem) => imagem.decode()))
  })
}

async function capturar(page: Page, nome: string) {
  const recusarCookies = page.getByRole("button", { name: "Recusar cookies" })
  if (await recusarCookies.isVisible()) await recusarCookies.click()
  await aguardarCapasVisiveis(page)
  await page.screenshot({
    path: path.join(diretorioCapturas, nome),
    fullPage: false,
    animations: "disabled",
  })
}

test("screenshot: home desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto("/")
  await expect(page.getByRole("heading", { name: /impulsione sua carreira/i })).toBeVisible()
  await capturar(page, "home-desktop.png")
})

test("screenshot: home mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  await expect(page.getByRole("heading", { name: /impulsione sua carreira/i })).toBeVisible()
  await capturar(page, "home-mobile.png")
})

test("screenshot: catálogo desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto("/catalogo")
  await expect(page.getByRole("heading", { name: "Catálogo de Cursos" })).toBeVisible()
  await expect(page.locator("a[href^='/curso/']")).toHaveCount(12)
  await capturar(page, "catalogo-desktop.png")
})

test("screenshot: catálogo mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/catalogo")
  await expect(page.getByRole("heading", { name: "Catálogo de Cursos" })).toBeVisible()
  await expect(page.locator("a[href^='/curso/']")).toHaveCount(12)
  await capturar(page, "catalogo-mobile.png")
})

test("screenshot: detalhe do curso", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`/curso/${slugCurso}`)
  await expect(page.getByRole("heading", { name: /matemática para a precisão/i }).first()).toBeVisible()
  await capturar(page, "curso-detalhe-desktop.png")
})

test("screenshot: página SCORM", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`/curso/${slugCurso}/scorm`)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await capturar(page, "curso-scorm-desktop.png")
})

test("screenshot: área do aluno", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.addInitScript((perfil) => {
    window.localStorage.setItem("sesi.perfil.v1", JSON.stringify(perfil))
    window.localStorage.setItem("sesi.sessao.v1", perfil.email)
  }, perfilAluno)
  await page.route("**/api/v1/scorm/progresso?**", (route) =>
    route.fulfill({ status: 204, body: "" }),
  )
  await page.route("**/api/v1/gestao/marcos?**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  )
  await page.goto("/area-do-aluno")
  await expect(page.getByRole("heading", { name: /olá, ana/i })).toBeVisible()
  await capturar(page, "area-do-aluno-desktop.png")
})

test("screenshot: administração de cursos", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.addInitScript((perfil) => {
    window.localStorage.setItem("sesi.perfil.v1", JSON.stringify(perfil))
    window.localStorage.setItem("sesi.sessao.v1", perfil.email)
  }, perfilAdmin)
  await page.goto("/admin/cursos")
  await expect(page.getByRole("heading", { name: "Gerenciar cursos" })).toBeVisible()
  await capturar(page, "admin-cursos-desktop.png")
})
