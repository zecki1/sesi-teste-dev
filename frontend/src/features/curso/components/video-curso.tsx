import { useState } from "react"
import videoThumb from "@/assets/video-thumb.png"

const VIDEO_ID = "UOALUskXHcY"

/** Capa do vídeo do curso com play; ao clicar, carrega o player do YouTube. */
export function VideoCurso({ titulo }: { titulo: string }) {
  const [tocando, setTocando] = useState(false)

  return (
    <div className="relative aspect-video overflow-hidden rounded-[var(--radius-lg)] bg-black ">
      {tocando ? (
        <iframe
          className="media-reveal h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
          title={`Vídeo sobre o curso ${titulo}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <>
          <img src={videoThumb} alt={`Capa do vídeo sobre o curso ${titulo}`} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => setTocando(true)}
            aria-label="Reproduzir vídeo sobre o curso"
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[var(--sesi-black)] shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
