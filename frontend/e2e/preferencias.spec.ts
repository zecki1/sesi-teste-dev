import { expect, test } from "@playwright/test"
import { mockApi } from "./support/mock-api"

test.beforeEach(async ({ page }) => {
  await mockApi(page)
  await page.goto("/")
  await page.waitForLoadState("networkidle")
})

test("troca o idioma pela barra de acessibilidade e mantém a escolha", async ({ page }) => {
  await page.getByRole("button", { name: "Abrir configurações de acessibilidade" }).click()
  await expect(page.getByRole("heading", { name: "Acessibilidade" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Português" })).toHaveAttribute("aria-pressed", "true")

  await page.getByRole("button", { name: "English" }).click()
  await expect(page.getByRole("heading", { name: "Accessibility" })).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US")
  await expect(page.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true")

  await page.getByRole("button", { name: "Español" }).click()
  await expect(page.getByRole("heading", { name: "Accesibilidad" })).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("lang", "es-ES")
  await expect(page.getByRole("button", { name: "Español" })).toHaveAttribute("aria-pressed", "true")

  await page.reload()
  await page.waitForLoadState("networkidle")
  await expect(page.locator("html")).toHaveAttribute("lang", "es-ES")
})

test("alterna o tema escuro e mantém a escolha após recarregar", async ({ page }) => {
  await page.getByRole("button", { name: "Abrir configurações de acessibilidade" }).click()
  await page.getByRole("button", { name: "Escuro" }).click()

  await expect(page.locator("html")).toHaveAttribute("data-theme", "escuro")
  await expect(page.getByRole("button", { name: "Escuro" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("button", { name: "Claro" })).toHaveAttribute("aria-pressed", "false")

  await page.reload()
  await page.waitForLoadState("networkidle")
  await expect(page.locator("html")).toHaveAttribute("data-theme", "escuro")
})

test("slider de fonte usa passos discretos e mantém a escolha", async ({ page }) => {
  await page.getByRole("button", { name: "Abrir configurações de acessibilidade" }).click()
  const slider = page.locator("#a11y-fonte")

  await slider.focus()
  await slider.press("End")
  await expect(page.locator("html")).toHaveAttribute("data-font-size", "xlarge")

  await slider.press("Home")
  await expect(page.locator("html")).toHaveAttribute("data-font-size", "small")

  await slider.press("End")
  await page.reload()
  await page.waitForLoadState("networkidle")
  await expect(page.locator("html")).toHaveAttribute("data-font-size", "xlarge")
})

test("checkbox do VLibras desativa e persiste o widget", async ({ page }) => {
  await page.getByRole("button", { name: "Abrir configurações de acessibilidade" }).click()
  const vlibras = page.getByRole("checkbox", { name: "Ativar tradutor de Libras" })

  await expect(page.locator("html")).toHaveAttribute("data-vlibras", "on")
  await vlibras.uncheck()
  await expect(page.locator("html")).toHaveAttribute("data-vlibras", "off")

  await page.reload()
  await page.waitForLoadState("networkidle")
  await expect(page.locator("html")).toHaveAttribute("data-vlibras", "off")
})

test("modal de acessibilidade trava a página e rola o conteúdo interno", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.scrollTo(0, 400))
  const rolagemAntes = await page.evaluate(() => window.scrollY)

  await page.getByRole("button", { name: "Abrir configurações de acessibilidade" }).click()
  const area = page.locator('[role="dialog"] .overflow-y-auto')
  const caixa = await area.boundingBox()
  expect(caixa).not.toBeNull()
  if (caixa) await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2)
  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(300)

  expect(await area.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => document.body.getBoundingClientRect().top)).toBe(-rolagemAntes)

  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect(await page.evaluate(() => window.scrollY)).toBe(rolagemAntes)
})

test("aceite de cookies não reaparece ao recarregar", async ({ page }) => {
  await page.getByRole("button", { name: "Aceitar todos os cookies" }).click()
  await expect(page.getByRole("button", { name: "Aceitar todos os cookies" })).toHaveCount(0)

  await page.reload()
  await page.waitForLoadState("networkidle")
  await expect(page.getByRole("button", { name: "Aceitar todos os cookies" })).toHaveCount(0)
})

test("eleva o card do carrossel ao passar o mouse", async ({ page }) => {
  const card = page.locator("[data-card]").first()
  await expect(card).toBeVisible()

  const antes = await card.evaluate((el) => getComputedStyle(el).transform)
  await card.hover()
  await page.waitForTimeout(400)
  const depois = await card.evaluate((el) => getComputedStyle(el).transform)

  expect(antes).toBe("none")
  expect(depois).toContain("-6")
})
