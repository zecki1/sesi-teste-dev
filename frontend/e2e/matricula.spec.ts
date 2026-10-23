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

test("modal de matrícula mostra turmas e confirma a matrícula", async ({ page }) => {
  await page.addInitScript((perfil) => {
    window.localStorage.setItem("sesi.perfil.v1", JSON.stringify(perfil))
    window.localStorage.setItem("sesi.sessao.v1", perfil.email)
  }, aluno)
  await mockApi(page)
  await page.goto("/curso/matematica-para-a-precisao-medidas-e-escalas-na-metalurgia")
  await page.waitForLoadState("networkidle")

  await page.getByRole("button", { name: "Matricule-se" }).first().click()
  const modal = page.getByRole("dialog")
  await expect(modal).toBeVisible()
  await expect(modal.getByText("Turmas disponíveis")).toBeVisible()
  await expect(modal.getByText("Semi-presencial")).toBeVisible()

  await modal.locator('input[name="turma"]').first().check()
  await modal.getByRole("button", { name: "Confirmar matrícula" }).click()

  await expect(modal.getByText("Matrícula realizada com sucesso!")).toBeVisible()
  await expect(modal.getByRole("link", { name: "Ver meu calendário" })).toBeVisible()
  await expect(modal.getByRole("link", { name: "Ver meu calendário" })).toBeFocused()
})

test("modal de login trava a página e rola apenas o conteúdo interno", async ({ page }) => {
  await mockApi(page)
  await page.setViewportSize({ width: 390, height: 500 })
  await page.goto("/area-do-aluno")
  await page.waitForLoadState("networkidle")

  const modal = page.getByRole("dialog")
  await expect(modal).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("fixed")
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden")

  const rolagemPagina = await page.evaluate(() => window.scrollY)
  await modal.hover()
  await page.mouse.wheel(0, 600)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(rolagemPagina)
  await expect.poll(() => modal.evaluate((elemento) => elemento.scrollTop)).toBeGreaterThan(0)

  await page.getByRole("button", { name: "Fechar" }).click()
  await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("")
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("")
})
