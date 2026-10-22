# Catálogo de Cursos - SESI Indústria

## Objetivo da aplicação

Aplicação web para apresentar um catálogo de cursos disponíveis, permitindo consultar, pesquisar e filtrar cursos, além de visualizar informações detalhadas de cada oferta. Desenvolvida conforme protótipo Figma fornecido.

## Tecnologias utilizadas

### Front-end
- [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [React Router DOM](https://reactrouter.com/)
- [TanStack Query](https://tanstack.com/query)
- [i18next](https://www.i18next.com/) (suporte a 3 idiomas)
- [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) + [axe-core](https://github.com/dequelabs/axe-core)

### Back-end
- [ASP.NET Core 10](https://dotnet.microsoft.com/apps/aspnet)
- [Entity Framework Core 10](https://learn.microsoft.com/ef/core/)
- [Swagger/OpenAPI](https://swagger.io/)

### Banco de dados
- [SQLite](https://www.sqlite.org/) (desenvolvimento/local)
- [PostgreSQL](https://www.postgresql.org/) (produção) - configurável via `Database__Provider`

### Publicação
- [Vercel](https://vercel.com/) - Front-end
- [Render](https://render.com/) - Back-end + PostgreSQL

## Arquitetura da solução

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Front-end  │────▶│     API      │────▶│   Banco      │
│  (Vite/React)│     │  ASP.NET Core│     │ SQLite/PG    │
└─────────────┘     └─────────────┘     └─────────────┘
```

Arquitetura em camadas no back-end:
- **Domain**: Entidades, DTOs, Abstrações (interfaces)
- **Infrastructure**: DbContext, Repositórios, Seeders, Migrations/EnsureCreated
- **API**: Endpoints REST, configuração, Swagger

## Estrutura das pastas

```
repo/
├── frontend/                # Aplicação React + Vite
│   ├── src/
│   │   ├── app/            # Rotas e App
│   │   ├── assets/         # Imagens e ícones
│   │   ├── components/     # Componentes reutilizáveis (layout, ui, a11y)
│   │   ├── features/       # Páginas por feature (landing, catalogo, curso, ava)
│   │   ├── hooks/          # Custom hooks
│   │   ├── i18n/           # Internacionalização (pt-BR, en-US, es-ES)
│   │   ├── lib/            # Utilitários e API client
│   │   └── styles/         # Estilos globais e tokens
│   └── tests/              # Testes E2E com Playwright
├── backend/                 # API ASP.NET Core
│   ├── Sesi.Catalogo.Api/   # Camada de apresentação
│   ├── Sesi.Catalogo.Domain/# Camada de domínio
│   ├── Sesi.Catalogo.Infrastructure/# Camada de infraestrutura
│   └── Sesi.Catalogo.Tests/ # Testes de integração
└── docs/                    # Documentação técnica
    ├── DECISOES.md         # Registro de decisões técnicas
    ├── USO_DE_IA.md        # Uso de IA
    └── LIMITACOES.md       # Limitações e justificativas
```

## Instruções para execução

### Pré-requisitos
- [.NET SDK 10+](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/) e npm

### Executar Back-end (API)
```bash
cd backend
dotnet restore
dotnet run --project Sesi.Catalogo.Api
```
A API estará disponível em `http://localhost:5077`. Swagger em `/swagger` (desenvolvimento).

### Executar Front-end
```bash
cd frontend
npm install
npm run dev
```
O front-end estará disponível em `http://localhost:5173`.

Para conectar ao back-end local, configure `VITE_API_URL=http://localhost:5077` ou use o padrão.

## Configuração do banco

Configurado via `appsettings.json` / variáveis de ambiente:

```json
{
  "Database": {
    "Provider": "Sqlite"
  },
  "ConnectionStrings": {
    "Catalogo": "Data Source=catalogo.db"
  }
}
```

Para PostgreSQL em produção:
```env
Database__Provider=Npgsql
ConnectionStrings__Catalogo=Host=...;Database=...;Username=...;Password=...
```

O banco é criado automaticamente com `EnsureCreated()` e populado com dados fictícios via Seeders na inicialização.

## Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Health check |
| GET | `/api/v1/cursos` | Lista cursos com filtros, busca e paginação |
| GET | `/api/v1/cursos/{slug}` | Detalhe de um curso (módulos e aulas) |
| GET | `/api/v1/facetas` | Facetas para filtros (categorias, modalidades, status) |
| GET | `/api/v1/cursos/{slug}/progresso` | Progresso do aluno (header `X-Usuario-Id`) |
| POST | `/api/v1/sessoes-scorm` | Commit SCORM |
| GET | `/api/v1/sessoes-scorm?sessaoId=...` | Recupera sessão SCORM |

### Parâmetros de filtro em `/api/v1/cursos`
- `busca` - Pesquisa pelo nome (case-insensitive)
- `categoria` - Filtrar por slug da categoria
- `modalidade` - Filtrar por slug da modalidade
- `status` - Filtrar por slug do status
- `pagina` - Página (padrão: 1)
- `tamanho` - Itens por página (padrão: 12, máx: 48)
- `ordenar` - Ordenação (nome, nome-desc, carga, carga-desc, recentes)
- `destaque` - Filtrar destaques (true/false)

## Modelo de dados

### Entidades principais
- **Categoria** (3) - Tecnologia, Gestão, Segurança do Trabalho
- **Modalidade** (2) - Presencial, EAD
- **StatusCurso** (3) - Disponível, Em breve, Inscrições abertas
- **Curso** - Dados completos conforme especificação
- **Modulo** - Módulos do curso
- **Aula** - Aulas com descrição
- **AulaScorm** - Associação SCORM (1.2/2004)
- **SessaoScorm** - Sessão do aluno
- **TentativaScorm** - Histórico de tentativas

## Estratégia de responsividade

- **Mobile-first** com breakpoints Tailwind: `sm`, `md`, `lg`, `xl`
- **Header** responsivo com menu hamburger em mobile
- **Grid** adaptativo: 1 coluna (mobile) → 2 colunas (sm/md) → 3 colunas (lg)
- **Catálogo** com filtros em coluna no mobile, linha no desktop
- **AVA** com sidebar colapsável em telas menores

## Decisões de acessibilidade

- **Semântica HTML**: uso adequado de landmarks (`header`, `nav`, `main`, `footer`)
- **Navegação por teclado**: todos os elementos interativos são focáveis
- **Foco visível**: outline customizado com cor SESI
- **ARIA**: `aria-label`, `aria-modal` onde aplicável
- **Contraste**: cores principais seguem paleta com bom contraste
- **Acessibilidade avançada**: Menu de acessibilidade com filtros daltonismo, aumento de fonte, alto contraste, VLibras, modo dislexia (OpenDyslexic)
- **Testes a11y**: integração com axe-core via Playwright

## Processo de publicação

### Front-end (Vercel)
1. Projeto vinculado à pasta `frontend/` com `rootDirectory: frontend`
2. Build: `npm run build` (Vite)
3. Output: `dist/`
4. Rewrites SPA configurados em `vercel.json`

### Back-end (Render)
1. Web Service com `Root Directory: backend`
2. Build via Dockerfile (`Dockerfile Path: Dockerfile`)
3. Runtime: Docker
4. Variáveis de ambiente configuradas no painel Render

## Limitações conhecidas

Consulte [docs/LIMITACOES.md](docs/LIMITACOES.md) para detalhes sobre divergências entre Figma e implementação, justificativas e itens não concluídos.

## Links

- [Repositório GitHub](https://github.com/zecki1/sesi-teste-dev)
- [Documentação de Decisões](docs/DECISOES.md)
- [Uso de IA](docs/USO_DE_IA.md)
- [Limitações](docs/LIMITACOES.md)
