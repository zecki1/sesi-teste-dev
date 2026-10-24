import { describe, expect, it } from "vitest"
import { strToU8, zipSync } from "fflate"
import { detectarVersaoScorm } from "./detectar-versao-scorm"

describe("detectarVersaoScorm", () => {
  it.each([
    ["1.2", "1.2"],
    ["2004 4th Edition", "2004"],
  ] as const)("identifica SCORM %s a partir do manifesto", async (schemaVersion, esperado) => {
    const conteudo = zipSync({
      "curso/imsmanifest.xml": strToU8(
        `<manifest><metadata><schemaversion>${schemaVersion}</schemaversion></metadata></manifest>`,
      ),
      "curso/index.html": strToU8("<html></html>"),
    })
    const arquivo = new File([conteudo], "curso.zip")

    await expect(detectarVersaoScorm(arquivo)).resolves.toBe(esperado)
  })

  it("explica quando o pacote não contém um manifesto SCORM", async () => {
    const arquivo = new File([zipSync({ "index.html": strToU8("<html></html>") })], "nao-scorm.zip")

    await expect(detectarVersaoScorm(arquivo)).rejects.toThrow("Não encontrei o imsmanifest.xml")
  })
})
