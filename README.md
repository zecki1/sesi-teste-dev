# Catálogo de Cursos - SESI Indústria

![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![.NET](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet)
![ASP.NET Core](https://img.shields.io/badge/ASP.NET%20Core-Web%20API-512BD4?logo=dotnet)
![E2E Tests](https://img.shields.io/badge/E2E-Passing-brightgreen)
![Unit Tests](https://img.shields.io/badge/Unit-Passing-brightgreen)
![A11y](https://img.shields.io/badge/axe-0%20critical%20violations-brightgreen)
![Deploy Front](https://img.shields.io/badge/deploy-Vercel-000000?logo=vercel)
![Deploy API](https://img.shields.io/badge/deploy-Railway-0B0D0E?logo=railway)

Aplicação do processo seletivo SESI - Desenvolvedor de Sistemas I: catálogo de cursos com front-end fiel ao design proposto, API em C#/.NET, banco de dados open source, integração completa e publicação em ambiente gratuito.

## Setup rápido

### 1. Dependências

```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
dotnet restore
```

### 2. Variáveis de ambiente

Crie os arquivos de configuração conforme necessário:

- **Frontend:** `frontend/.env.local` com `VITE_API_URL`
- **Backend:** `backend/Sesi.Catalogo.Api/appsettings.Development.json` ou variáveis de ambiente

### 3. Ambiente de desenvolvimento

```bash
# Frontend (http://localhost:5173)
cd frontend
npm run dev

# Backend (http://localhost:5000 / https://localhost:7000)
cd backend
dotnet run --project Sesi.Catalogo.Api
```

**E2E:** Na primeira vez, instale o navegador do Playwright com `npx playwright install chromium`.

## Documentação Complementar

| Documento | Descrição |
|-----------|-----------|
| [docs/USO_DE_IA.md](docs/USO_DE_IA.md) | Registro completo do uso de IA durante o desenvolvimento |
| [docs/LIMITACOES.md](docs/LIMITACOES.md) | Divergências com o Figma, pendências e limitações conhecidas |

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [docs/a11y/relatorio-axe.json](docs/a11y/relatorio-axe.json) | Relatório do axe (WCAG 2.0/2.1 A+AA) por rota, gerado por `npm run e2e:a11y` |
| [docs/screenshots/](docs/screenshots/) | Baselines visuais (desktop/mobile) |

## Funcionalidades

- **Catálogo de cursos** com busca por nome e filtros por categoria, modalidade e status (combináveis)
- **Contador de resultados** e botão "Limpar filtros"
- **Página de detalhes** do curso com módulos e aulas
- **Estados completos:** carregando, vazio e erro
- **Internacionalização** em 3 idiomas (pt-BR, en-US, es-ES) com organização por namespaces
- **AVA funcional** como host SCORM compatível com ADL (SCORM 1.2 e 2004)
- **Totalmente responsivo** e acessível
- **API documentada** com Swagger/OpenAPI 3.1

## Qualidade & Performance

| Métrica | Resultado |
|---------|-----------|
| Testes unitários | Passando (Vitest + Testing Library) |
| Testes E2E | Passando (Playwright, Chromium) |
| Acessibilidade (axe) | 0 violações graves/críticas nas rotas validadas |
| Build | OK |

## Acessibilidade

- **WCAG 2.1 A/AA** verificada via `@axe-core/playwright` em todas as rotas públicas (`npm run e2e:a11y`).
- **Internacionalização acessível:** atributo `lang` do `<html>` sincronizado com o idioma escolhido.
- **Navegação por teclado:** foco visível (`focus-visible:ring`) em todos os controles interativos.
- **Leitores de tela:** uso semântico de HTML, labels reais, `aria-live`, `role="status"` e `role="alert"`.
- **Alvos mínimos:** 24x24px em elementos interativos.
- **Redução de movimento:** respeita `prefers-reduced-motion`.
- **Filtros para daltonismo:** opção de simulação/ajuste para **monocromia**, **protanopia**, **deuteranopia** e **tritanopia**.
- **Controle de tamanho de fonte:** aumento/redução diretamente no menu de acessibilidade.
- **VLibras:** integração com [VLibras](https://vlibras.gov.br/) para tradução em Libras.
- **Fonte acessível:** inclusão da fonte [OpenDyslexic-Regular](frontend/public/fonts/OpenDyslexic-Regular.woff2) para apoiar pessoas com dislexia.

## Branches & Workflow Git

**Branches:** `main` (produção) e `develop` (integração). Features saem de `develop`.

### Padrão de commit (Conventional Commits)

```
<tipo>(<escopo>)?: <descrição no imperativo>
```

**Tipos:** `feat`, `fix`, `test`, `docs`, `design`, `ops`, `backend`, `chore`, `refactor`, `perf`, `style`, `ci`, `build`

**Exemplos:**
```bash
feat(catalogo): adiciona filtros combinados
fix(api): corrige validação de busca
test(e2e): cobre fluxo de catálogo
docs: atualiza README
```

### Hook local

Ative uma vez por clone:

```bash
git config core.hooksPath .githooks
```

O hook está em `.githooks/commit-msg` e valida a mensagem conforme o padrão (commits `Merge`, `Revert`, `fixup!`, `squash!` passam direto).

## Decisão de testes

- **Vitest + Testing Library** para lógica (`src/lib`) e componentes. Roda em `jsdom`, sem carregar CSS, com `coverage.all = false` — mede apenas arquivos exercitados pelos testes.
- **Playwright** para fluxos reais: carregamento de páginas, navegação, filtros, troca de idioma, acessibilidade (`axe`) e baselines visuais.

## Tecnologias

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | Vite, React 19, TypeScript, Tailwind CSS 4, React Router, TanStack Query, i18next |
| **Backend** | ASP.NET Core 10, Entity Framework Core 10, Swagger/OpenAPI |
| **Banco** | PostgreSQL (produção) / SQLite (desenvolvimento) |
| **Testes** | Vitest, Testing Library, Playwright, xUnit, FluentAssertions |
| **Deploy** | Vercel (frontend), Railway (API + PostgreSQL) |
| **CI/CD** | GitHub Actions |

## Autor

**Ezequiel Regino Monção** — [GitHub](https://github.com/zecki1) · [LinkedIn](https://www.linkedin.com/in/zecki1)

## Licença

Este projeto foi desenvolvido para fins de avaliação no processo seletivo SESI Indústria.
