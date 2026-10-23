# Uso de Inteligência Artificial

## Ferramenta utilizada

- **OpenCode**, integrado à stack local **IA-Zecki** / **Ollama**
- Nesta rodada, a partir de **23/10/2026, aproximadamente 09:17 (horário de Brasília)**, também foi utilizado um assistente de IA via **Copilot SDK no VS Code**.
- O projeto, seus requisitos e suas decisões são conduzidos pelo autor; a IA é uma ferramenta de apoio.
- Sugestões e alterações propostas pela IA precisam de revisão e aprovação do autor antes de serem consideradas parte aceita do projeto.

## Registro de revisão e controle de alterações

- Em **23/10/2026 às 10:01:45 (horário de Brasília)**, o assistente criou por engano o commit `3721f1bf905a974c8512c34cc1dd39d031f7a4ad` diretamente na branch `main`, antes de o autor revisar ou aprovar as alterações. A mensagem também foi escrita em inglês, contrariando o padrão de commit descrito no README.
- O autor informou que não havia solicitado o commit e que ainda precisava revisar o trabalho. O ponteiro local de `main` foi restaurado para `869fb17` (o mesmo commit de `origin/main`); as alterações foram preservadas sem commit na branch de feature `feat/scorm-upload-player`. O commit acidental não foi mantido em `main`.
- **Regra de revisão acordada:** não criar commits até autorização explícita do autor após sua revisão.
- O horário do primeiro uso desta ferramenta nesta rodada é aproximado, registrado a partir do início do trabalho anotado no `docs/TEMPO.md`; não representa uma medição automática de esforço.
- As verificações descritas neste documento são registros do trabalho do projeto e não significam que a IA tenha executado ou produzido sozinha todas as implementações.
- A disponibilidade da API variou ao longo da rodada: houve verificações locais bem-sucedidas e, em uma conferência posterior, a API em `localhost:5077` estava indisponível. Não se deve interpretar validações anteriores como garantia de disponibilidade atual.
- O autor pediu que builds completas e novos commits aguardem sua revisão. As alterações mais recentes de interface não foram validadas por build/testes.

## Como a IA foi usada

A IA foi usada como apoio ao processo conduzido pelo autor, principalmente para:

- planejar próximos passos e organizar requisitos;
- sugerir melhorias e alternativas técnicas para avaliação do autor;
- inspecionar implementações existentes e ajudar a diagnosticar problemas;
- apoiar a validação de alterações, a análise de resultados de testes e a identificação de verificações necessárias;
- ajudar a redigir e organizar documentação com base nas informações fornecidas pelo autor.

Isso não significa que a IA tenha criado ou conduzido sozinha o projeto. O autor define o escopo, fornece o contexto, escolhe o que será aproveitado e é responsável por revisar e aceitar o resultado. Em algumas solicitações delimitadas, o assistente também preparou alterações pontuais diretamente nos arquivos para revisão; essas alterações não equivalem à autoria integral do trabalho e não devem ser consideradas aprovadas antes da revisão do autor.

## Objetivo do uso

- **Planejamento e sugestões** de melhorias a partir dos requisitos e das decisões do autor
- **Apoio à validação** das implementações e à interpretação de testes e erros
- **Revisão técnica** de código, documentação, configuração e arquitetura
- **Organização da documentação** com base no conteúdo e nas informações do autor
- **Apoio pontual** em tarefas repetitivas, como conferir rotas, acessibilidade e comportamento visual

## Formas de apoio prestadas pela IA

- Ajudar o autor a estruturar e revisar documentos (`README`, `DECISOES`, `LIMITACOES`, `TEMPO` e este arquivo)
- Sugerir casos de teste e ajudar a interpretar resultados de testes unitários, E2E e verificações manuais
- Apontar riscos, divergências e alternativas para o autor decidir
- Apoiar a conferência de desempenho, responsividade, acessibilidade, rotas e configurações
- Organizar decisões e requisitos em registros mais claros
- Preparar alterações pontuais quando solicitadas, para revisão do autor; isso não representa autoria independente do projeto

## Exemplos de solicitações de apoio

Os exemplos abaixo registram temas tratados com a IA. As implementações listadas descrevem o contexto avaliado ou o resultado discutido, e não atribuem à IA a autoria integral dessas funcionalidades.

| Solicitação | Contexto discutido com a IA | Alternativas não adotadas pelo autor |
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
| "Verifique a configuração da página de curso SCORM" | Página própria com banner, imagem, textos, títulos e carga horária configuráveis | Pacotes autorais reais ainda não usados na validação |
| "Foque no upload do pacote SCORM e no player, padronizando as páginas e configurando o limite no admin" | Planejamento, inspeção do fluxo existente, recomendações de validação e discussão de limites e riscos | O autor definiu o escopo e decide quais alterações e recomendações aceitar; Blob Storage e autenticação real permaneceram fora do escopo |
| "Transcreva os textos do português para os demais idiomas e revise o tom" | Conteúdo em pt-BR, en-US e es-ES | Tradução automática sem revisão |
| "Revise a documentação e o README, conferindo rotas e números dos testes" | Contagens, rotas, comandos e tabelas conferidos nos arquivos | Números desatualizados ou não verificados |

## Validações do projeto

Os resultados a seguir são evidências do projeto, não uma medida de quanto código foi produzido pela IA. O autor conduz a revisão e decide se a validação é suficiente. Builds e testes citados em registros anteriores se referem às rodadas em que foram executados; não cobrem automaticamente alterações posteriores.

- **Build local**: `dotnet build` e `npm run build` executados após cada alteração significativa
- **Testes**: 20 testes de integração da API, 14 testes unitários e 32 testes E2E/axe aprovados
- **Revisão manual**: responsabilidade do autor antes de aceitar alterações
- **Testes em navegador**: validação visual em desktop, tablet e mobile, incluindo modal de acessibilidade, modal de matrícula, tema escuro e calendário
- **Navegação assistida**: percursos de catálogo, detalhe, matrícula, AVA e admin conferidos rota a rota
- **Testes de API**: endpoints testados com curl/Postman (cursos, turmas, matrículas e CRUD)
- **Acessibilidade**: axe sem violações `serious`/`critical` nas rotas públicas
- **Verificação de tipos**: TypeScript strict mode sem erros; build de produção validada após a implementação SCORM

## Exemplo de diagnóstico com apoio da IA

**Problema analisado:** na configuração da Vercel, `installCommand: "npm ci"` no `vercel.json` fazia o build ficar parado em "Running install command".

**Apoio prestado:** a IA ajudou a analisar o sintoma e discutir alternativas. O autor avaliou a recomendação e conduziu a decisão de remover a configuração e ajustar `rootDirectory`.

**Resultado registrado no projeto**

- `installCommand` removido de `frontend/vercel.json` para usar a configuração padrão da Vercel
- `rootDirectory: frontend` configurado via API do Vercel
- Problemas de TypeScript corrigidos, fontes movidas para `public/fonts/` e `vite-env.d.ts` adicionado
- O deploy foi concluído e o front-end ficou acessível publicamente

Esse exemplo ilustra apoio à análise e à tomada de decisão; não significa que a IA tenha realizado sozinha todo o trabalho de configuração e deploy.

## Registro do apoio na rodada SCORM (23/10/2026)

- **Assistente utilizado:** assistente de IA via Copilot SDK no VS Code.
- **Papel principal:** apoiar o planejamento, a análise de problemas do upload/player e do progresso, as recomendações de melhoria e a interpretação das validações solicitadas pelo autor.
- **Decisões de produto e escopo:** tomadas pelo autor, incluindo pacote ativo por curso, download e substituição, limites de upload e persistência das configurações.
- **Alterações pontuais:** em respostas a solicitações específicas, o assistente também preparou mudanças localizadas para revisão. Elas não representam que a IA tenha criado ou conduzido sozinha a implementação completa e permanecem sujeitas à aprovação do autor.
- **Validação:** os testes/builds descritos em checkpoints anteriores pertencem àquelas rodadas. As alterações mais recentes de progresso SCORM, catálogo, dashboard administrativo e indicador de upload aguardam revisão; não foram executados build ou testes completos após essas mudanças.
- **Limites registrados:** Blob Storage, autenticação/RBAC reais e analytics completos continuam fora do escopo descrito nesta rodada.
