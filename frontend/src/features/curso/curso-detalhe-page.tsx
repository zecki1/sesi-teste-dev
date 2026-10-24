import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { MainLayout } from "@/components/layout/main-layout"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { useCurso } from "@/hooks/use-catalogo"
import { ApiError } from "@/lib/api/catalogo"
import { HeroCurso } from "./components/hero-curso"
import { BeneficiosCurso } from "./components/beneficios-curso"
import { SobreCurso } from "./components/sobre-curso"
import { DepoimentosCurso } from "./components/depoimentos-curso"
import { AjudaCurso } from "./components/ajuda-curso"
import { FaixaMatricula } from "./components/faixa-matricula"
import { MatriculaModal } from "./components/matricula-modal"

export function CursoDetalhePage() {
  const { t } = useTranslation("course")
  const { slug } = useParams<{ slug: string }>()
  const { data: curso, isLoading, isError, error } = useCurso(slug || "")
  const [matriculaAberta, setMatriculaAberta] = useState(false)

  if (isLoading) return <MainLayout><Container className="py-10">{t("loading")}</Container></MainLayout>

  if (isError || !curso) {
    const naoEncontrado = error instanceof ApiError && error.status === 404
    return (
      <MainLayout>
        <Container className="flex flex-col items-start gap-4 py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--sesi-red)]">
            {naoEncontrado ? t("notFoundEyebrow") : t("connectionEyebrow")}
          </p>
          <h1 className="font-['Open_Sans_Condensed',sans-serif] text-3xl font-bold sm:text-4xl">
            {naoEncontrado ? t("notFoundTitle") : t("connectionTitle")}
          </h1>
          <p className="max-w-xl text-[var(--sesi-muted)]">
            {naoEncontrado ? t("notFoundHint") : t("connectionHint")}
          </p>
          <Link to="/catalogo">
            <Button variant="primary" className="mt-2">{t("backToCatalog")}</Button>
          </Link>
        </Container>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <HeroCurso curso={curso} onMatricular={() => setMatriculaAberta(true)} />
      <BeneficiosCurso />
      <SobreCurso curso={curso} />
      <DepoimentosCurso curso={curso} />
      <AjudaCurso curso={curso} />
      <FaixaMatricula
        nomeCurso={curso.nomeCompleto}
        onMatricular={() => setMatriculaAberta(true)}
        matriculaEmBreve={curso.status.slug === "em-breve"}
      />
      <MatriculaModal curso={curso} aberto={matriculaAberta} onFechar={() => setMatriculaAberta(false)} />
    </MainLayout>
  )
}
