import { expect, test } from "@playwright/test"
import { mockApi } from "./support/mock-api"

test.beforeEach(async ({ page }) => {
  await mockApi(page)
})

test("landing renderiza hero, cursos e rodapé", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("heading", { name: /impulsione sua carreira/i })).toBeVisible()
  await expect(page.getByRole("heading", { name: /principais cursos/i })).toBeVisible()
  const footer = page.getByRole("contentinfo")
  await expect(footer).toBeVisible()
  await expect(footer.getByRole("heading", { name: "Navegação" })).toHaveCSS("text-transform", "uppercase")
  await expect(footer.getByRole("heading", { name: "Cursos Populares" })).toHaveCSS("text-transform", "uppercase")
  await expect(footer.getByRole("heading", { name: "Suporte" })).toHaveCSS("text-transform", "uppercase")
  await expect(page.getByText("Depoimentos", { exact: true }).first()).toHaveCSS("text-transform", "uppercase")
  await expect(page.getByRole("link", { name: "Cursos", exact: true }).first()).toBeVisible()

  await page.getByRole("link", { name: /matricule-se/i }).click()
  await expect(page).toHaveURL(/\/catalogo$/)
})

test("catálogo lista, busca, filtra e limpa", async ({ page }) => {
  await page.goto("/catalogo")

  await expect(page.locator("a[href^='/curso/']")).toHaveCount(12)
  const capas = page.locator("a[href^='/curso/'] img[data-capa]")
  await expect(capas).toHaveCount(12)
  await expect(capas.first()).toHaveAttribute("src", /\.webp$/)

  await page.locator("#busca").fill("incêndios")
  await expect(page.locator("a[href^='/curso/']")).toHaveCount(1)
  await expect(page.getByText("1 resultado(s) encontrado(s)")).toBeVisible()

  await page.getByRole("button", { name: /limpar filtros/i }).click()
  await expect(page.locator("a[href^='/curso/']")).toHaveCount(12)

  await page.selectOption("#categoria", "tecnologia")
  await expect(page.locator("a[href^='/curso/']")).toHaveCount(2)

  const badgeTecnologia = page.locator("a[href^='/curso/']").first().getByText("Tecnologia", { exact: true })
  await expect(badgeTecnologia).toHaveCSS("text-transform", "uppercase")
  await expect(badgeTecnologia).toHaveCSS("background-color", "rgb(29, 78, 216)")
  await expect(badgeTecnologia.locator('[data-categoria="tecnologia"]')).toHaveCount(1)
})

test("busca sem resultado mostra estado vazio", async ({ page }) => {
  await page.goto("/catalogo")
  await page.locator("#busca").fill("curso que não existe")

  await expect(page.getByText(/nenhum curso encontrado/i)).toBeVisible()
})

test("detalhe do curso mostra hero, diferenciais, accordion e contato", async ({ page }) => {
  await page.goto("/catalogo")
  await page.locator("a[href='/curso/matematica-para-a-precisao-medidas-e-escalas-na-metalurgia']").first().click()

  await expect(page.getByRole("heading", { name: /matemática para a precisão/i }).first()).toBeVisible()
  await expect(page.getByText("Início do curso:")).toContainText("05/01/2026")
  await expect(page.getByText("Certificação:")).toContainText("SESI")
  await expect(page.getByRole("heading", { name: "Certificação SESI" })).toBeVisible()

  const faixaMatricula = page.locator('section[aria-label="Matrícula"]')
  await expect(faixaMatricula).toHaveAttribute("aria-hidden", "true")
  await expect(faixaMatricula.locator('p[aria-hidden="true"]')).toHaveCSS("text-transform", "none")

  await expect(page.getByText("Grandezas e Unidades", { exact: true })).toBeHidden()
  await page.getByText("Módulos", { exact: true }).click()
  await expect(page.getByText("Grandezas e Unidades", { exact: true })).toBeVisible()
  await expect(page.getByText("Proporção e Escala", { exact: true })).toBeVisible()
  await expect(page.getByText("Aplicação na Usinagem", { exact: true })).toBeVisible()
  await expect(page.getByText("Sistema Internacional de Unidades")).toBeVisible()
  await expect(page.getByText("Público-alvo")).toHaveCount(0)
  await expect(page.getByText("Carga horária")).toHaveCount(0)

  await page.getByText("Dúvidas frequentes").click()
  await expect(page.getByText("1. O curso é totalmente online?")).toBeVisible()
  await expect(page.getByText("10. O curso é reconhecido por órgãos oficiais?")).toBeVisible()
  await expect(page.locator("dt")).toHaveCount(10)

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(faixaMatricula).toHaveAttribute("aria-hidden", "false")
  await expect(faixaMatricula.getByRole("button", { name: "Matricule-se" })).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(faixaMatricula).toHaveAttribute("aria-hidden", "true")

  await expect(page.getByText("Precisa de ajuda para decidir?")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Fale com a gente" })).toBeVisible()
  await expect(page.getByRole("link", { name: /mandar uma mensagem/i })).toHaveAttribute("href", /mailto:/)

  const depoimentos = page.getByRole("region", { name: "Depoimentos de alunos" })
  await expect(depoimentos).toBeVisible()
  await expect(page.getByRole("button", { name: "Próximos depoimentos" })).toBeVisible()
})

test("curso inexistente mostra mensagem de não encontrado", async ({ page }) => {
  await page.goto("/curso/nao-existe")

  await expect(page.getByRole("heading", { name: /curso não encontrado/i })).toBeVisible()
})

test("rota inexistente mostra página 404", async ({ page }) => {
  await page.goto("/rota-que-nao-existe")

  await expect(page.getByRole("heading", { name: /página não encontrada/i })).toBeVisible()
})


test("cards de curso têm imagem de capa, badge de categoria e CTA final", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto("/")

  const trilha = page.getByRole("region", { name: "Principais cursos" })
  const cards = trilha.locator("[data-card]")
  await expect(cards).toHaveCount(7)

  // Full-bleed: no desktop cabem 4 cards inteiros e uma fração do 5º.
  const caixas = await cards.evaluateAll((elementos) =>
    elementos.map((elemento) => {
      const caixa = elemento.getBoundingClientRect()
      return { left: caixa.left, right: caixa.right }
    }),
  )
  expect(await trilha.evaluate((elemento) => elemento.getBoundingClientRect().width)).toBeGreaterThan(1280)
  expect(caixas[3].right).toBeLessThanOrEqual(1440)
  expect(caixas[4].left).toBeLessThan(1440)
  expect(caixas[4].right).toBeGreaterThan(1440)

  const depoimentos = page.getByRole("region", { name: "Depoimentos de alunos" })
  const caixasDepoimentos = await depoimentos.locator("[data-card]").evaluateAll((elementos) =>
    elementos.map((elemento) => {
      const caixa = elemento.getBoundingClientRect()
      return { left: caixa.left, right: caixa.right }
    }),
  )
  expect(await depoimentos.evaluate((elemento) => elemento.getBoundingClientRect().width)).toBeGreaterThan(1280)
  expect(caixasDepoimentos[3].right).toBeLessThanOrEqual(1440)
  expect(caixasDepoimentos[4].left).toBeLessThan(1440)
  expect(caixasDepoimentos[4].right).toBeGreaterThan(1440)

  const primeiro = cards.first()
  const capa = primeiro.locator("img[data-capa]")
  await expect(capa).toHaveAttribute("src", /isaac-smith.*\.webp$/)
  await expect
    .poll(() => capa.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)

  const badgeMatematica = primeiro.getByText("Matemática", { exact: true })
  await expect(badgeMatematica).toBeVisible()
  await expect(badgeMatematica).toHaveCSS("text-transform", "uppercase")
  await expect(badgeMatematica).toHaveCSS("background-color", "rgb(217, 119, 6)")
  const iconeBadge = badgeMatematica.locator("img")
  await expect(iconeBadge).toHaveAttribute("data-categoria", "matematica")
  await expect
    .poll(() => iconeBadge.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)

  const ultimo = cards.last()
  await expect(ultimo).toContainText(/todos os cursos/i)
  await expect(ultimo).toHaveAttribute("href", "/catalogo")
  await expect(ultimo.getByText(/todos os cursos/i)).toHaveCSS("text-transform", "uppercase")
  await expect(page.getByRole("link", { name: "Ver todos os cursos" })).toHaveAttribute("href", "/catalogo")
})

test("slider de principais cursos navega com as setas", async ({ page }) => {
  await page.goto("/")

  const trilha = page.getByRole("region", { name: "Principais cursos" })
  await expect(trilha).toBeVisible()

  await page.getByRole("button", { name: "Próximos cursos" }).click()
  await expect.poll(() => trilha.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)

  await page.getByRole("button", { name: "Cursos anteriores" }).click()
  await expect.poll(() => trilha.evaluate((el) => el.scrollLeft)).toBeLessThan(1)
})

test("clique simples no card do slider abre a página do curso", async ({ page }) => {
  await page.goto("/")

  const trilha = page.getByRole("region", { name: "Principais cursos" })
  await trilha.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)

  await trilha.locator("[data-card]").first().click()
  await expect(page).toHaveURL(/\/curso\/[a-z0-9-]+$/)
})

test("sliders de cursos e depoimentos arrastam com o mouse", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto("/")

  const cursos = page.getByRole("region", { name: "Principais cursos" })
  await cursos.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  const caixaCursos = await cursos.boundingBox()
  expect(caixaCursos).not.toBeNull()
  if (!caixaCursos) return

  await page.mouse.move(caixaCursos.x + caixaCursos.width - 120, caixaCursos.y + 80)
  await page.mouse.down()
  await page.mouse.move(caixaCursos.x + 120, caixaCursos.y + 80, { steps: 12 })
  await expect(cursos).toHaveAttribute("data-arrastando", "true")
  await expect.poll(() => cursos.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
  await page.mouse.up()
  await expect(cursos).toHaveAttribute("data-arrastando", "false")
  await expect(page).toHaveURL(/\/$/)

  const depoimentos = page.getByRole("region", { name: "Depoimentos de alunos" })
  await depoimentos.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  const caixaDepoimentos = await depoimentos.boundingBox()
  expect(caixaDepoimentos).not.toBeNull()
  if (!caixaDepoimentos) return

  await page.mouse.move(caixaDepoimentos.x + caixaDepoimentos.width - 120, caixaDepoimentos.y + 80)
  await page.mouse.down()
  await page.mouse.move(caixaDepoimentos.x + 120, caixaDepoimentos.y + 80, { steps: 12 })
  await expect(depoimentos).toHaveAttribute("data-arrastando", "true")
  await expect.poll(() => depoimentos.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
  await page.mouse.up()
  await expect(depoimentos).toHaveAttribute("data-arrastando", "false")
})

test("página SCORM usa os dados do curso e a configuração salva", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "sesi.scorm.pagina.matematica-para-a-precisao-medidas-e-escalas-na-metalurgia",
      JSON.stringify({
        titulo: "Turma SCORM de Medidas",
        subtitulo: "Pacote configurado no admin",
        cargaHoraria: 32,
        botaoTexto: "Começar agora",
      }),
    )
  })

  await page.goto("/curso/matematica-para-a-precisao-medidas-e-escalas-na-metalurgia/scorm")

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Turma SCORM de Medidas")
  await expect(page.getByText("Pacote configurado no admin")).toBeVisible()
  await expect(page.locator("[data-carga-scorm]")).toHaveText("32h")
  await expect(page.getByRole("button", { name: /começar agora/i })).toBeVisible()
  await expect(page.locator("[data-banner-scorm]")).toBeVisible()
  await expect(page.locator("[data-imagem-scorm]")).toHaveAttribute("src", /matematica-precisao\.svg$/)
  await expect(page.locator("[data-player-demonstrativo]")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Grandezas e Unidades" })).toHaveCount(0)
  await page.getByText("Módulos", { exact: true }).click()
  await expect(page.getByText(/Grandezas e Unidades/).first()).toBeVisible()
})

test("admin salva o limite permitido de upload SCORM", async ({ page }) => {
  const admin = {
    nome: "Admin",
    sobrenome: "SESI",
    email: "admin@sesindustria.com.br",
    telefone: "",
    dataNascimento: "",
    idioma: "pt-BR",
    papel: "admin",
    acessibilidade: { filtro: "none", tamanhoFonte: "normal", dislexia: false, tema: "claro", vlibras: true },
    certificados: [],
    matriculas: [],
  }
  await page.addInitScript((perfil) => {
    window.localStorage.setItem("sesi.perfil.v1", JSON.stringify(perfil))
    window.localStorage.setItem("sesi.sessao.v1", perfil.email)
  }, admin)
  await page.goto("/admin/cursos")

  const limite = page.getByLabel("Tamanho máximo")
  await expect(limite).toHaveValue("100")
  await limite.selectOption("200")
  await page.getByRole("button", { name: /salvar \(100 MB atual\)/i }).click()
  await expect(page.getByRole("status")).toContainText("Limite de upload SCORM atualizado para 200 MB.")
  await expect(limite).toHaveValue("200")
})

test("menu mobile abre a navegação", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")

  await page.getByRole("button", { name: /menu/i }).first().click()
  await expect(page.getByRole("link", { name: /catálogo|cursos/i }).first()).toBeVisible()
})
