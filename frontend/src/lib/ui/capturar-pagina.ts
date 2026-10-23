export async function capturarPaginaAtual(): Promise<string> {
  const { toJpeg } = await import("html-to-image")
  for (const [quality, pixelRatio] of [[0.65, 0.65], [0.5, 0.5], [0.4, 0.4]]) {
    const imagem = await toJpeg(document.body, {
      quality,
      pixelRatio,
      backgroundColor: "#ffffff",
      cacheBust: true,
      filter: (node) =>
        !(node instanceof HTMLElement && node.hasAttribute("data-support-ui")),
    })
    const tamanhoBytes = Math.floor(((imagem.length - imagem.indexOf(",") - 1) * 3) / 4)
    if (tamanhoBytes <= 4 * 1024 * 1024) return imagem
  }

  throw new Error("A imagem excede o limite de 4 MB mesmo após a compactação.")
}
