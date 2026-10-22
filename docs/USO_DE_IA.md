# Uso de Inteligência Artificial

## Ferramenta utilizada
- **OpenCode** com modelo **Big Pickle** (provider opencode)
- Integrado com stack local **IA-Zecki** / **Ollama**
- Utilizado em conjunto com revisão humana em todas as alterações

## Objetivo do uso
A IA foi utilizada para acelerar o desenvolvimento do projeto SESI Indústria, mantendo sempre o controle humano sobre decisões e validações. Os objetivos foram:

- Estruturar a arquitetura do projeto (front-end + back-end + banco de dados)
- Gerar código boilerplate seguindo padrões estabelecidos
- Implementar integrações entre camadas
- Criar documentação técnica
- Auxiliar na configuração de deploy (Vercel + Render)
- Identificar e corrigir problemas de build

## Prompts relevantes

| Prompt | Aproveitado | Descartado |
|--------|-------------|------------|
| "Crie a estrutura do projeto conforme especificação" | Estrutura de pastas e arquitetura em camadas | Sugestões de bibliotecas não necessárias |
| "Implemente API REST com filtros e paginação" | Endpoints, DTOs, filtros combinados | Abordagem com GraphQL sugerida |
| "Crie componentes React baseados no Figma" | Estrutura de componentes e layout | Designs muito diferentes do protótipo |
| "Configure deploy Vercel + Render" | Configurações corretas de rootDirectory/Dockerfile | Sugestões com Railway/Koyeb (descartadas por rate-limit) |
| "Crie testes de integração" | Testes com WebApplicationFactory + SQLite in-memory | Testes excessivamente complexos |

## Como o conteúdo foi validado
- **Build local**: `dotnet build` e `npm run build` executados após cada alteração significativa
- **Testes**: 9 testes de integração executados e aprovados
- **Revisão manual**: Todo código gerado foi revisado linha por linha antes de ser considerado
- **Testes em navegador**: Validação visual das páginas criadas
- **Testes de API**: Endpoints testados com curl/Postman
- **Verificação de tipos**: TypeScript strict mode sem erros

## Exemplo de erro ou inadequação identificado

**Erro:** Na configuração do Vercel, a IA sugeriu manter `installCommand: "npm ci"` no `vercel.json`, porém isso causava travamento do build na plataforma.

**Contexto:** Durante o deploy do front-end, o build ficava preso em "Running \"install\" command: npm ci..." sem progredir.

## Correção realizada
- Removido `installCommand` do `frontend/vercel.json` para que a Vercel use sua configuração padrão
- Configurado `rootDirectory: frontend` via API do Vercel
- Corrigidos problemas de TypeScript 5 (remoção de `baseUrl`)
- Movidas fontes para `public/fonts/`
- Adicionado `vite-env.d.ts`
- Resultado: Deploy bem-sucedido, frontend publicado e acessível publicamente

**Lição aprendida:** Sempre testar configurações de deploy em ambiente real e documentar decisões com data/hora para referência futura.
