# Uso de Inteligência Artificial

## Ferramenta utilizada

- **OpenCode**, integrado à stack local **IA-Zecki** / **Ollama**
- Revisão humana em todas as alterações, decisões e validações

## Como a IA foi usada

A IA foi usada como **auxílio** ao trabalho, **não como vibecoding**. Nenhuma entrega foi gerada de ponta a ponta e aceita sem leitura, teste e decisão humana: cada sugestão passou por revisão, validação no ambiente local e ajuste manual antes de entrar no projeto.

A IA ajudou **100% na formatação das documentações**, deixando os textos padronizados e mais fáceis de entender, sempre a partir das anotações pessoais e do conteúdo produzido durante o desenvolvimento.

## Objetivo do uso

- **Revisão** do código, dos textos e das decisões já tomadas
- **Criação de documentação** seguindo as anotações pessoais do autor
- **Validação das configurações de ambiente e arquitetura** (front-end, back-end, banco e deploy)
- **Identificação e correção de problemas antes da build e do deploy**
- **Formatação e padronização das documentações** para melhor entendimento
- **Apoio em tarefas repetitivas**, como transcrever textos, converter imagens, conferir contraste, revisar rotas e registrar o tempo de codificação

## O que a IA ajudou a fazer

- Formatar e padronizar os documentos (`README`, `DECISOES`, `LIMITACOES`, `TEMPO` e este arquivo)
- Transcrever textos entre idiomas e a partir das anotações pessoais
- Ajustar e revisar testes unitários e E2E
- Marcar o tempo de codificação
- Testar em múltiplos dispositivos e resoluções
- Validar desempenho e responsividade
- Ajustar tomadas de decisão para ficarem mais claras e padronizadas
- Apoiar a escrita das mensagens de commit

## Prompts relevantes

| Prompt | Aproveitado | Descartado |
|--------|-------------|------------|
| "Valide a estrutura do projeto conforme a especificação e aponte divergências" | Conferência de pastas, camadas e dependências | Sugestões de bibliotecas não necessárias |
| "Analise a API REST e verifique filtros, paginação e contratos" | Endpoints, DTOs, filtros combinados e respostas de erro | Abordagem com GraphQL sugerida |
| "Revise os componentes React comparando com o Figma" | Estrutura de componentes, layout e tokens | Designs muito diferentes do protótipo |
| "Valide as configurações de deploy na Vercel e no Render" | `rootDirectory`, Dockerfile, CORS e variáveis de ambiente | Sugestões com Railway/Koyeb (descartadas por rate-limit) |
| "Revise e melhore os testes de integração" | `WebApplicationFactory` + SQLite in-memory e casos de borda | Testes excessivamente complexos |
| "Analise a área do aluno e verifique perfil, certificados e calendário" | Dashboard, store de perfil em `localStorage` e AVA em rota própria | Autenticação real (fora do escopo) |
| "Verifique a acessibilidade da sidebar de idioma e a detecção por região" | Drawer acessível, detecção por fuso horário e persistência | Geolocalização por IP (descartada por privacidade) |
| "Revise turmas, matrícula e CRUD de cursos no backend" | Entidades `Turma`/`Matricula`, endpoints, seed de turmas e admin usando a API | Overlay em `localStorage` (removido) |
| "Valide o modal de matrícula com turmas e calendário" | `MatriculaModal`, `useTurmas`, `criarMatricula` e calendário a partir da turma | Login real (mantido demo client-side) |
| "Otimize o slider de fonte e a opção de desligar o VLibras" | Range com 4 passos fixos, `aria-valuetext` e `data-vlibras` persistido | Slider contínuo (ruim para acessibilidade) |
| "Verifique a persistência do aceite de cookies" | `localStorage` + cookie `sesi_cookies` com validade de 1 ano | Apenas estado em memória |
| "Revise o modal de acessibilidade e a trava de rolagem da página" | Modal centralizado, foco preso, `body` fixo, pausa do Lenis e rolagem só no conteúdo interno | Manter a sidebar lateral |
| "Reescreva o README com os padrões definidos no projeto de referência" | Estrutura, badges, tabelas e seções do README de referência | Imagens de E2E (removidas a pedido do usuário) |
| "Revise o detalhe do curso e padronize módulos, FAQs e setas" | Lista ordenada com bullets, ícone `+`, 10 FAQs e setas SVG inline | Manter carga horária/público-alvo duplicados em “Sobre” |
| "Analise o AVA em duas colunas comparando com o Figma" | Sidebar 2/12 preta+branca, busca, menu de introdução e 6 módulos, conteúdo à direita e placeholders | Player SCORM real (fora do escopo) |
| "Numere as FAQs, ajuste a faixa de matrícula e valide a trava de scroll do modal de login" | Numeração 1–10, faixa fixa a 5 px na largura do container, título estático e bloqueio de scroll com Lenis | Marcar a faixa como fixa o tempo todo (redundante com o CTA do hero) |
| "Verifique o CTA da home, converta as imagens para WebP e padronize os ícones dos cards" | `Link` para `/catalogo`, 15 WebP 1200×1500, mapeamento por slug com fallback por categoria e mapa de ícones compartilhado | Manter os SVGs genéricos ou duplicar o mapa de ícones |
| "Analise os sliders de cursos e depoimentos comparando com o Figma" | Trilhos fora do `Container`, classes `.slider-bleed`/`.slider-card`, gutter alinhado ao container e largura `4.25` cards a partir de 1280 px (3 + fração entre 1024–1279) | Manter 3 cards dentro do container ou usar `w-screen` (geraria overflow) |
| "Verifique o contraste e a acessibilidade dos badges por categoria" | `IconeCategoria` com SVGs locais + `react-icons/fa` e texto preto/branco por luminância (limiar 0,179) | Cores fixas que reprovavam no axe |
| "Revise o clique e o arrasto dos sliders de cursos e depoimentos" | `useSliderArrastavel` com limiar de arrasto, captura tardia do ponteiro, inércia e encaixe suave | Capturar o ponteiro no `pointerdown` (impedia o clique de abrir o curso) |
| "Teste a navegação assistida e verifique as rotas do catálogo, curso, AVA e admin" | Cobertura de clique, arrasto, setas, filtros, rotas e estados de erro | Testes com dependência de serviços externos |
| "Verifique a configuração da página de curso SCORM" | Página própria com banner, imagem, textos, títulos, carga horária e player configurável | Executar o pacote SCORM real (fora do escopo) |
| "Transcreva os textos do português para os demais idiomas e revise o tom" | Conteúdo em pt-BR, en-US e es-ES | Tradução automática sem revisão |
| "Revise a documentação e o README, conferindo rotas e números dos testes" | Contagens, rotas, comandos e tabelas conferidos nos arquivos | Números desatualizados ou não verificados |

## Como o conteúdo foi validado

- **Build local**: `dotnet build` e `npm run build` executados após cada alteração significativa
- **Testes**: 15 testes de integração da API, 9 testes unitários e 28 testes E2E/axe aprovados
- **Revisão manual**: todo código e texto revisados linha por linha antes de serem considerados
- **Testes em navegador**: validação visual em desktop, tablet e mobile, incluindo modal de acessibilidade, modal de matrícula, tema escuro e calendário
- **Navegação assistida**: percursos de catálogo, detalhe, matrícula, AVA e admin conferidos rota a rota
- **Testes de API**: endpoints testados com curl/Postman (cursos, turmas, matrículas e CRUD)
- **Acessibilidade**: axe sem violações `serious`/`critical` nas rotas públicas
- **Verificação de tipos**: TypeScript strict mode sem erros

## Exemplo de erro ou inadequação identificado

**Erro:** na configuração da Vercel, a sugestão inicial era manter `installCommand: "npm ci"` no `vercel.json`, porém isso travava o build na plataforma.

**Contexto:** durante o deploy do front-end, o build ficava preso em "Running \"install\" command: npm ci..." sem progredir.

## Correção realizada

- Removido `installCommand` do `frontend/vercel.json` para que a Vercel use sua configuração padrão
- Configurado `rootDirectory: frontend` via API do Vercel
- Corrigidos problemas de TypeScript 5 (remoção de `baseUrl`)
- Movidas as fontes para `public/fonts/`
- Adicionado `vite-env.d.ts`
- Resultado: deploy bem-sucedido, frontend publicado e acessível publicamente

**Erro:** após a exclusão lógica de um curso, a API devolvia **500** ao criar outro com o mesmo slug.

**Contexto:** o índice único de `Cursos.Slug` continuava valendo para o registro desativado. A validação da aplicação só consultava cursos ativos, então o `INSERT` falhava no banco.

**Correção realizada:**

- A exclusão lógica passou a renomear o slug para `{slug}-{id}-desativado`, liberando o endereço.
- O caso foi coberto por teste de integração de criar → atualizar → excluir → recriar.

**Erro:** o clique simples nos cards do slider não abria a página do curso.

**Contexto:** o `setPointerCapture` era chamado no `pointerdown`, antes de existir arrasto. Com isso, o clique era redirecionado ao trilho e não chegava ao link do card.

**Correção realizada:**

- O ponteiro passou a ser capturado somente depois do limiar de 6 px de arrasto.
- O clique é suprimido apenas quando houve arrasto real.
- O snap do CSS é desligado durante o arrasto e religado após o encaixe suave no card mais próximo, com inércia ao soltar.

**Lição aprendida:** testar as configurações de deploy em ambiente real, validar clique e arrasto separadamente e documentar as decisões com data/hora para referência futura.
