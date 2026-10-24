import type { CursoDetalheDto } from "@/lib/api/catalogo"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { IconeCategoria, estiloBadgeCategoria } from "@/lib/ui/icones-categoria"
import { VideoCurso } from "./video-curso"

function formatarData(data?: string) {
  if (!data) return null
  const [ano, mes, dia] = data.split("-")
  return `${dia}/${mes}/${ano}`
}

interface HeroCursoProps {
  curso: CursoDetalheDto
  onMatricular: () => void
  titulo?: string
  subtitulo?: string
  imagemUrl?: string
  imagemFundoUrl?: string
  cargaHoraria?: number
  textoCta?: string
  aoClicarCta?: () => void
  dataScorm?: boolean
}

export function HeroCurso({
  curso,
  onMatricular,
  titulo,
  subtitulo,
  imagemUrl,
  imagemFundoUrl,
  cargaHoraria = curso.cargaHoraria,
  textoCta,
  aoClicarCta,
  dataScorm = false,
}: HeroCursoProps) {
  const { t } = useTranslation("course")
  const inicio = formatarData(curso.dataDisponibilizacao)
  const cta = aoClicarCta ?? onMatricular
  const matriculaEmBreve = curso.status.slug === "em-breve"
  const textoBotao = textoCta?.trim() || t("enroll")

  return (
    <section
      data-banner-scorm={dataScorm ? "" : undefined}
      className={`relative py-12 sm:py-16 ${imagemFundoUrl ? "isolate overflow-hidden bg-[var(--sesi-black)] text-white" : ""}`}
    >
      {imagemFundoUrl && (
        <>
          <img src={imagemFundoUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-25" />
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,12,13,0.92)_0%,rgba(12,12,13,0.76)_55%,rgba(12,12,13,0.45)_100%)]" />
        </>
      )}
      <Container className="relative grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <div data-aos="fade-up" className="flex flex-col gap-6 lg:col-span-6">
          <span
            style={estiloBadgeCategoria(curso.categoria.cor)}
            className="flex w-fit items-center gap-2 rounded px-4 py-2 text-sm font-semibold uppercase tracking-wide"
          >
            <IconeCategoria slug={curso.categoria.slug} className="h-5 w-5 shrink-0" />
            {curso.categoria.nome}
          </span>

          <h1 className="font-['Open_Sans_Condensed',sans-serif] text-4xl font-bold leading-[1.05] sm:text-5xl">
            {titulo || curso.nomeCompleto}
          </h1>
          {subtitulo && <p className={imagemFundoUrl ? "text-white/85" : "text-[var(--sesi-muted)]"}>{subtitulo}</p>}

          <ul className={`flex flex-col gap-3 ${imagemFundoUrl ? "text-white/85" : "text-[var(--sesi-muted)]"}`}>
            {dataScorm && (
              <li className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span>
                  {t("workload")}: <strong data-carga-scorm="" className={imagemFundoUrl ? "text-white" : "text-[var(--sesi-black)]"}>{cargaHoraria}h</strong>
                </span>
              </li>
            )}
            <li className="flex items-center gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center text-xs font-bold" aria-hidden="true">◎</span>
              <span>
                {t("modality")}: <strong className={imagemFundoUrl ? "text-white" : "text-[var(--sesi-black)]"}>{curso.modalidade.nome}</strong>
              </span>
            </li>
            {inicio && (
              <li className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                  <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span>
                  {t("startDate")}: <strong className={imagemFundoUrl ? "text-white" : "text-[var(--sesi-black)]"}>{inicio}</strong>
                </span>
              </li>
            )}
            <li className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                <path
                  d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>
                {t("certification")}: <strong className={imagemFundoUrl ? "text-white" : "text-[var(--sesi-black)]"}>SESI</strong>
              </span>
            </li>
          </ul>

          <div data-cta-principal className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={cta}
              disabled={matriculaEmBreve}
              withArrow={!matriculaEmBreve}
              className="rounded-lg"
            >
              {matriculaEmBreve ? t("enrollSoon") : textoBotao}
            </Button>
          </div>
        </div>

        <div data-aos="fade-up" data-aos-delay="120" className="lg:col-span-6">
          {imagemUrl ? (
            <img
              data-imagem-scorm={dataScorm ? "" : undefined}
              src={imagemUrl}
              alt={t("coverAlt", { curso: curso.nomeBreve })}
              width="1200"
              height="675"
              fetchPriority="high"
              decoding="async"
              className="aspect-video w-full rounded-[var(--radius-lg)] object-cover"
            />
          ) : (
            <VideoCurso titulo={curso.nomeBreve} />
          )}
        </div>
      </Container>
    </section>
  )
}
