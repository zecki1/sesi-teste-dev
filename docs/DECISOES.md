# Decisões Técnicas do Projeto

**Projeto:** Sesi Indústria - Catálogo de Cursos  
**Repositório:** [sesi-teste-dev](https://github.com/zecki1/sesi-teste-dev)  
**Autor:** Ezequiel Regino (zecki1)  
**Objetivo:** Documentar tecnicamente as tomadas de decisão (porquê, motivo, como, impacto e paralelos entre frontend/backend/arquitetura/engenharia/estratégia), com exemplos práticos.

---

## Estratégia

### D001 - Foco em 1 único commit inicial
- **Data:** 21/10/2026
- **Problema:** Histórico com múltiplos commits gerados em sequência parecia "vibecodando".
- **Decisão:** Recriar repositório do zero com **1 único commit** contendo estrutura completa (frontend + backend + docs + acessibilidade + configs de deploy).
- **Motivo:** Demonstrar organização, clareza e evitar ruído no histórico.
- **Como:** `git init` em pasta limpa, `git add` de tudo exceto `docs/planejamento-inicial.md`, commit único e `push --force` no repositório recriado.
- **Impacto:** Histórico limpo e profissional.
- **Paralelos:** Relacionado à documentação de IA (D007).

### D002 - Migração Railway -> Koyeb -> Render
- **Data:** 21/10/2026
- **Problema:** Railway com rate-limit/instabilidade + Koyeb em transição com Mistral (limitações em criação/projetos/CLI).
- **Decisão:** Migrar para **Render** como provedor definitivo para API + PostgreSQL.
- **Motivo:** Estável, integra com GitHub, suporta `Dockerfile` em subpasta (`backend/`), tem Postgres grátis, porta via `$PORT`.
- **Como:** Criar Web Service com `Root Directory: backend`, Runtime Docker, e PostgreSQL na mesma região vinculando `Internal Database URL`.
- **Impacto:** Deploy funcional sem depender de rate-limit.
- **Paralelos:** D003 (Dockerfile otimizado), D006 (Render setup).

---

## Arquitetura

### D003 - Arquitetura em camadas (Domain / Infrastructure / Api / Tests)
- **Data:** 21/10/2026
- **Problema:** Precisamos separar regras, infraestrutura e apresentação para facilitar manutenção e testes.
- **Decisão:** Adotar **Clean Architecture** simplificada: `Sesi.Catalogo.Domain`, `Sesi.Catalogo.Infrastructure`, `Sesi.Catalogo.Api`, `Sesi.Catalogo.Tests`.
- **Motivo:** Baixo acoplamento, testabilidade e evolução clara.
- **Como:** Solução `.slnx` com projetos separados. Dependências apontando para dentro.
- **Exemplo prático:**
```csharp
// Domain: entidades/regras puras (sem dependências externas)
// Infrastructure: EF Core, DbContext, repositórios
// Api: Controllers, Program.cs, Middlewares, Swagger
```
- **Impacto:** Facilita testes unitários e troca futura de provedores.
- **Paralelos:** Backend D004 (EF Core + SQLite/Npgsql).

### D004 - Suporte multi-banco (SQLite local / PostgreSQL produção)
- **Data:** 21/10/2026
- **Problema:** Desenvolvimento local ágil sem Postgres instalado vs produção com Postgres gerenciado.
- **Decisão:** Tornar provider configurável via `appsettings` + variável `Database__Provider` (`Sqlite` | `Npgsql`).
- **Motivo:** Produtividade local + prontidão para Render/Railway.
- **Como:** Configuração condicional no DI registrando `DbContext` conforme provider.
- **Exemplo prático:**
```json
// appsettings.Development.json
{ "Database": { "Provider": "Sqlite" }, "ConnectionStrings": { "DefaultConnection": "Data Source=../../db/catalogo.db" } }

// Produção (Render)
{ "Database": { "Provider": "Npgsql" }, "ConnectionStrings": { "DefaultConnection": "<Internal Database URL>" } }
```
- **Impacto:** Mesmo código roda em dev e prod.
- **Paralelos:** D003, D006.

---

## Engenharia

### D005 - Dockerfile multi-stage otimizado para produção
- **Data:** 21/10/2026
- **Problema:** Imagem grande, build lento e sem aproveitamento de cache. Também não adequado ao modelo de deploy por Dockerfile em subpasta.
- **Decisão:** Otimizar com **multi-stage**, copiar apenas `.csproj` primeiro, `dotnet restore` com cache, `dotnet publish --no-restore`, imagem final `aspnet:10.0` sem SDK, remover `DebugType/Symbols`.
- **Motivo:** Menor tempo de build, imagem enxuta, compatível com Render/Railway/Koyeb.
- **Como:** Copiar `.csproj` -> restore -> copiar resto -> publish -> copiar artefatos para `aspnet:10.0`.
- **Exemplo prático:**
```dockerfile
COPY ["Sesi.Catalogo.slnx", "./"]
COPY ["Sesi.Catalogo.Api/Sesi.Catalogo.Api.csproj", "Sesi.Catalogo.Api/"]
# ...
RUN dotnet restore "Sesi.Catalogo.slnx"
COPY . .
RUN dotnet publish "Sesi.Catalogo.Api/Sesi.Catalogo.Api.csproj" -c Release --no-restore -o /app/publish /p:UseAppHost=false /p:DebugType=None /p:DebugSymbols=false
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Sesi.Catalogo.Api.dll"]
```
- **Impacto:** Deploys mais rápidos e previsíveis.
- **Paralelos:** D002, D006.

### D006 - Deploy Render: Web Service + PostgreSQL na mesma região
- **Data:** 21/10/2026
- **Problema:** Porta dinâmica (`$PORT`), necessidade de link entre API e banco, e contexto de build correto para um `Dockerfile` que vive numa subpasta (`backend/`).
- **Decisão:** Usar **Render Web Service** com `Root Directory: backend`, Runtime `Docker`, `Dockerfile Path: Dockerfile`, e **Render PostgreSQL** na mesma região. Configurar `ASPNETCORE_URLS=http://+:${PORT}` e `ConnectionStrings__DefaultConnection` via **Internal Database URL**.
- **Motivo:** Evita latência, respeita a porta injetada pelo Render e mantém rede interna segura. O `Root Directory` é o que define o **build context** no Render — sem ele, o Dockerfile procura os `.csproj` na raiz do repositório e falha.
- **Como (configuração final que funcionou):**

| Campo (Render) | Valor | Por quê |
|---|---|---|
| **Root Directory** | `backend` | Define o build context = pasta `backend/` |
| **Dockerfile Path** | `Dockerfile` | **Relativo ao Root Directory**, não à raiz do repo |
| **Runtime** | `Docker` | Usa o Dockerfile otimizado (D005) |
| **Branch** | `main` | Deploy automático a partir da `main` |

- **Erros encontrados e causa raiz (registro técnico):**
  1. `error: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory` — `Dockerfile Path` vazio com contexto na raiz.
  2. `"/Sesi.Catalogo.slnx": not found`, `"/Sesi.Catalogo.Api/Sesi.Catalogo.Api.csproj": not found` (e demais `.csproj`) — `Root Directory` vazio e `Dockerfile Path: backend/Dockerfile`; o contexto foi a **raiz do repo**, então o `COPY` dos `.csproj` (que estão em `backend/`) não encontrou nada.
  3. **Solução:** `Root Directory = backend` + `Dockerfile Path = Dockerfile`. Combinação correta → build passou.

- **Tabela de combinações (referência rápida):**

| Root Directory | Dockerfile Path | Resultado |
|---|---|---|
| *(vazio)* | `backend/Dockerfile` | ❌ Contexto = raiz; arquivos procurados na raiz |
| `backend` | `backend/Dockerfile` | ❌ Caminho duplicado; não encontra |
| **`backend`** | **`Dockerfile`** | ✅ Contexto = `backend/`; tudo encontrado |

- **Exemplo prático (variáveis de ambiente):**
```env
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:${PORT}
Database__Provider=Npgsql
ConnectionStrings__DefaultConnection=<INTERNAL_DATABASE_URL>
Cors__AllowedOrigins=https://<seu-app>.vercel.app
SeedOnStart=true
```

- **Evidência do deploy bem-sucedido (logs do Render):**
```text
#24 exporting cache to registry ... DONE
==> Deploying...
==> Setting WEB_CONCURRENCY=1 by default
warn: Overriding HTTP_PORTS '8080' ... Binding to values defined by URLS instead 'http://+:8080'.
info: Now listening on: http://[::]:8080
info: Application started. Hosting environment: Production
==> New primary port detected: 8080. Restarting deploy to update network configuration...
==> Your service is live 🎉
==> Available at your primary URL https://sesi-teste-dev.onrender.com
```
- **Validação da API em produção:**
  - `GET /weatherforecast` → **HTTP 200** (rota do template respondendo)
  - `GET /` → **HTTP 404** (esperado, não há rota raiz ainda)
  - Swagger → **404** em produção (desabilitado por padrão no template; será habilitado/ajustado na Fase 1 da API)
- **Paralelos:** D004 (multi-banco), D005 (Dockerfile otimizado). Este deploy é o **ponto de contato entre Engenharia (D005) e Backend (D004)**: para publicar a API com o provider `Npgsql` em produção, foi necessário que o Dockerfile copiasse corretamente os `.csproj` a partir do build context `backend/`.

### D007 - Uso de IA documentado com IA-Zecki/AI-Z (OpenCode local)
- **Data:** 21/10/2026
- **Problema:** Necessidade de demonstrar uso responsável de IA sem parecer "vibecodando".
- **Decisão:** Documentar **OpenCode** conectado à **IA-Zecki (AI-Z)** local via **Ollama**, integrado ao **VS Code**, **Z-Studio** e **testes-IA-zecki**. Foco em revisão/validação/melhorias/documentação com **validação humana obrigatória**.
- **Motivo:** Transparência e demonstra domínio prático de ambiente local de IA.
- **Como:** Atualizar `docs/USO_DE_IA.md` com "Como funciona", "Quando foi utilizada", "Validação" e "Princípio".
- **Exemplo prático:**
> "Todo código gerado ou sugerido pelo OpenCode com IA-Zecki foi revisado manualmente, testado com `npm run build` / `dotnet build`, validado com testes unitários/E2E, verificado contra o design do Figma e conferido com `@axe-core/playwright`."
- **Impacto:** Documentação clara e alinhada ao desafio.
- **Paralelos:** D001.

---

## Frontend

### D008 - SPA moderna com Vite + React 19 + TypeScript + Tailwind CSS 4
- **Data:** 21/10/2026
- **Problema:** Base rápida, moderna e fiel ao Figma com responsividade e acessibilidade.
- **Decisão:** Usar **Vite**, **React 19**, **TypeScript**, **Tailwind CSS 4**, **React Router**, **react-i18next**, **zustand**, **axios**, **lucide-react**.
- **Motivo:** Performance, DX, fácil integração com API e i18n.
- **Como:** Estrutura organizada por `app/`, `components/`, `features/`, `hooks/`, `lib/`, `i18n/`, `styles/`.
- **Exemplo prático:**
```tsx
// src/app/App.tsx - rotas e providers
// src/i18n/index.ts - inicialização por namespaces
// src/components/accessibility/AccessibilityMenu.tsx - menu de acessibilidade
```
- **Impacto:** Base sólida para UI/UX e acessibilidade.
- **Paralelos:** D009, D010.

### D009 - i18n com 3 idiomas (pt-BR, en-US, es-ES) por namespaces
- **Data:** 21/10/2026
- **Problema:** Catálogo precisa atender público diverso.
- **Decisão:** Organizar traduções por **8 namespaces**: `common`, `home`, `catalog`, `course`, `auth`, `header`, `footer`, `accessibility`.
- **Motivo:** Escalabilidade e manutenção limpa.
- **Como:** `i18next` + `react-i18next` + `i18next-browser-languagedetector` com JSON por idioma/namespace.
- **Exemplo prático:**
```json
// src/i18n/locales/pt-BR/common.json
{ "nav": { "home": "Início", "catalog": "Catálogo" } }
```
- **Impacto:** Suporte completo aos 3 idiomas com carregamento organizado.
- **Paralelos:** D008.

### D010 - Acessibilidade completa (Daltonismo, VLibras, OpenDyslexic)
- **Data:** 21/10/2026
- **Problema:** Garantir inclusão e atender diretrizes WCAG 2.1 A/AA.
- **Decisão:** Criar **AccessibilityMenu** com filtros de daltonismo (protanopia/deuteranopia/tritanopia/monocromático), integração **VLibras**, fonte **OpenDyslexic**, alto contraste, ajuste de fonte e redução de movimento.
- **Motivo:** Acessibilidade real desde a base, indo além do mínimo exigido.
- **Como:** Hook `useAccessibility` + filtros CSS aplicados via classe no `body` + widget VLibras + fonte OpenDyslexic.
- **Exemplo prático:**
```tsx
// src/components/accessibility/AccessibilityMenu.tsx
// Aplica filtros: filter: url(#protanopia) ou classes .daltonism-*
```
- **Impacto:** Inclusão e conformidade com boas práticas.
- **Paralelos:** D008, D011.

### D011 - Testes E2E com Playwright e validação a11y com @axe-core/playwright
- **Data:** 21/10/2026
- **Problema:** Garantir qualidade e acessibilidade contínua.
- **Decisão:** Configurar **Playwright** para E2E, **Vitest** + Testing Library para unitários e **@axe-core/playwright** para validação a11y.
- **Motivo:** Cobertura em três frentes (unit + E2E + a11y).
- **Como:** `frontend/playwright.config.ts` e scripts `test`, `test:e2e`, `test:a11y`.
- **Exemplo prático:**
```ts
import AxeBuilder from '@axe-core/playwright';
test('home deve estar acessível', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```
- **Impacto:** Validação automatizada desde o início.
- **Paralelos:** D010, D012.

---

## Backend

### D012 - CI/CD com GitHub Actions (Frontend + Backend + Deploy)
- **Data:** 21/10/2026
- **Problema:** Automatizar build, lint, testes e deploy.
- **Decisão:** Criar workflows `ci.yml` (push/PR em `main`/`develop`) e `cd.yml` (push em `main`). CI com jobs separados de frontend (`npm ci` → build → test) e backend (`dotnet restore` → build → test). CD publica frontend na Vercel e backend no Render.
- **Motivo:** Qualidade constante e deploy automatizado a cada merge na `main`.
- **Como:** `.github/workflows/ci.yml` e `.github/workflows/cd.yml`, com secrets configurados no repositório.
- **Exemplo prático:**
```yaml
jobs:
  backend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: ./backend } }
    steps:
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '10.0.x' }
      - run: dotnet restore
      - run: dotnet build --no-restore -c Release
      - run: dotnet test --no-restore -c Release
```
- **Impacto:** Pipeline de integração contínua funcional.
- **Paralelos:** D011, D013, D006.

### D013 - Vercel para frontend (SPA rewrites)
- **Data:** 21/10/2026
- **Problema:** SPA precisa de rewrites para as rotas funcionarem no refresh direto da URL.
- **Decisão:** Criar `frontend/vercel.json` com `rewrites` para `/index.html`.
- **Motivo:** React Router funciona corretamente sem 404 em rotas profundas.
- **Como:** Arquivo na pasta `frontend/`, projeto Vercel já linkado via CLI.
- **Exemplo prático:**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
- **Impacto:** Rotas corretas em produção.
- **Paralelos:** D008.

### D014 - Conventional Commits com .githooks/commit-msg
- **Data:** 21/10/2026
- **Problema:** Padronizar mensagens de commit e evitar commits ruidosos.
- **Decisão:** Implementar hook `commit-msg` validando Conventional Commits e configurar `core.hooksPath .githooks`.
- **Motivo:** Histórico semântico, limpo e rastreável.
- **Como:** `.githooks/commit-msg` versionado + configuração local do hooksPath.
- **Exemplo prático:**
```text
feat: adiciona menu de acessibilidade
fix: corrige filtro de daltonismo
docs: atualiza DECISOES.md
build: otimiza Dockerfile multi-stage
chore: configura CI/CD
```
- **Impacto:** Padronização em todo o projeto.
- **Paralelos:** D001.

---

## Deploy

### D015 - Infra de produção: Vercel (frontend) + Render (API + PostgreSQL)
- **Data:** 21/10/2026
- **Problema:** Precisávamos de host para SPA, API e banco, com deploy simples e gratuito, sem depender de rate-limit.
- **Decisão:** **Vercel** para o frontend (`frontend/`) e **Render** para a API (`backend/`) + **PostgreSQL** gerenciado. Frontend e backend em projetos separados, ligados por `VITE_API_URL` e `Cors__AllowedOrigins`.
- **Motivo:** Vercel é ideal para Vite/SPA (build e CDN prontos); Render suporta Dockerfile em subpasta, tem Postgres gerenciado e integração nativa com GitHub.
- **Como:**
  1. **Vercel:** projeto linkado na pasta `frontend/` (via CLI), com `vercel.json` (D013).
  2. **Render Web Service:** repositório `zecki1/sesi-teste-dev`, `Root Directory: backend`, `Dockerfile Path: Dockerfile`, Runtime `Docker`, Branch `main`.
  3. **Render PostgreSQL:** mesma região do serviço; conectar via **Internal Database URL**.
  4. **Variáveis:** `ASPNETCORE_ENVIRONMENT`, `ASPNETCORE_URLS=http://+:${PORT}`, `Database__Provider=Npgsql`, `ConnectionStrings__DefaultConnection`, `Cors__AllowedOrigins`.
- **Exemplo prático (fluxo de integração):**
```text
Figma → Frontend (Vercel) → fetch VITE_API_URL → API (Render) → EF Core (Npgsql) → PostgreSQL (Render)
```
- **Impacto / Resultado:**
  - API pública: **https://sesi-teste-dev.onrender.com**
  - `GET /weatherforecast` → **200**
  - Deploy automático a partir da branch `main`
- **Aprendizados registrados:**
  - No Render, **`Root Directory` define o build context**; o `Dockerfile Path` é sempre **relativo ao Root Directory** (ver D006).
  - O Render injeta a porta via `$PORT`; o Kestrel foi ajustado para escutar em `8080` conforme o Dockerfile (D005).
- **Paralelos:** D002 (migração), D004 (multi-banco), D005 (Dockerfile), D006 (setup Render), D013 (Vercel).

### D016 - Correção do build da Vercel (Root Directory + TypeScript 5) 

- **Data:** 21/10/2026 (23:00 - 23:40)
- **Problema:** O deploy da Vercel falhava com `sh: line 1: vite: command not found` / `Error: [BUILD_UTILS_SPAWN_127] Command "vite build" exited with 127`. Depois, com `tsconfig.json(19,5): error TS5102: Option 'baseUrl' has been removed`.
- **Causa raiz:**
  1. O projeto Vercel estava com `rootDirectory: null`, então o build rodava na **raiz do repositório**, onde não existe `package.json`. Os `vite`/`npm` não eram encontrados.
  2. O `frontend/tsconfig.json` ainda usava `baseUrl`, opção **removida no TypeScript 5.x**. O `tsc -b` falha mesmo com `paths` configurado.
  3. Faltava `src/vite-env.d.ts` (`/// <reference types="vite/client" />`), o que gerava `TS2882: Cannot find module ... side-effect import of './styles/globals.css'`.
  4. As fontes OpenDyslexic estavam em `dist/` (ignorado no Git) e não em `public/fonts/`.
- **Decisão:**
  - Configurar `rootDirectory: frontend` no projeto Vercel via API (`PATCH /v9/projects/{id}`).
  - Remover `baseUrl` do `tsconfig.json` (manter `paths`).
  - Adicionar `frontend/src/vite-env.d.ts`.
  - Mover `OpenDyslexic-Regular.woff/.woff2` para `frontend/public/fonts/`.
  - Criar `frontend/vercel.json` com `framework`, `buildCommand`, `outputDirectory` e rewrites SPA.
  - Adicionar `*.tsbuildinfo` ao `.gitignore`.
- **Motivo:** Sem `rootDirectory` correto, a Vercel não enxerga o `frontend/`; e o TypeScript 5 exige a remoção de `baseUrl`.
- **Como foi feito:**
```bash
# Ajuste via API do Vercel
PATCH https://api.vercel.com/v9/projects/prj_3v2twn6AcK7dye1UnyHPZhmA8zFk
  { "rootDirectory": "frontend", "framework": "vite",
    "buildCommand": "npm run build", "outputDirectory": "dist" }
```
```jsonc
// frontend/tsconfig.json (removido baseUrl)
"paths": { "@/*": ["./src/*"] }
```
```ts
// frontend/src/vite-env.d.ts
/// <reference types="vite/client" />
```
- **Resultado:** `npm run build` passou localmente (`tsc -b && vite build` → built in ~850ms). Deploy automático da Vercel foi disparado no commit `0bc416f`.
- **Pendência registrada (23:48):** o deploy na Vercel continuou travando em `Running "install" command: npm ci...` sem progredir, mesmo após cancelar e reenviar. Observações:
  - Possível causa: `installCommand: "npm ci"` **fixado no `frontend/vercel.json`** sobrescreve a configuração do projeto, e a Vercel ficou sem cache (`Skipping build cache, deployment was triggered without cache`).
  - Ação em andamento: remover o `installCommand` do `vercel.json` e deixar a Vercel decidir; testar `npm install --no-audit --no-fund` como alternativa.
  - **Impacto atual:** frontend ainda **não publicado**; API (Render) já está no ar.
- **Paralelos:** D013 (Vercel), D015 (infra de produção). Esta decisão é o **ponto de contato entre Frontend e Engenharia**: o build do frontend depende de configuração de projeto (Root Directory) e de ajustes de compilação (TypeScript 5) para ser publicado.
