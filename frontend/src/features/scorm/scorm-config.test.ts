import { beforeEach, describe, expect, it } from "vitest"
import type { CursoDetalheDto } from "@/lib/api/catalogo"
import {
  carregarConfigScorm,
  configScormEfetiva,
  configScormPadrao,
  salvarConfigScorm,
} from "./scorm-config"

const curso = {
  id: 7,
  nomeCompleto: "Matemática para a Precisão",
  nomeBreve: "Medidas e Escalas",
  slug: "matematica-para-a-precisao",
  descricao: "Descrição vinda da API.",
  cargaHoraria: 24,
  publicoAlvo: "Técnicos",
  imagemUrl: "/cursos/matematica.webp",
  destaque: true,
  categoria: { id: 1, nome: "Matemática", slug: "matematica", iconeUrl: "/icons/matematica.svg", cor: "#D97706", ordem: 1 },
  modalidade: { id: 1, nome: "Presencial", slug: "presencial" },
  status: { id: 1, nome: "Disponível", slug: "disponivel" },
  modulos: [],
} as CursoDetalheDto

describe("scorm-config", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("usa os dados do curso como padrão", () => {
    const config = configScormPadrao(curso)

    expect(config.titulo).toBe(curso.nomeCompleto)
    expect(config.descricao).toBe(curso.descricao)
    expect(config.cargaHoraria).toBe(24)
    expect(config.botaoTexto).toBe("Iniciar curso")
    expect(config.versao).toBe("1.2")
  })

  it("salva e recupera a configuração por slug", () => {
    salvarConfigScorm(curso.slug, { ...configScormPadrao(curso), titulo: "Turma SCORM", cargaHoraria: 32 })

    expect(carregarConfigScorm(curso.slug)?.titulo).toBe("Turma SCORM")
    expect(carregarConfigScorm("outro-slug")).toBeNull()
  })

  it("combina a configuração salva com os dados da API", () => {
    salvarConfigScorm(curso.slug, { ...configScormPadrao(curso), titulo: "  ", cargaHoraria: 0 })

    const efetiva = configScormEfetiva(curso)
    expect(efetiva.titulo).toBe(curso.nomeCompleto)
    expect(efetiva.cargaHoraria).toBe(curso.cargaHoraria)
    expect(efetiva.imagemUrl).toBe(curso.imagemUrl)
  })
})
