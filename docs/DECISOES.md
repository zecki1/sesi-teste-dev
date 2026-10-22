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
- **Problema:** Porta dinâmica (`$PORT`), necessidade de link entre API e banco.
- **Decisão:** Usar **Render Web Service** com `Root Directory: backend`, Runtime `Docker`, e **Render PostgreSQL** na mesma região. Configurar `ASPNETCORE_URLS=http://+:${PORT}` e `ConnectionStrings__DefaultConnection` via **Internal Database URL**.
- **Motivo:** Evita latência, respeita porta injetada pelo Render e mantém rede interna segura.
- **Como:** Variáveis de ambiente no Web Service apontando para Internal URL do Postgres.
- **Exemplo prático:**
```env
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:${PORT}
Database__Provider=Npgsql
ConnectionStrings__DefaultConnection=<INTERNAL_DATABASE_URL>
Cors__AllowedOrigins=https://<seu-app>.vercel.app
SeedOnStart=true
```
- **Impacto:** API acessível externamente com porta correta e conexão estável ao banco.
- **Paralelos:** D004, D005.

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
- **Impacto:** Suporte comple
