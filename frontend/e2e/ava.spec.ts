import { expect, test } from "@playwright/test"
import { mockApi } from "./support/mock-api"

const aluno = {
  nome: "Aluno",
  sobrenome: "Teste",
  email: "aluno@teste.com",
  telefone: "(11) 99999-0000",
  dataNascimento: "1998-04-12",
  idioma: "pt-BR",
  papel: "aluno",
  acessibilidade: { filtro: "none", tamanhoFonte: "normal", dislexia: false, tema: "claro", vlibras: true },
  certificados: [],
  matriculas: [],
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((perfil) => {
    window.localStorage.setItem("sesi.perfil.v1", JSON.stringify(perfil))
    window.localStorage.setItem("sesi.sessao.v1", perfil.email)
  }, aluno)
  await mockApi(page)
})

test("AVA mostra introdução, seis módulos, conteúdo e busca", async ({ page }) => {
  await page.goto("/area-do-aluno/curso/matematica-para-a-precisao-medidas-e-escalas-na-metalurgia")
  await page.waitForLoadState("networkidle")

  await expect(page.getByRole("heading", { name: /matemática para a precisão/i })).toBeVisible()
  await expect(page.getByText("1. Introdução")).toBeVisible()
  await expect(page.getByRole("button", { name: "1.2 Boas práticas" })).toBeVisible()
  await expect(page.getByRole("button", { name: "7. Módulo 6" })).toBeVisible()

  await expect(page.getByRole("heading", { name: "Boas práticas" })).toBeVisible()
  await expect(page.getByText("Se você está interessado em se aprofundar em Matemática para a Precisão")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Recomendações" })).toBeVisible()
  await expect(page.getByText("Progresso", { exact: true })).toHaveCount(0)
  await expect(page.getByText("11%")).toBeVisible()

  const percentual = page.getByText("11%")
  const barra = page.locator("[data-progresso-barra]")
  await expect(barra).toHaveCSS("background-color", "rgb(255, 255, 255)")
  const caixaPercentual = await percentual.boundingBox()
  const caixaBarra = await barra.boundingBox()
  expect(caixaPercentual).not.toBeNull()
  expect(caixaBarra).not.toBeNull()
  if (caixaPercentual && caixaBarra) {
    expect(caixaPercentual.x + caixaPercentual.width).toBeLessThanOrEqual(caixaBarra.x)
  }

  await expect(page.locator("[data-banner-ava]").getByAltText("SESI Indústria")).toBeVisible()
  await expect(page.getByRole("button", { name: "1.2 Boas práticas" }).locator('[data-status="ativo"]')).toBeVisible()
  await expect(page.getByRole("button", { name: "1.1 Introdução" }).locator('[data-status="nao-visitado"]')).toBeVisible()

  await page.getByRole("button", { name: "2. Módulo 1" }).click()
  await expect(page.getByRole("heading", { name: "Módulo 1" })).toBeVisible()
  await expect(page.getByText("Grandezas e Unidades", { exact: true })).toBeVisible()
  await expect(page.getByText("Sistema Internacional de Unidades")).toBeVisible()
  await expect(page.getByText("22%")).toBeVisible()
  await expect(page.getByRole("button", { name: "1.2 Boas práticas" }).locator('[data-status="visitado"]')).toBeVisible()
  await expect(page.getByRole("button", { name: "2. Módulo 1" }).locator('[data-status="ativo"]')).toBeVisible()

  await page.getByRole("searchbox", { name: "Buscar aulas" }).fill("Módulo 6")
  await expect(page.getByRole("button", { name: "7. Módulo 6" })).toBeVisible()
  await expect(page.getByRole("button", { name: "2. Módulo 1" })).toHaveCount(0)
})

test("retoma a jornada sem perder o progresso", async ({ page }) => {
  await page.goto("/area-do-aluno/curso/matematica-para-a-precisao-medidas-e-escalas-na-metalurgia")
  await page.waitForLoadState("networkidle")

  await page.getByRole("button", { name: "2. Módulo 1" }).click()
  await expect(page.getByText("22%")).toBeVisible()

  for (const modulo of ["3. Módulo 2", "4. Módulo 3", "5. Módulo 4"]) {
    await page.getByRole("button", { name: modulo }).click()
  }
  await expect(page.getByText("56%")).toBeVisible()

  // Voltar para um módulo já visitado não pode diminuir o progresso.
  await page.getByRole("button", { name: "4. Módulo 3" }).click()
  await expect(page.getByText("56%")).toBeVisible()

  await page.reload()
  await page.waitForLoadState("networkidle")

  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page.getByRole("button", { name: "Continuar de onde parei" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Começar do início" })).toBeVisible()

  await page.getByRole("button", { name: "Continuar de onde parei" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "Módulo 3" })).toBeVisible()
  await expect(page.getByText("56%")).toBeVisible()

  await page.reload()
  await page.waitForLoadState("networkidle")
  await page.getByRole("button", { name: "Começar do início" }).click()
  await expect(page.getByRole("heading", { name: "Introdução" })).toBeVisible()
  await expect(page.getByText("67%")).toBeVisible()
})

test("abre o pacote SCORM no AVA e oferece retomar ou reiniciar", async ({ page }) => {
  const slug = "matematica-para-a-precisao-medidas-e-escalas-na-metalurgia"
  let progresso: {
    cursoSlug: string
    usuarioId: string
    suspendData: string | null
    lessonStatus: string | null
    lessonLocation: string | null
    score: number | null
    percentual: number
    cmiDataJson: string | null
    atualizadoEm: string
  } = {
    cursoSlug: slug,
    usuarioId: aluno.email,
    suspendData: '{"pagina":4}',
    lessonStatus: "incomplete",
    lessonLocation: "modulo-4",
    score: null,
    percentual: 56,
    cmiDataJson: '{"cmi.core.lesson_location":"modulo-4"}',
    atualizadoEm: new Date().toISOString(),
  }

  await page.route("**/api/v1/scorm/pacotes/**", async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith("/launch")) {
      return route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>Player SCORM teste</body></html>" })
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "pacote-teste",
        cursoSlug: slug,
        nomeArquivo: "curso-teste.zip",
        tamanho: 1024,
        versao: "1.2",
        entryFile: "index.html",
        criadoEm: new Date().toISOString(),
        conteudoUrl: "/scorm/pacote-teste/index.html",
        lancamentoUrl: "/api/v1/scorm/pacotes/pacote-teste/launch",
      }),
    })
  })

  await page.route("**/api/v1/scorm/progresso**", async (route) => {
    if (route.request().method() === "POST") {
      progresso = {
        ...progresso,
        suspendData: null,
        lessonStatus: null,
        lessonLocation: null,
        score: null,
        cmiDataJson: null,
      }
    }

    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(progresso) })
  })

  await page.goto(`/area-do-aluno/curso/${slug}`)
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page.locator("[data-player-scorm]")).toBeVisible()
  await expect(page.getByText("56% concluído")).toBeVisible()

  await page.getByRole("button", { name: "Continuar de onde parei" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.locator("[data-player-scorm]")).toHaveAttribute("src", /pacotes%2Fpacote-teste%2Flaunch|pacotes\/pacote-teste\/launch/)

  await page.reload()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("button", { name: "Começar do início" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByText("56% concluído")).toBeVisible()
})

test("dashboard agrega o percentual SCORM sem reduzir o progresso salvo", async ({ page }) => {
  const slug = "matematica-para-a-precisao-medidas-e-escalas-na-metalurgia"
  await page.addInitScript((cursoSlug) => {
    const perfil = JSON.parse(window.localStorage.getItem("sesi.perfil.v1") || "{}")
    perfil.matriculas = [
      { slug: cursoSlug, progresso: 35, matriculadoEm: "2026-01-05", proximaAula: "", concluido: false },
    ]
    window.localStorage.setItem("sesi.perfil.v1", JSON.stringify(perfil))
  }, slug)

  await page.route("**/api/v1/scorm/progresso**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        cursoSlug: slug,
        usuarioId: aluno.email,
        suspendData: null,
        lessonStatus: "incomplete",
        lessonLocation: "modulo-5",
        score: null,
        percentual: 78,
        cmiDataJson: null,
        atualizadoEm: new Date().toISOString(),
      }),
    }),
  )

  await page.goto("/area-do-aluno")
  await expect(page.getByText("78%", { exact: true }).first()).toBeVisible()
})
