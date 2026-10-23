import { beforeEach, describe, expect, it } from "vitest"
import {
  calcularPercentualAva,
  carregarProgressoAva,
  chaveProgressoAva,
  salvarProgressoAva,
} from "./progresso-ava"

const SLUG = "curso-teste"
const USUARIO = "aluno@teste.com"

describe("progresso do AVA", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("começa vazio", () => {
    expect(carregarProgressoAva(SLUG, USUARIO)).toBeNull()
  })

  it("salva visitados, último item e percentual", () => {
    salvarProgressoAva(SLUG, USUARIO, {
      visitados: ["introducao", "boas-praticas"],
      ultimo: "boas-praticas",
      percentualMaximo: 22,
    })

    const salvo = carregarProgressoAva(SLUG, USUARIO)
    expect(salvo?.visitados).toEqual(["introducao", "boas-praticas"])
    expect(salvo?.ultimo).toBe("boas-praticas")
    expect(salvo?.percentualMaximo).toBe(22)
  })

  it("não regride o percentual nem perde itens já visitados", () => {
    salvarProgressoAva(SLUG, USUARIO, {
      visitados: ["modulo-1", "modulo-2", "modulo-3", "modulo-4"],
      ultimo: "modulo-4",
      percentualMaximo: 67,
    })

    const salvo = salvarProgressoAva(SLUG, USUARIO, {
      visitados: ["modulo-3"],
      ultimo: "modulo-3",
      percentualMaximo: 33,
    })

    expect(salvo?.percentualMaximo).toBe(67)
    expect(salvo?.visitados).toEqual(["modulo-1", "modulo-2", "modulo-3", "modulo-4"])
  })

  it("separa o progresso por aluno", () => {
    salvarProgressoAva(SLUG, USUARIO, { visitados: ["introducao"], ultimo: "introducao", percentualMaximo: 11 })

    expect(carregarProgressoAva(SLUG, "outro@teste.com")).toBeNull()
    expect(chaveProgressoAva(SLUG, USUARIO)).toContain(SLUG)
  })

  it("calcula o percentual pelo total visitado e mantém o máximo", () => {
    expect(calcularPercentualAva(9, ["a", "b", "c"], 0)).toBe(33)
    expect(calcularPercentualAva(9, ["a"], 67)).toBe(67)
    expect(calcularPercentualAva(0, ["a"], 15)).toBe(15)
  })
})
