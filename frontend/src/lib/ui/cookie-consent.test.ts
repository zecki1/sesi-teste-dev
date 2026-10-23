import { beforeEach, describe, expect, it } from "vitest"
import { lerConsentimento, salvarConsentimento } from "./cookie-consent"

describe("cookie-consent", () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.cookie = "sesi_cookies=; path=/; max-age=0"
  })

  it("começa sem consentimento", () => {
    expect(lerConsentimento()).toBeNull()
  })

  it("persiste o aceite no localStorage e no cookie", () => {
    salvarConsentimento("aceito")

    expect(lerConsentimento()).toBe("aceito")
    expect(document.cookie).toContain("sesi_cookies=aceito")
  })

  it("persiste a recusa", () => {
    salvarConsentimento("recusado")

    expect(lerConsentimento()).toBe("recusado")
  })
})
