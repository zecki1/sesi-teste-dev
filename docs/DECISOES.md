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
// appsettings.Development.json (opcional — o padrão do código já é SQLite)
{ "Database": { "Provider": "Sqlite" }, "ConnectionStrings": { "Catalogo": "Data Source=catalogo.db" } }

// Produção (Render)
{ "Database": { "Provider": "Npgsql" }, "ConnectionStrings": { "Catalogo": "<Internal Database URL>" } }
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
- **Decisão:** Usar **Render Web Service** com `Root Directory: backend`, Runtime `Docker`, `Dockerfile Path: Dockerfile`, e **Render PostgreSQL** na mesma região. Configurar `ASPNETCORE_URLS=http://+:${PORT}` e `ConnectionStrings__Catalogo` via **Internal Database URL**.
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
ConnectionStrings__Catalogo=<INTERNAL_DATABASE_URL>
Cors__AllowedOrigins__0=https://<seu-app>.vercel.app
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
- **Decisão:** **Vercel** para o frontend (`frontend/`) e **Render** para a API (`backend/`) + **PostgreSQL** gerenciado. Frontend e backend em projetos separados, ligados por `VITE_API_URL` e `Cors:AllowedOrigins`.
- **Motivo:** Vercel é ideal para Vite/SPA (build e CDN prontos); Render suporta Dockerfile em subpasta, tem Postgres gerenciado e integração nativa com GitHub.
- **Como:**
  1. **Vercel:** projeto linkado na pasta `frontend/` (via CLI), com `vercel.json` (D013).
  2. **Render Web Service:** repositório `zecki1/sesi-teste-dev`, `Root Directory: backend`, `Dockerfile Path: Dockerfile`, Runtime `Docker`, Branch `main`.
  3. **Render PostgreSQL:** mesma região do serviço; conectar via **Internal Database URL**.
  4. **Variáveis:** `ASPNETCORE_ENVIRONMENT`, `ASPNETCORE_URLS=http://+:${PORT}`, `Database__Provider=Npgsql`, `ConnectionStrings__Catalogo` e, se necessário, `Cors__AllowedOrigins__0` (o padrão já cobre localhost e `*.vercel.app`).
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
- **Desfecho (resolvido):** O travamento em `Running "install" command: npm ci...` era causado pelo **`installCommand: "npm ci"` fixado no `frontend/vercel.json`**, que sobrescrevia a configuração do projeto e travava a instalação sem cache. **Solução:** remover o `installCommand` do `vercel.json` (commit `645ffd7`). O deploy passou a `READY` imediatamente.
- **Extras aplicados:**
  - Desativada a **Vercel Authentication** (`ssoProtection`/`passwordProtection` = null) para o deploy de produção ficar público.
- **Resultado final (validado):**
  - Frontend público: **https://frontend-ezequiel-reginos-projects.vercel.app** → **HTTP 200**
  - Rotas SPA (`/`, `/catalogo`, `/curso/teste`) → **200** (rewrites funcionando)
  - Assets (`/assets/*.js`, `/assets/*.css`) → **200**
  - Fonte OpenDyslexic (`/fonts/OpenDyslexic-Regular.woff2`) → **200**
- **Aprendizado registrado:** No Vercel, evitar fixar `installCommand`/`buildCommand` no `vercel.json` quando a config do projeto já cobre — overrides podem conflitar com o comportamento de cache e travar o build.
- **Paralelos:** D013 (Vercel), D015 (infra de produção). Esta decisão é o **ponto de contato entre Frontend e Engenharia**: o build do frontend depende de configuração de projeto (Root Directory) e de ajustes de compilação (TypeScript 5) para ser publicado.

### D017 - CORS com curinga (`https://*.vercel.app`) na API

- **Data:** 22/10/2026
- **Problema:** O preflight `OPTIONS /api/v1/cursos` originado do domínio da Vercel retornava `204`, porém **sem** o header `Access-Control-Allow-Origin`. O navegador bloqueava as requisições do frontend publicado.
- **Causa raiz:** `policy.WithOrigins("https://*.vercel.app")` — o `WithOrigins` do ASP.NET Core **não aceita curingas**; a string era comparada literalmente e nunca casava com `https://frontend-...vercel.app`.
- **Decisão:** trocar `WithOrigins` por `SetIsOriginAllowed` com uma função de comparação que suporta `*` (regex com escape) e mantém comparação exata para as demais origens (`http://localhost:5173`, `http://127.0.0.1:5173`).
- **Motivo:** cobrir produção e os previews da Vercel sem abrir a API para qualquer origem (`AllowAnyOrigin`) e mantendo `AllowCredentials`.
- **Como foi feito:**
```csharp
static bool OrigemPermitida(string origem, string[] padroes) =>
    padroes.Any(padrao => !padrao.Contains('*')
        ? string.Equals(padrao.TrimEnd('/'), origem.TrimEnd('/'), StringComparison.OrdinalIgnoreCase)
        : Regex.IsMatch(origem, "^" + Regex.Escape(padrao).Replace("\*", ".*") + "$", RegexOptions.IgnoreCase));

policy.SetIsOriginAllowed(origem => OrigemPermitida(origem, corsOrigins))
      .AllowAnyHeader().AllowAnyMethod().AllowCredentials();
```
- **Validação:** novo teste de integração `Cors_DevePermitirOrigemVercel` (preflight com a origem de produção) — 12/12 testes de backend passando na época (suíte atual: 15/15).
- **Pendência:** a correção só vale em produção depois de novo deploy do Render (push no repositório).

### D018 - URL da API no build de produção (`.env.production`)

- **Data:** 22/10/2026
- **Problema:** o frontend publicado na Vercel fazia `fetch` para `http://localhost:5077` (visível no console do navegador), deixando o catálogo preso em "Carregando...". A variável `VITE_API_URL` não existia no projeto da Vercel e o fallback do código é o endereço local.
- **Decisão:** versionar `frontend/.env.production` com `VITE_API_URL=https://sesi-teste-dev.onrender.com` (URL pública, sem segredo) e liberar esse arquivo no `.gitignore` (`!.env.production`).
- **Motivo:** o build de produção passa a apontar para a API publicada mesmo sem configuração manual no painel; variáveis definidas no painel da Vercel continuam tendo precedência. O `npm run dev` segue usando `http://localhost:5077`.
- **Como foi feito:**
```gitignore
# frontend/.gitignore
.vercel
.env*
!.env.production
```
```bash
# frontend/.env.production
VITE_API_URL=https://sesi-teste-dev.onrender.com
```
- **Validação:** `npm run build` gera o bundle com a URL pública; testes E2E usam interceptação de rede e não dependem da API.

### D019 - Página 404 e erros de carregamento do curso

- **Data:** 22/10/2026
- **Problema:** rotas inexistentes (`/rota-que-nao-existe`) renderizavam uma tela vazia (o `Routes` não tinha rota coringa) e o detalhe do curso repetia a requisição 3x antes de exibir "Curso não encontrado", além de tratar erro de rede e 404 da mesma forma.
- **Decisão:**
  - Criar `NotFoundPage` e a rota `path="*"`.
  - Criar `ApiError` (com `status`) na camada de API e **não repetir** requisições quando o status é 404.
  - Diferenciar na página de detalhe: "Curso não encontrado" (404) vs. "Não foi possível carregar o curso" (falha de conexão), com link para o catálogo.
- **Motivo:** previsibilidade de navegação e mensagens corretas para cada causa, sem requisições inúteis.
- **Validação:** testes E2E `rota inexistente mostra página 404` e `curso inexistente mostra mensagem de não encontrado`.

### D020 - "Principais cursos" como slider e ícones de seta unificados

- **Data:** 22/10/2026
- **Problema:** a seção "Principais cursos" era um grid fixo (3 colunas no desktop), enquanto "Depoimentos" já era um carrossel horizontal. Isso quebrava a consistência da landing e escondia cursos no mobile (grid de 1 coluna, sem navegação lateral).
- **Decisão:**
  - Reaproveitar o mesmo padrão de carrossel dos depoimentos: trilha `snap-x snap-mandatory` com `scroll-pl-*`, cards `w-[85%]` / `calc((100%-1.5rem)/2)` / `calc((100%-3rem)/3)`, setas abaixo à direita, `aria-label` na região e nos botões.
  - Criar `src/components/ui/arrow-icons.tsx` (`ArrowLeft`/`ArrowRight`) com os SVGs fornecidos (48×48), usando `fill="currentColor"` em vez de `#0C0C0D`/`#FFFFFF` fixos.
  - Remover as `<mask>` dos SVGs originais: a máscara era um `rect` do tamanho do `viewBox`, ou seja, sem efeito — mantê-la só duplicaria `id` na página e impediria a troca de cor por CSS.
- **Motivo:** uma única linguagem de navegação na landing, setas que herdam a cor do contexto (`text-[var(--sesi-black)]` em fundo claro, `text-white` em fundo colorido) e acessibilidade de teclado (a trilha tem `tabIndex=0`).
- **Como foi feito:**
```tsx
// arrow-icons.tsx
<svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
  <path d="M27.6925 35.2271..." fill="currentColor" />
</svg>
```
```tsx
// Home.tsx — mesmo passo de scroll dos depoimentos
const card = track.querySelector<HTMLElement>("[data-card]")
const step = card ? card.offsetWidth + 24 : track.clientWidth
track.scrollBy({ left: direction * step, behavior: "smooth" })
```
- **Validação:** teste E2E `slider de principais cursos navega com as setas` (scrollLeft 0 → >0 → 0); Playwright manual em 1440/768/390 px (3/2/1 cards visíveis, setas `#0C0C0D` a 48 px); axe-core sem violações sérias na landing.

### D021 - Card de curso com imagem de capa, badge e gradiente de leitura

- **Data:** 22/10/2026
- **Problema:** o card dos "Principais cursos" usava um bloco de gradiente vermelho fixo (`h-48`) como "imagem", sem relação com o curso e sem hierarquia visual. A categoria era um texto solto e o CTA "Ver todos os cursos" ficava fora do carrossel, exigindo rolagem até o fim da seção.
- **Decisão:**
  - Card `aspect-[4/5]` com a capa do curso como imagem de fundo (`object-cover`, leve zoom no hover).
  - Categoria como badge (`bg-[var(--sesi-beige)]`, texto preto) no topo do card.
  - Sobreposição `linear-gradient(to top, var(--sesi-red), rgba(227,5,19,.9) 30%, rgba(227,5,19,.45) 62%, transparente 88%)` — a "cor destaque" (`#E30513`) cobre a base do card e garante o contraste do texto branco (título, descrição e `{cargaHoraria}h · {modalidade}`).
  - Último item do carrossel é um card preto "TODOS OS CURSOS" (seta bege, link para `/catalogo`); o botão "Ver todos os cursos" foi removido.
  - Capas em SVG em `frontend/public/cursos/`, com os mesmos nomes devolvidos pela API em `imagemUrl` (`/cursos/*.svg`) — nenhuma dependência externa, funciona offline e em produção.
  - O mesmo tratamento foi aplicado ao **grid do `/catalogo`**, acrescentando o status como badge escuro no topo (à direita) e mantendo carga horária e modalidade na base do card.
- **Motivo:** manter a identidade SESI (vermelho de destaque + bege) com legibilidade garantida, transformar o CTA em parte da navegação do carrossel e evitar fotos externas (licenciamento, peso e disponibilidade) num catálogo fictício.
- **Detalhe técnico:** os cards são inseridos antes do card de CTA quando a API responde, o que fazia o navegador ancorar a rolagem no fim da trilha (~1653 px). A trilha recebeu `overflow-anchor: none` e um `useLayoutEffect` que zera o `scrollLeft` em `[categoria, data]`.
- **Validação:** teste E2E `cards de curso têm imagem de capa, badge de categoria e CTA final` (7 cards, `naturalWidth > 0`, badge, CTA com `text-transform: uppercase`, ausência do botão antigo) e slider 0 → 413 → 0; capturas em 1440/390 px; axe sem violações sérias.

### D022 - Cursos do protótipo na landing, botão ao lado das setas e página de detalhe

- **Data:** 22/10/2026
- **Problema:** os 6 cursos exibidos na landing eram de Tecnologia, Gestão e Segurança do Trabalho, enquanto o protótipo do Figma usa os cursos de Matemática e Ciências da Natureza. A página de detalhe era uma lista de campos (nome breve, descrição, público-alvo, módulos em `<details>`), sem a hierarquia visual do protótipo (hero em duas colunas, vídeo, diferenciais, accordion e faixa de matrícula).
- **Decisão:**
  - Adicionar as categorias **Matemática** e **Ciências da Natureza** e os **6 cursos do protótipo** (3 + 3), todos com `Destaque = true`. Os 6 cursos anteriores continuam no catálogo com `Destaque = false`, mantendo 12 cursos, 5 categorias, 2 modalidades e 3 status — acima do mínimo da atividade (hoje são 3 modalidades, com Semi-presencial).
  - A landing consulta `GET /api/v1/cursos?destaque=true` e o filtro de categoria mostra apenas as categorias que têm cursos em destaque (evita opções que resultariam em lista vazia).
  - Botão **"Ver todos os cursos"** ao lado das setas (à esquerda), mantendo o card "TODOS OS CURSOS" como último item do carrossel.
  - **Detalhe do curso** (`features/curso/`):
    - Hero em duas colunas de 6: badge da categoria com ícone, título, início do curso (`dataDisponibilizacao`), certificação SESI, botão "Matricule-se" e, à direita, capa do vídeo com play (`VideoCurso`, mesmo padrão do CTA final).
    - 4 cards de diferenciais com os ícones bege fornecidos (certificação, professores, suporte, flexibilidade).
    - "Sobre o curso" em 4 + 8 colunas: à esquerda descrição, público-alvo e carga horária; à direita um accordion (Módulos, Aulas online e avaliações, Dúvidas frequentes).
    - Depoimentos com fundo amarelo (`--sesi-beige`, `#FCD19C`), cards brancos, texto preto e estrelas pretas; mesmos 5 depoimentos da landing.
    - "Precisa de ajuda para decidir? / Fale com a gente" com botão `mailto:` para `contato@sesindustria.com.br`.
    - Faixa preta com o nome do curso em loop (marquee) e botão "Matricule-se" fixo à direita; a animação é desligada em `prefers-reduced-motion`, e o texto do loop fica `aria-hidden` com o nome acessível em `sr-only`.
  - **Accordion sem dependência nova:** `src/components/ui/accordion.tsx` usa `<details>/<summary>` estilizado no padrão shadcn (divisórias, chevron que gira, conteúdo em `--sesi-muted`), preservando teclado e leitor de tela sem instalar Radix.
  - Seis novas capas SVG em `public/cursos/` seguindo o mesmo padrão das anteriores (régua, formas geométricas, gráfico, plano inclinado, erlenmeyer e camadas de material).
- **Motivo:** alinhar o conteúdo e a hierarquia visual ao protótipo do Figma, sem perder os requisitos mínimos da atividade (3+ categorias, 3 status, 2 modalidades) e sem adicionar bibliotecas de UI.
- **Validação:** backend 12/12; fixtures E2E regeradas da API real (12 cursos, 5 categorias, 6 destaques); E2E 9/9 + axe 3/3 (`/`, `/catalogo` e detalhe); capturas em 1440/390 px do hero, diferenciais, accordion, depoimentos amarelos, ajuda e faixa. (Contagens da época; suíte atual: backend 15/15 e E2E 22/22.)

### D023 - Área do aluno com login demonstrativo e AVA em rota própria

- **Data:** 22/10/2026
- **Problema:** o fluxo 03 do Figma é o AVA, mas a atividade também pede uma **área do aluno** com dados de perfil (nome, sobrenome, nascimento, certificados, e-mail, telefone, cursos matriculados, cursos em andamento, calendário e acessibilidade). Se o player ficasse em `/area-do-aluno`, a área de perfil e o curso se misturariam na mesma rota.
- **Decisão:**
  - `/area-do-aluno` é o **dashboard**: saudação, avatar, matrículas em andamento com progresso e botão “Continuar”, tabela de cursos, calendário do mês com próximas aulas, perfil, certificados, card de acessibilidade e atalho para o admin.
  - O player do curso fica em **`/area-do-aluno/curso/:slug`**, com módulos, aulas, busca, aula ativa e progresso. Sem perfil, a rota redireciona para o login.
  - **Login modal** com e-mail, “Continuar com Microsoft”, “Continuar com Gmail”, “Usar conta de teste” e cadastro (nome, sobrenome, nascimento, telefone, e-mail somente leitura). Fecha com `Esc` ou clique no backdrop e usa `aria-modal`.
  - Persistência em `localStorage` (`sesi.perfil.v1` e `sesi.sessao.v1`) via `src/lib/auth/perfil.ts`, com store observável (`usePerfil`) para atualizar todas as telas.
  - Contas de demonstração: `aluno@teste.com` (Ana Souza, 4 matrículas e 2 certificados) e `admin@sesindustria.com.br`. Qualquer e-mail `@sesi.com.br` recebe papel de administrador.
- **Motivo:** entregar a experiência completa dos dois fluxos sem introduzir um backend de identidade fora do escopo, mantendo a navegação previsível e o estado consistente entre dashboard e AVA.
- **Impacto:** autenticação e perfil são **demonstrativos e client-side**; não há senha, token ou validação no servidor. Ver `docs/LIMITACOES.md`.
- **Validação:** specs temporárias de Playwright cobriram login, cadastro, dashboard em PT/EN, mobile e AVA, sem erros de console ou de página.

### D024 - Sidebar de acessibilidade, idioma por fuso horário e VLibras

- **Data:** 22/10/2026
- **Problema:** o menu de acessibilidade era um popover flutuante que competia com o botão do VLibras e não tinha um lugar claro para o seletor de idioma. O i18n existia, mas não era aplicado de fato; o idioma precisava ser detectado pela região e persistido no perfil.
- **Decisão:**
  - Transformar o menu em **sidebar lateral direita** (`role="dialog"`, backdrop, `Esc`, foco no botão de fechar, bloqueio de rolagem do body), com filtros de visão, tamanho de fonte, modo dislexia, idioma e “Restaurar padrões”.
  - **Detecção por fuso horário** em `src/lib/i18n/idioma.ts`: `Europe/*` → `es-ES`; fusos dos EUA/Canadá → `en-US`; fusos do Brasil → `pt-BR`; fallback para o idioma do navegador e, por último, português.
  - A escolha manual grava `sesi.idioma.manual=1` e passa a ser respeitada nas próximas visitas; o idioma também é salvo no perfil (`atualizarPerfil`) e em `sesi.idioma`.
  - `aplicarIdioma` sincroniza o `lang` do `<html>` e o i18next; `iniciarIdioma` roda no `App` para aplicar no primeiro acesso.
  - Enquanto a sidebar está aberta, o VLibras é ocultado por `[vw]`, `[vw-access-button]`, `[vw-plugin-wrapper]` e `#vlibras-access-wrapper` — o widget injeta um wrapper próprio além do markup do `index.html`.
- **Motivo:** cumprir o requisito de acessibilidade com uma área dedicada, evitar sobreposição de controles flutuantes e tornar o idioma automático e persistente sem depender de um serviço externo de geolocalização.
- **Limitação:** o fuso horário é uma aproximação de região; VPN ou fuso manual pode escolher um idioma diferente do esperado, mas a escolha manual sempre prevalece.
- **Validação:** specs temporárias confirmaram US → inglês, Europa → espanhol e Brasil → português, persistência após recarregar, sidebar abrindo/fechando e VLibras oculto.

### D025 - Painel administrativo demonstrativo com blocos e SCORM

- **Data:** 22/10/2026
- **Problema:** a atividade não exige CRUD, mas o pedido do usuário foi expor, para o e-mail de administrador, uma página capaz de criar, editar e excluir cursos com os mesmos metadados do catálogo, oferecendo autoria em blocos (estilo Rise) **ou** upload SCORM.
- **Decisão:**
  - Rota `/admin/cursos`, protegida no cliente por `ehEmailAdmin` (`admin@sesindustria.com.br` ou qualquer `@sesi.com.br`), com aviso de demonstração.
  - Store **overlay** em `localStorage` (`sesi.cursos.admin.v1`) que mescla a lista da API com criações, edições e remoções locais (`src/features/admin/store.ts`), sem alterar a API nem o banco. **Substituído pelo D028**: o admin passou a gravar na API.
  - Lista com busca, estatísticas, badges de status e ações de editar/excluir; formulário com os metadados do catálogo (nome completo, nome breve, slug, descrição, carga, público-alvo, capa, data, destaque, categoria, modalidade e status).
  - **Editor de blocos:** módulos → aulas → blocos de `texto`, `vídeo`, `imagem` e `quiz`, com adicionar/remover e reordenação simples.
  - **SCORM:** seleção de arquivo e registro de metadados (nome, tamanho e versão 1.2/2004), sem upload real para servidor.
  - Ação “Restaurar dados de demonstração” limpa o overlay.
- **Motivo:** demonstrar o fluxo de autoria e a experiência administrativa sem criar escrita fictícia no banco de produção e sem ampliar o escopo obrigatório do backend.
- **Impacto:** as alterações valiam apenas para o navegador atual e **não apareciam no catálogo público**. O upload SCORM não persiste o arquivo. O overlay foi removido no D028; blocos e SCORM continuam demonstrativos.
- **Validação:** specs temporárias cobriram guarda de admin, listagem, criação/edição/exclusão, editor de blocos e formulário SCORM, sem erros de console.

### D026 - Página “Sobre” com conteúdo institucional e vídeos do SESI São Paulo

- **Data:** 22/10/2026
- **Problema:** o link “Sobre” do header não tinha uma página própria, e o pedido era combinar o conteúdo institucional do SESI com vídeos do canal oficial Sesi São Paulo.
- **Decisão:**
  - Criar `/sobre` com hero institucional, indicadores, história, missão/visão/valores, pilares de atuação, seção de vídeos e CTA vermelho para o catálogo.
  - Usar conteúdo baseado em `sesisp.org.br/institucional`, sem copiar textos longos, e vídeos reais do canal `@SesiSaoPauloOficial`: `JwELVGH-5YU`, `5TIFj2BYmp8` e `r35ozKIkj8M`.
  - Vídeos com **thumbnail e clique para carregar** o iframe `youtube-nocookie.com` (autoplay liberado pelo gesto), evitando peso e cookies de terceiros no carregamento inicial.
  - Atualizar os links “Sobre” do header e do footer para `/sobre`.
- **Motivo:** dar credibilidade institucional à entrega, usar mídia oficial real e manter performance/privacidade no primeiro carregamento.
- **Limitação:** a seção depende do YouTube; IDs ou disponibilidade podem mudar fora do controle do projeto.
- **Validação:** spec temporária conferiu textos, links externos e troca de thumbnail por iframe; axe sem violações na página.

### D027 - Idioma no topo da sidebar, tema escuro e elevação dos cards do carrossel

- **Data:** 22/10/2026
- **Problema:** o seletor de idioma existia no fim da sidebar de acessibilidade, mas ficava pouco visível; não havia tema escuro; e os cards do carrossel de cursos não respondiam ao hover com ênfase suficiente. O pedido foi tornar o idioma explícito na sidebar, avaliar a viabilidade do tema escuro e dar destaque ao card sob o mouse.
- **Decisão:**
  - **Idioma:** mover o seletor PT/EN/ES para o **topo da sidebar**, em um cartão com ícone de globo e botões compactos com `aria-pressed`. O idioma selecionado passa a ser derivado do `i18n.language` (e não de um estado local), evitando que a detecção automática do `App` deixe o botão marcado no idioma errado.
  - **Tema escuro:** adicionar **Claro/Escuro** na sidebar, com persistência em `sesi.a11y.v1` e no perfil (`ConfigAcessibilidade.tema`). O atributo `data-theme="escuro"` é aplicado no `<html>` por `src/lib/a11y/config.ts`, chamado em `main.tsx` **antes da primeira pintura**, e reaplicado pelo `AccessibilityMenu`.
  - **Camada de tema:** criar `src/styles/dark.css` com overrides dos utilitários existentes (`bg-white`, `text-[var(--sesi-black)]`, `text-[var(--sesi-muted)]`, `border-[var(--sesi-gray)]`, `bg-[#F5F5F5]`, inputs etc.), preservando o vermelho, o bege e o preto de marca. A faixa bege de depoimentos mantém cards brancos e texto preto; botões com `hover:bg-white` mantêm texto escuro no hover.
  - **Hover lift:** adicionar a classe `.card-lift` nos cards do carrossel da landing, com `translateY(-6px) scale(1.015)` e sombra no hover/foco. A trilha ganhou `pt-3`/`-mt-3` para o card não ser cortado pelo `overflow-x-auto`. A elevação é desligada em `prefers-reduced-motion`.
- **Motivo:** tornar o idioma descobrível, oferecer conforto visual sem perder a identidade da marca e dar feedback claro ao card sob o cursor/teclado, mantendo acessibilidade e legibilidade.
- **Como foi feito:**
```tsx
// AccessibilityMenu.tsx — idioma derivado do i18n
const idioma: Idioma = i18n.language === "en-US" || i18n.language === "es-ES" ? i18n.language : "pt-BR"
```
```tsx
// main.tsx — tema antes da primeira pintura
aplicarNaRaiz(lerConfig())
```
```css
/* globals.css — elevação do card */
.card-lift:hover,
.card-lift:focus-visible {
  transform: translateY(-6px) scale(1.015);
  box-shadow: 0 18px 40px rgb(0 0 0 / 0.22);
  z-index: 1;
}
```
- **Impacto:** o tema escuro cobre landing, catálogo, detalhe, área do aluno, AVA, admin e Sobre por overrides de superfície/texto, sem reescrever todos os componentes. O tema é opcional (não segue automaticamente o sistema) e widgets de terceiros (VLibras/YouTube) permanecem com a aparência original.
- **Validação:** `npm run typecheck` ✓; `npm run build` ✓; Vitest **6/6**; Playwright **22/22** (inclui idioma, tema persistido, slider, VLibras, cookies, matrícula e trava de rolagem do modal); axe **0** violações `serious`/`critical` em `/` e `/catalogo` nos temas claro e escuro; validação visual em landing, catálogo, detalhe, área do aluno, AVA, admin e Sobre; hover medido em `matrix(1.015, 0, 0, 1.015, 0, -6)`.
- **Paralelos:** D010 (acessibilidade), D024 (sidebar e idioma), D020/D021 (carrossel e cards).

### D028 - Cursos, turmas e matrículas persistidos na API

- **Data:** 22/10/2026
- **Problema:** o admin só gravava um overlay em `localStorage`; criação, edição e exclusão não chegavam ao catálogo público. Também não existiam turmas (data, dias, horário, modalidade e vagas) nem matrícula real para alimentar o calendário do aluno.
- **Decisão:**
  - Criar as entidades `Turma` e `Matricula` no domínio, com `DbSet`s e mapeamentos EF Core. `Turma` guarda `DataInicio`, `DataFim`, `DiasSemana`, `HorarioInicio`, `HorarioFim`, `Vagas`, `Ativa` e FK para `Modalidade`; `Matricula` guarda `UsuarioId` (e-mail no demo), `CursoId`, `TurmaId`, status, progresso e conclusão. Índice único em `(UsuarioId, TurmaId)`.
  - Adicionar a modalidade **Semi-presencial** ao seed e criar **duas turmas por curso** (`CatalogoTurmasSeeder`), uma na modalidade do curso e outra semi-presencial, com datas futuras e horários variados.
  - Expor `GET /api/v1/cursos/{slug}/turmas`, `POST /api/v1/matriculas`, `GET /api/v1/matriculas?usuarioId=...`, `POST /api/v1/cursos`, `PUT /api/v1/cursos/{slug}` e `DELETE /api/v1/cursos/{slug}`.
  - `POST`/`PUT` recebem `CursoSalvarRequest` com slugs de categoria/modalidade/status e módulos/aulas opcionais. A exclusão é **lógica** (`Ativo=false`) e o slug é renomeado para `...-{id}-desativado`, liberando o endereço para um novo curso.
  - O admin passou a listar da API e a usar `criarCurso`, `atualizarCurso` e `excluirCurso`; após cada mutação, invalida as queries de cursos/facetas/turmas. O overlay de `localStorage` foi removido.
- **Motivo:** fazer o CRUD refletir no catálogo e permitir que a matrícula alimente o calendário e o AVA com dados reais do backend.
- **Impacto:** blocos de conteúdo (texto/vídeo/imagem/quiz) e o upload SCORM continuam **demonstrativos**, embora módulos e títulos de aulas sejam gravados. O banco local precisou ser recriado porque o projeto usa `EnsureCreated()` (sem migrations). Em produção, um banco já existente precisa do mesmo cuidado.
- **Validação:** backend **15/15** (turmas, matrícula, duplicidade idempotente e CRUD), typecheck/build OK, E2E **22/22**; curso criado e excluído via API local refletiu na lista pública.

### D029 - Modal de matrícula com turmas e calendário real

- **Data:** 22/10/2026
- **Problema:** os botões “Matricule-se” levavam direto ao login/área do aluno, sem mostrar turma, data, horário, modalidade ou vagas; o calendário do aluno usava apenas datas estáticas.
- **Decisão:**
  - Criar `MatriculaModal` (`src/features/curso/components/matricula-modal.tsx`) acionado pelo hero e pela faixa de matrícula do detalhe. O modal mostra resumo do curso e turmas disponíveis com modalidade, início, dias, horário e vagas restantes.
  - Usar `useTurmas(slug)` para buscar turmas e `criarMatricula` para gravar. Sem perfil, o modal explica que é preciso entrar e oferece link para `/area-do-aluno`; matrícula duplicada devolve a existente (idempotente).
  - Em caso de sucesso, invalida `["matriculas", email]` e oferece “Ver meu calendário”.
  - A área do aluno combina matrículas locais (demo) com `GET /api/v1/matriculas`; o calendário gera as próximas ocorrências a partir de `DiasSemana`/`HorarioInicio`/`DataInicio` das turmas, com fallback estático quando não há matrícula no backend.
  - Textos do modal adicionados em PT/EN/ES.
- **Motivo:** concluir o fluxo de matrícula no próprio detalhe do curso e fazer o calendário refletir a turma escolhida.
- **Validação:** E2E `modal de matrícula mostra turmas e confirma a matrícula`; validação manual contra a API local com matrícula gravada e calendário preenchido; backend test `Matricula_DeveCriarERecuperar`.

### D030 - Slider de fonte, VLibras opcional e consentimento de cookies persistente

- **Data:** 22/10/2026
- **Problema:** o tamanho de fonte era uma fileira de botões; o VLibras era sempre carregado; e o banner de cookies reaparecia a cada recarga.
- **Decisão:**
  - Converter a sidebar lateral em **modal centralizado** (`max-w-xl`, `max-h-[90vh]`, backdrop e rolagem interna), mantendo foco preso, `Esc` e devolução do foco ao acionador.
  - Travar a rolagem da página com `body` fixo na posição atual e `overflow: hidden` em `html`/`body`; pausar o Lenis via eventos `sesi:travar-scroll`/`sesi:liberar-scroll` e marcar o modal com `data-lenis-prevent` para a roda do mouse rolar apenas o conteúdo interno.
  - Trocar os botões por um **range slider** com 4 passos fixos (`small`, `normal`, `large`, `xlarge`), `step=1` e `aria-valuetext` traduzido. Os rótulos A-/A/A+/A++ ficam visíveis abaixo e o valor é anunciado por `aria-live`.
  - Adicionar `vlibras: boolean` em `ConfigAcessibilidade` (padrão `true`). O widget continua no `index.html`, mas `html[data-vlibras="off"]` oculta o wrapper e os elementos `[vw]`; a escolha persiste em `sesi.a11y.v1`.
  - Persistir o consentimento em `localStorage` (`sesi.cookies.consent.v1`) **e** no cookie `sesi_cookies` (`path=/`, `max-age=1 ano`, `SameSite=Lax`). O banner só aparece quando não há decisão salva.
  - Prender o foco dentro do modal de acessibilidade e do modal de matrícula, devolvendo-o ao acionador ao fechar (Tab/Shift+Tab e `Esc`).
- **Motivo:** atender aos pedidos de acessibilidade com controles mais claros, dar ao usuário o poder de desligar o VLibras e evitar que o banner de cookies reapareça sem necessidade.
- **Validação:** Vitest **6/6** (inclui persistência do consentimento); E2E de slider, VLibras e cookies; axe sem violações `serious`/`critical` nas rotas testadas.

### D031 - Detalhe do curso enxuto e AVA em duas colunas

- **Data:** 22/10/2026
- **Problema:** o detalhe ainda exibia carga horária, modalidade e status ao lado do CTA e repetia público-alvo/carga horária em “Sobre o curso”. O accordion usava seta e durações, as FAQs eram poucas e as setas dos depoimentos eram imagens. O AVA estava com sidebar escura única e conteúdo genérico, distante do frame de duas colunas do Figma.
- **Decisão:**
  - **Detalhe:** remover o resumo ao lado de “Matricule-se”; retirar “Público-alvo” e “Carga horária” de “Sobre o curso”; listar módulos em `<ol>` com aulas em bullets e **sem durações**; trocar a seta do accordion por um **+** que gira 45° quando aberto; mencionar explicitamente “provas e avaliações”; incluir as **10 FAQs** fornecidas, numeradas de 1 a 10; usar `ArrowLeft`/`ArrowRight` em SVG inline (preto no detalhe bege e branco na landing vermelha).
  - **CTA flutuante:** a faixa de matrícula deixou de ser uma seção estática no fim da página. Ela fica `fixed` a 5 px do rodapé, na largura do container (`max-w-[1280px]`), com cantos arredondados, nome do curso fixo (sem marquee) e botão “Matricule-se”. Só aparece depois que o CTA principal sai da viewport e a página foi rolada; sobe de baixo para cima e volta a esconder ao retornar ao topo.
  - **Modal de login:** ao abrir em `/area-do-aluno`, aplica o mesmo bloqueio do modal de acessibilidade: `body` fixo na posição atual, `overflow: hidden` em `html`/`body`, pausa do Lenis via eventos e `data-lenis-prevent` no diálogo. A roda do mouse rola apenas o conteúdo interno; ao fechar, restaura estilos e posição.
  - **AVA:** grid de 12 colunas com sidebar `2` e conteúdo `10`. A sidebar tem bloco preto (rótulo “Certificação”, nome completo do curso, `<hr>` e progresso) e bloco branco (busca com lupa, “1. Introdução” com `1.1 Introdução`, `1.2 Boas práticas`, `1.3 Extras` e `2. Módulo 1` a `7. Módulo 6`). A direita exibe capa e conteúdo; “Boas práticas” e “Recomendações” usam o texto integral fornecido no curso de referência e uma versão adaptada ao nome do curso nos demais, e os módulos usam os dados da API ou placeholders curtos.
  - O progresso do AVA é calculado pela **posição do item selecionado** no menu (não pelo progresso fixo da matrícula), e a busca filtra os itens por número/título.
- **Motivo:** aproximar o detalhe e o AVA do Figma, remover informação redundante e entregar uma estrutura de curso replicável para todos os cursos.
- **Impacto/limitação:** o conteúdo dos módulos 4–6 e de módulos sem dados na API é placeholder; o progresso é demonstrativo e não persiste conclusão por aula no backend; as FAQs são conteúdo estático do front.
- **Validação:** `npm run typecheck` ✓; `npm run build` ✓; Vitest **6/6**; Playwright **24/24** (inclui AVA, catálogo, modais, acessibilidade e axe); validação visual em desktop e mobile.

### D032 - CTA da home no catálogo, capas WebP e ícone de categoria nos cards

- **Data:** 22/10/2026
- **Problema:** o “Matricule-se” do CTA final da home era um `<button>` sem destino, deixando ambíguo o próximo passo. Os cards usavam SVGs genéricos em `public/cursos`, enquanto o usuário forneceu fotos do Unsplash em `src/assets/images`. O badge dos cards não repetia o ícone de categoria exibido no detalhe.
- **Decisão:**
  - **CTA da home:** trocar o botão por um `Link` para `/catalogo`, preservando as classes visuais do botão secundário grande e a seta. O E2E da landing passou a clicar no CTA e conferir a URL.
  - **Imagens:** converter as **15** fotos JPG para WebP **1200×1500** (proporção 4:5 dos cards), com `ImageOps.exif_transpose` + `ImageOps.fit` (crop central, ajuste fino em fotos com assunto deslocado), qualidade 82 e `method=6`. Os JPGs originais foram removidos; as 15 WebP ficam em `src/assets/images`.
  - **Mapeamento:** criar `src/lib/ui/imagens-cursos.ts` com `imagemDoCurso`, que resolve a capa por slug (12 cursos do seed), depois por categoria (reserva para cursos novos) e, por fim, pela `imagemUrl` da API. Aplicado na home, no catálogo e nos cards da área do aluno.
  - **Ícone do badge:** extrair `ICONES_POR_CATEGORIA`/`iconeDaCategoria` para `src/lib/ui/icones-categoria.ts` e reutilizar no hero do detalhe e nos badges dos cards. Categorias sem ícone no detalhe continuam sem ícone no card, mantendo a paridade.
  - Os cards mantêm `<img>` absoluta com `object-cover` (equivalente a background), `loading="lazy"`, `decoding="async"` e o gradiente vermelho existente; `data-capa` identifica a capa nos testes e `data-categoria` identifica o ícone.
- **Motivo:** dar destino claro ao CTA da home, substituir ilustrações genéricas por fotos reais e manter a mesma linguagem visual entre detalhe e cards.
- **Impacto:** o bundle recebe apenas as 12 imagens usadas (~1,3 MB em WebP); as 3 restantes ficam como reserva no diretório. O mapeamento é estático no front e não altera a API nem o seed. Fotos do Unsplash exigem atenção à licença/atribuição se o projeto for publicado.
- **Validação:** `npm run typecheck` ✓; `npm run build` ✓; Vitest **6/6**; Playwright **24/24** (landing com clique no CTA, catálogo com 12 capas WebP, badge com ícone e `naturalWidth > 0`); backend **15/15**; validação visual em 1440 px.

### D033 - Sliders de cursos e depoimentos full-bleed, 4 cards + fração do 5º

- **Data:** 22/10/2026
- **Problema:** os trilhos de “Principais cursos” e “Depoimentos” estavam dentro do `Container` (máx. 1280 px), então no desktop apareciam 3 cards e um pedaço do 4º. O Figma usa a largura da página e mostra 4 cards completos com um pedaço do 5º.
- **Decisão:**
  - Tirar o trilho do `Container`: o título, o filtro e as setas continuam alinhados ao container, mas o trilho ocupa 100% da seção/página.
  - Criar as classes utilitárias `.slider-bleed` e `.slider-card` em `globals.css`. O trilho usa `padding-left` igual ao gutter do container (`max(2rem, (100vw - 1280px)/2 + 2rem)` no desktop), `padding-right: 0` e `scroll-padding-left` equivalente.
  - Largura do card: `calc((100vw - gutter - 6rem) / 4.25)` a partir de 1280 px, em que `6rem` são os 4 gaps de 24 px e `4.25` representa 4 cards + 25% do 5º. Entre 1024 e 1279 px, `calc((100vw - gutter - 4.5rem) / 3.25)` (3 cards + fração do 4º); no `sm`, `calc((100vw - 3rem - 1.5rem) / 2.15)` (2 cards + fração do 3º); no mobile, `85%`.
  - Aplicar as mesmas classes aos cards de curso (incluindo o card “Todos os cursos”) e aos depoimentos, mantendo `snap-x`, `scrollByCard` por largura do card + 24 px e o hover lift.
- **Motivo:** reproduzir a composição do Figma, aproveitar a largura da página e deixar explícito que há mais conteúdo à direita.
- **Impacto:** no desktop de 1440 px, os 4 primeiros cards ficam inteiros e o 5º aparece com ~72 px; em 1280 px, o 4º termina antes da borda e o 5º também aparece parcial. O último card, ao chegar ao fim do scroll, encosta na borda direita.
- **Validação:** E2E mede `getBoundingClientRect()` em 1440 px: trilho > 1280 px, 4º card com `right <= 1440` e 5º com `left < 1440` e `right > 1440`, tanto em cursos quanto em depoimentos; `typecheck` ✓, `build` ✓, Playwright **24/24**; validação visual em 1440, 768 e 390 px.

### D034 - Revisão fiel ao Figma: badges por categoria, drag nos sliders e AVA com status

- **Data:** 23/10/2026
- **Problema:** a revisão final contra o Figma mostrou badges de categoria sem padronização de caixa/cor/ícone, sliders que só respondiam às setas, títulos do footer e “Depoimentos” fora do caixa alto, faixa de matrícula em caixa alta, accordion “Módulos” aberto por padrão e um AVA com progresso vermelho/rótulo visual, sem logo sobre o banner e sem indicar o status de cada item do menu.
- **Decisão:**
  - **Badges:** aplicar `uppercase` em home, catálogo e detalhe; usar a `cor` da categoria como fundo e calcular o texto por luminância (limiar **0,179**, ponto de contraste equivalente entre preto e branco): preto em Matemática e Ciências da Natureza, branco em Tecnologia, Gestão e Segurança do Trabalho. `IconeCategoria` mantém os SVGs locais de Matemática/Ciências e usa `react-icons/fa` (`FaLaptopCode`, `FaChartLine`, `FaHardHat`) nas demais; `data-categoria` identifica o ícone nos testes.
  - **Sliders:** criar `useSliderArrastavel` com Pointer Events, `setPointerCapture`, limite de 4 px para diferenciar clique de arrasto, supressão do clique após arrastar, bloqueio do `dragstart` nativo de links/imagens e `data-arrastando` no trilho. O CSS aplica `cursor: grab`/`grabbing`, `user-select: none` e escala leve (`0.985`) nos cards durante o arrasto; as setas continuam funcionando.
  - **Textos:** títulos “Navegação”, “Cursos Populares” e “Suporte” do footer em maiúsculas; “Depoimentos” em maiúsculas; faixa de matrícula sem `uppercase` (apenas a primeira letra natural); accordion “Módulos” inicia fechado.
  - **AVA:** remover o rótulo visual “Progresso”, colocar o percentual **antes** da barra e pintar a barra de **branco** sobre o trilho `white/20`; manter `role="progressbar"` e `aria-label` traduzido para leitores de tela. Sobrepor o logo branco do SESI no canto superior esquerdo do banner. Envolver banner e texto em um `Container` dentro de `lg:col-span-10`. No menu, cada item recebe um ícone de status: **play** no item ativo, **check** nos já visitados e **círculo vazio** nos não visitados, com `data-status`.
  - **Curso de referência:** “Boas práticas” e “Recomendações” do curso de Matemática usam o texto integral fornecido; no detalhe, “Sobre o curso” usa a descrição da API (sem frase genérica) e lista os **3 módulos da API** (Grandezas e Unidades, Proporção e Escala, Aplicação na Usinagem); o AVA mantém os **6 itens** do Figma (3 reais + 3 placeholders curtos).
- **Motivo:** fechar a revisão visual contra o Figma, garantir contraste AA nos badges coloridos e tornar os sliders e o AVA mais próximos do comportamento esperado.
- **Impacto/limitação:** o arrasto é por mouse; no touch o scroll nativo continua; o status visitado/ativo e o progresso são estado local (não persistem no backend); o limiar de contraste é uma aproximação de luminância relativa, validada pelo axe.
- **Validação:** `npm run typecheck` ✓; `npm run build` ✓; Vitest **6/6**; Playwright **25/25** (20 fluxos + 5 verificações de axe/tema), incluindo drag dos dois sliders e status do AVA; backend **15/15**; axe **0** violações `serious`/`critical` em `/`, `/catalogo` e detalhe nos temas claro e escuro; validação visual em 1440 px.

### D035 - Clique x arrasto nos sliders e página configurável de curso SCORM

- **Data:** 23/10/2026
- **Problema:** o `setPointerCapture` era chamado no `pointerdown`, antes de existir arrasto, e o clique era redirecionado ao trilho — por isso o card não abria a página do curso. Durante o arrasto, o `snap-x snap-mandatory` do CSS competia com as atribuições de `scrollLeft`, deixando o movimento travado. Além disso, cursos entregues como pacote SCORM não tinham página própria nem forma de configurar banner, imagem, textos, títulos e carga horária.
- **Decisão:**
  - **Clique x arrasto:** só capturar o ponteiro e ativar `data-arrastando` depois de **6 px** de deslocamento. Clique simples não captura, não altera estado e segue o link normalmente; a supressão do clique vale apenas quando houve arrasto real (janela de 150 ms).
  - **Fluidez:** aplicar o `scrollLeft` em `requestAnimationFrame`, desligar o `scroll-snap-type` durante o arrasto, manter inércia proporcional à velocidade ao soltar e, no fim, encaixar suavemente no card mais próximo antes de religar o snap. Com `prefers-reduced-motion`, o encaixe é instantâneo.
  - **Página SCORM:** criar `/curso/:slug/scorm` com banner, imagem do curso, título, subtítulo, descrição, carga horária, versão do pacote e player. Se houver **URL de lançamento**, carrega um `iframe`; caso contrário, mostra o player demonstrativo com os metadados. A página sempre parte dos dados reais da API e aceita overrides.
  - **Configuração no admin:** seção “Página do curso SCORM” no editor, com os campos acima, ação “Página SCORM ↗” na lista e link de prévia. Como o backend não tem esses campos, a configuração é gravada no `localStorage` por slug (`sesi.scorm.pagina.{slug}`); campo vazio volta ao dado da API.
- **Motivo:** separar clique de arrasto sem perder a navegação, deixar o arrasto contínuo e dar ao curso SCORM uma página com o mesmo padrão visual e os mesmos dados do curso normal.
- **Impacto/limitação:** o arrasto continua sendo por mouse (no touch vale o scroll nativo); a configuração da página SCORM é por navegador. O rastreamento, checkpoint e retomada do pacote foram adicionados depois (D036).
- **Validação:** `npm run typecheck` ✓; `npm run build` ✓; Vitest **9/9**; Playwright **28/28** (22 fluxos + 6 verificações de axe/tema), incluindo clique simples abrindo o curso, drag sem navegar, página SCORM e axe na rota SCORM; backend **15/15**.

### D036 - Player SCORM no AVA e progresso monotônico

- **Data:** 23/10/2026
- **Problema:** “Continuar” no dashboard encaminhava todos os cursos à tela demonstrativa do AVA, mesmo quando havia um pacote SCORM publicado; o progresso SCORM persistido no backend não era agregado ao dashboard. Ao retomar um curso, também era necessário diferenciar continuar do último checkpoint e iniciar novamente sem apagar o maior percentual já alcançado.
- **Decisão:**
  - Quando um curso tem pacote SCORM publicado, o AVA abre o player real do pacote; cursos sem pacote continuam usando a jornada de módulos existente.
  - O player SCORM persiste checkpoint no backend por curso/aluno e mantém percentual máximo monotônico. O dashboard combina esse percentual com o progresso da matrícula e do AVA local, usando o maior valor.
  - Ao retornar a um pacote com checkpoint, apresentar as opções “Continuar de onde parei” e “Começar do início”. Reiniciar limpa apenas dados de retomada do SCORM (suspend data, posição, status, score e CMI); preserva o percentual máximo já atingido.
  - O SCORM 2004 `cmi.progress_measure` é normalizado de fração (0–1) para percentual (0–100).
  - A barra lateral mantém borda divisória à direita e o símbolo SESI fornecido, que já correspondia ao SVG solicitado.
- **Motivo:** entregar o conteúdo autoral dentro do fluxo de aprendizagem, recuperar o estado entre visitas e impedir regressão de progresso quando o aluno revisita módulos.
- **Impacto/limitação:** o checkpoint SCORM é persistido pelo backend; o progresso do AVA sem pacote SCORM continua no armazenamento local do navegador.
- **Validação:** `npm run typecheck` ✓; `npm run build` ✓; Vitest **14/14**; Playwright AVA **4/4**, incluindo abertura do pacote, retomada/reinício e progresso no dashboard; backend **17/17**.

### D037 - CORS para a porta alternativa do Vite

- **Data:** 23/10/2026
- **Problema:** quando a porta padrão `5173` está ocupada, o Vite inicia o frontend em `5174`. A API local aceitava somente `localhost:5173` e `127.0.0.1:5173`, então o navegador bloqueava as chamadas ao catálogo por CORS, mesmo com a API respondendo HTTP 200.
- **Decisão:** incluir as origens `http://localhost:5174` e `http://127.0.0.1:5174` na política CORS padrão de desenvolvimento, preservando a lista explícita configurada por ambiente. Registrar a porta alternativa no README e cobrir ambas as origens com teste de preflight.
- **Motivo:** permitir que o frontend local continue acessando a API quando o Vite seleciona automaticamente a próxima porta disponível.
- **Impacto/limitação:** a política configurada explicitamente por ambiente continua substituindo os padrões locais, conforme esperado; a alteração não amplia as origens de produção automaticamente.
- **Validação:** backend **19/19**; GET real ao catálogo com `Origin: http://localhost:5174` retornou HTTP 200, cabeçalho `Access-Control-Allow-Origin` correto e 13 cursos; preflight OPTIONS retornou HTTP 204 com CORS válido.

### D038 - Pacote SCORM substituível e página pública padronizada

- **Data:** 23/10/2026
- **Problema:** a página SCORM usava uma composição visual diferente do detalhe dos cursos em blocos, as configurações da página ficavam apenas no navegador, o upload tinha limite fixo de 100 MB e o ZIP original não podia ser baixado depois de publicado.
- **Decisão:** manter um pacote SCORM ativo por curso; oferecer download do ZIP original e substituição; persistir o limite global e a configuração pública da página no backend; permitir limites de 20, 50, 80, 100 ou 200 MB (padrão 100 MB); validar o pacote antes de substituir o ativo.
- **Como:** salvar índice, configurações e ZIPs originais no diretório privado definido por `Scorm:Root`; servir somente o conteúdo extraído no player; compartilhar no detalhe SCORM os componentes de hero, benefícios, accordion de módulos/FAQ, depoimentos, ajuda e matrícula usados pelos cursos em blocos.
- **Motivo:** reduzir divergência de experiência entre formatos, permitir administração consistente entre dispositivos e preservar o pacote atualmente publicado quando um novo ZIP for inválido.
- **Impacto/limitações:** o limite é imposto no cliente e novamente pela API; o conteúdo extraído permanece público em `/scorm`. O backend ainda não autentica nem autoriza por papel e o armazenamento requer disco persistente em produção. Upload de imagens/vídeos/documentos pelo editor e armazenamento Blob permanecem fora desta etapa.
- **Validação:** testes de integração verificam limite padrão/configurável, rejeição acima do limite, persistência da página, download do ZIP e substituição; validação E2E do template SCORM e do controle administrativo.

### D039 - Registro do uso de IA como apoio ao trabalho do autor

- **Data:** 23/10/2026
- **Contexto:** os registros anteriores podiam dar a entender que a IA havia conduzido ou produzido sozinha o projeto, quando o autor definiu os requisitos, tomou as decisões e conduziu a revisão.
- **Decisão:** documentar a IA como ferramenta auxiliar, principalmente para planejamento, sugestões de melhoria, análise de problemas, validação e apoio a testes. Não atribuir à IA a autoria integral das funcionalidades ou do projeto.
- **Responsabilidade:** o autor é responsável pelo escopo, pelas decisões e pela aceitação das alterações. Quando solicitado, o assistente pode preparar mudanças pontuais para revisão, mas elas não são consideradas aprovadas até a validação do autor.
- **Registro de processo:** manter o incidente do commit de 23/10/2026 às 10:01:45 e a regra de não criar commits sem autorização explícita; não omitir esse evento ao revisar o texto sobre uso de IA.
- **Validação documental:** alinhar `USO_DE_IA.md`, `LIMITACOES.md` e `TEMPO.md` a esta decisão, distinguindo janela de interação de esforço efetivo e registrando quais alterações ainda aguardam revisão/build/testes.
