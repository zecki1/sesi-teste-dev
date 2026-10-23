import { describe, expect, it, vi } from "vitest"
import { assinarAlturaBannerCookie, definirAlturaBannerCookie } from "./cookie-banner-store"

describe("cookie-banner-store", () => {
  it("notifica os inscritos quando a altura muda", () => {
    const listener = vi.fn()
    const cancelar = assinarAlturaBannerCookie(listener)

    definirAlturaBannerCookie(180)

    expect(listener).toHaveBeenLastCalledWith(180)
    cancelar()
  })

  it("entrega a altura atual para quem se inscreve depois", () => {
    definirAlturaBannerCookie(120)
    const listener = vi.fn()

    const cancelar = assinarAlturaBannerCookie(listener)

    expect(listener).toHaveBeenCalledWith(120)
    cancelar()
  })

  it("para de notificar depois de cancelar a inscrição", () => {
    const listener = vi.fn()
    const cancelar = assinarAlturaBannerCookie(listener)
    cancelar()

    definirAlturaBannerCookie(90)

    expect(listener).toHaveBeenCalledTimes(1)
    definirAlturaBannerCookie(0)
  })
})
