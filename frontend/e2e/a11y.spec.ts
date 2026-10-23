import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { mockApi } from "./support/mock-api"

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]

const ROTA_SCORM = "/curso/matematica-para-a-precisao-medidas-e-escalas-na-metalurgia/scorm"

for (const rota of ["/", "/catalogo", "/curso/matematica-para-a-precisao-medidas-e-escalas-na-metalurgia", ROTA_SCORM]) {
  test(`sem violações sérias de acessibilidade em ${rota}`, async ({ page }) => {
    await mockApi(page)
    await page.goto(rota)
    await page.waitForLoadState("networkidle")

    const resultado = await new AxeBuilder({ page }).withTags(TAGS).analyze()
    const graves = resultado.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""))

    expect(
      graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`),
    ).toEqual([])
  })
}

for (const rota of ["/", "/catalogo"]) {
  test(`sem violações sérias no tema escuro em ${rota}`, async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("sesi.a11y.v1", JSON.stringify({ tema: "escuro" }))
    })
    await mockApi(page)
    await page.goto(rota)
    await page.waitForLoadState("networkidle")

    const resultado = await new AxeBuilder({ page }).withTags(TAGS).analyze()
    const graves = resultado.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""))

    expect(
      graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`),
    ).toEqual([])
  })
}
