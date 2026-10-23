import type { Page } from "@playwright/test"
import cursosFixture from "../fixtures/cursos.json" with { type: "json" }
import facetasFixture from "../fixtures/facetas.json" with { type: "json" }
import detalheFixture from "../fixtures/curso-detalhe.json" with { type: "json" }
import turmasFixture from "../fixtures/turmas.json" with { type: "json" }

/**
 * Intercepta as chamadas da API para os testes E2E rodarem sem back-end.
 * O filtro é aplicado sobre o mesmo JSON capturado da API real.
 */
export async function mockApi(page: Page) {
  await page.route("**/api/v1/facetas", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(facetasFixture) }),
  )

  await page.route("**/api/v1/cursos?*", async (route) => {
    const url = new URL(route.request().url())
    const busca = (url.searchParams.get("busca") || "").toLowerCase()
    const categoria = url.searchParams.get("categoria") || ""
    const modalidade = url.searchParams.get("modalidade") || ""
    const status = url.searchParams.get("status") || ""
    const destaque = url.searchParams.get("destaque") || ""

    const itens = cursosFixture.itens.filter((curso) => {
      const alvo = `${curso.nomeCompleto} ${curso.nomeBreve} ${curso.descricao}`.toLowerCase()
      return (
        (!busca || alvo.includes(busca)) &&
        (!categoria || curso.categoria.slug === categoria) &&
        (!modalidade || curso.modalidade.slug === modalidade) &&
        (!status || curso.status.slug === status) &&
        (!destaque || String(curso.destaque) === destaque)
      )
    })

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        itens,
        total: itens.length,
        pagina: 1,
        tamanho: Number(url.searchParams.get("tamanho") || 12),
        facetas: facetasFixture,
      }),
    })
  })

  await page.route("**/api/v1/cursos/*", (route) => {
    const url = route.request().url()
    const slug = url.split("/cursos/")[1]?.split("?")[0]
    const encontrado = slug === detalheFixture.slug

    return route.fulfill({
      status: encontrado ? 200 : 404,
      contentType: encontrado ? "application/json" : "application/problem+json",
      body: encontrado
        ? JSON.stringify(detalheFixture)
        : JSON.stringify({ title: "Not Found", status: 404 }),
    })
  })

  // Registrada depois da rota genérica para ter precedência em /cursos/{slug}/turmas.
  await page.route("**/api/v1/cursos/*/turmas", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(turmasFixture),
    }),
  )

  await page.route("**/api/v1/matriculas*", async (route) => {
    if (route.request().method() === "POST") {
      const corpo = route.request().postDataJSON() as { turmaId: number; usuarioId: string }
      const turma = turmasFixture.find((item) => item.id === corpo.turmaId) ?? turmasFixture[0]
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 999,
          usuarioId: corpo.usuarioId,
          dataMatricula: new Date().toISOString(),
          status: "ativa",
          progresso: 0,
          concluido: false,
          curso: detalheFixture,
          turma,
        }),
      })
    }

    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })

  await page.route("**/api/v1/scorm/pacotes/*", (route) =>
    route.fulfill({ status: 404, contentType: "application/problem+json", body: JSON.stringify({ status: 404 }) }),
  )

  await page.route("**/api/v1/scorm/pacotes", async (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "pacote-e2e",
          cursoSlug: "curso-e2e",
          nomeArquivo: "curso-e2e.zip",
          tamanho: 1024,
          versao: "1.2",
          entryFile: "index.html",
          criadoEm: new Date().toISOString(),
          conteudoUrl: "/scorm/pacote-e2e/index.html",
          lancamentoUrl: "/api/v1/scorm/pacotes/pacote-e2e/launch",
        }),
      })
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })

  await page.route("**/api/v1/scorm/configuracoes", async (route) => {
    if (route.request().method() === "PUT") {
      return route.fulfill({ status: 200, contentType: "application/json", body: route.request().postData() ?? "{}" })
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ limiteUploadMb: 100 }) })
  })

  await page.route("**/api/v1/scorm/paginas/*", async (route) => {
    if (route.request().method() === "PUT") {
      return route.fulfill({ status: 200, contentType: "application/json", body: route.request().postData() ?? "{}" })
    }
    return route.fulfill({ status: 404, contentType: "application/problem+json", body: JSON.stringify({ status: 404 }) })
  })
}
