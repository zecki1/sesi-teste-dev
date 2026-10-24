import { inflateSync } from "fflate"

const ASSINATURA_EOCD = 0x06054b50
const ASSINATURA_CENTRAL = 0x02014b50
const ASSINATURA_LOCAL = 0x04034b50
const TAMANHO_MAXIMO_MANIFESTO = 2 * 1024 * 1024

function encontrarManifesto(zip: Uint8Array) {
  const dados = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  const inicioBusca = Math.max(0, zip.byteLength - 22 - 0xffff)
  let fimDiretorio = -1

  for (let deslocamento = zip.byteLength - 22; deslocamento >= inicioBusca; deslocamento -= 1) {
    if (dados.getUint32(deslocamento, true) === ASSINATURA_EOCD) {
      fimDiretorio = deslocamento
      break
    }
  }

  if (fimDiretorio < 0) throw new Error("O arquivo não contém um diretório ZIP válido.")

  const quantidadeEntradas = dados.getUint16(fimDiretorio + 10, true)
  const tamanhoDiretorio = dados.getUint32(fimDiretorio + 12, true)
  const inicioDiretorio = dados.getUint32(fimDiretorio + 16, true)
  const fimDiretorioCentral = inicioDiretorio + tamanhoDiretorio
  let deslocamento = inicioDiretorio

  for (let indice = 0; indice < quantidadeEntradas && deslocamento < fimDiretorioCentral; indice += 1) {
    if (dados.getUint32(deslocamento, true) !== ASSINATURA_CENTRAL) {
      throw new Error("O arquivo ZIP contém uma entrada inválida.")
    }

    const metodo = dados.getUint16(deslocamento + 10, true)
    const tamanhoComprimido = dados.getUint32(deslocamento + 20, true)
    const tamanhoDescomprimido = dados.getUint32(deslocamento + 24, true)
    const tamanhoNome = dados.getUint16(deslocamento + 28, true)
    const tamanhoExtra = dados.getUint16(deslocamento + 30, true)
    const tamanhoComentario = dados.getUint16(deslocamento + 32, true)
    const deslocamentoLocal = dados.getUint32(deslocamento + 42, true)
    const inicioNome = deslocamento + 46
    const nome = new TextDecoder().decode(zip.subarray(inicioNome, inicioNome + tamanhoNome))

    const partesNome = nome.replace(/\\/g, "/").split("/")
    if (partesNome[partesNome.length - 1]?.toLowerCase() === "imsmanifest.xml") {
      if (tamanhoDescomprimido > TAMANHO_MAXIMO_MANIFESTO) {
        throw new Error("O manifesto SCORM excede o tamanho permitido para análise.")
      }
      if (dados.getUint32(deslocamentoLocal, true) !== ASSINATURA_LOCAL) {
        throw new Error("O cabeçalho do manifesto SCORM é inválido.")
      }
      if (metodo !== 0 && metodo !== 8) {
        throw new Error("O manifesto usa um método de compactação não suportado.")
      }

      const tamanhoNomeLocal = dados.getUint16(deslocamentoLocal + 26, true)
      const tamanhoExtraLocal = dados.getUint16(deslocamentoLocal + 28, true)
      const inicioConteudo = deslocamentoLocal + 30 + tamanhoNomeLocal + tamanhoExtraLocal
      const conteudo = zip.subarray(inicioConteudo, inicioConteudo + tamanhoComprimido)
      const manifesto = metodo === 0 ? conteudo : inflateSync(conteudo)

      if (manifesto.byteLength !== tamanhoDescomprimido) {
        throw new Error("O manifesto SCORM está incompleto ou corrompido.")
      }

      return new TextDecoder().decode(manifesto)
    }

    deslocamento += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario
  }

  throw new Error("Não encontrei o imsmanifest.xml no pacote selecionado.")
}

export async function detectarVersaoScorm(arquivo: File): Promise<"1.2" | "2004"> {
  const manifesto = encontrarManifesto(new Uint8Array(await arquivo.arrayBuffer()))
  const documento = new DOMParser().parseFromString(manifesto, "application/xml")

  if (documento.querySelector("parsererror")) {
    throw new Error("O imsmanifest.xml do pacote não é um XML válido.")
  }

  const schemaVersion = Array.from(documento.getElementsByTagName("*"))
    .find((elemento) => elemento.localName.toLowerCase() === "schemaversion")
    ?.textContent?.trim()
    .toLowerCase()

  if (schemaVersion?.includes("2004")) return "2004"
  if (schemaVersion?.includes("1.2")) return "1.2"
  throw new Error("Não consegui identificar a versão SCORM declarada no manifesto.")
}
