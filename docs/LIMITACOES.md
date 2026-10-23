# Limitações Conhecidas

## Divergências entre Figma e implementação

| Item | Observação no Figma | Implementação | Justificativa |
|------|---------------------|---------------|---------------|
| **Seção "Principais cursos"** | Mostra apenas filtro "Todos os cursos" (select simples) | Implementado com filtros completos no catálogo + seção simplificada na landing | O enunciado exige pesquisa + 3 filtros + contador + limpar filtros. Adicionado no catálogo conforme obrigatoriedade. |
| **Contador de resultados** | Não exibido | Exibido como "X resultado(s) encontrado(s)" | Exigido pelo desafio: "Apresentar a quantidade de resultados". |
| **Mensagem "Nenhum curso encontrado"** | Não observada | Implementada com botão "Limpar filtros" | Exigido pelo desafio. |
| **Estado de carregamento** | Não observado | Implementado | Exigido pelo desafio: "Apresentar estado de carregamento". |
| **Mensagem de erro** | Não observada | Implementada | Exigido pelo desafio: "Apresentar mensagem em caso de erro". |
| **Detalhes do curso** | Hero e “Sobre” mais enxutos, sem resumo ao lado do CTA, público-alvo ou carga horária | Hero mantém categoria, nome, início, certificação e CTA; os dados completos ficam no cadastro/admin e no modal de matrícula | Ajuste visual pedido para aproximar o detalhe do Figma; o enunciado continua atendido pelo catálogo e pelo modal. |
| **Módulos/Aulas** | Aparecem apenas no AVA (fluxo 03) | Exibidos também no detalhe, em lista ordenada e sem durações | Exigido pelo enunciado e ajustado ao layout do Figma. |
| **Seletor de idioma** | Não presente no Figma | Adicionado no modal de acessibilidade (PT/EN/ES) | Requisito de internacionalização e acessibilidade; a escolha é persistida no perfil. |
| **Menu de acessibilidade** | Não presente no Figma | Modal centralizado com filtros de visão, fonte, dislexia, idioma e VLibras | Decisão estratégica para atender aos requisitos de acessibilidade sem poluir o layout. |
| **Área do aluno** | O Figma mostra o AVA, não um dashboard de perfil | `/area-do-aluno` virou dashboard e o AVA foi para `/area-do-aluno/curso/:slug` | O pedido exige perfil, matrículas, certificados e calendário **além** do player. |
| **Página "Sobre"** | Não detalhada no protótipo | Página institucional própria em `/sobre` | Pedido do usuário: misturar conteúdo do SESI com vídeos do canal Sesi São Paulo. |

## Itens não concluídos ou demonstrativos

| Item | Status | Motivo |
|------|--------|--------|
| **CRUD real de cursos no backend** | Implementado | `POST/PUT/DELETE /api/v1/cursos` e o admin usam a API. A exclusão é lógica e libera o slug. |
| **Autenticação/Autorização real** | Demonstrativa | Login, cadastro, perfil e papéis são simulados em `localStorage`. Não há senha, token, sessão no servidor ou validação de identidade. |
| **Login com Microsoft/Gmail** | Demonstrativo | Os botões apenas entram com um perfil de exemplo; não há OAuth configurado. |
| **Upload SCORM real** | Parcial | O admin registra nome, tamanho e versão (1.2/2004) do arquivo e configura a página pública, mas não envia nem executa o pacote. O backend já expõe endpoints de sessão SCORM. |
| **Página do curso SCORM** | Demonstrativa | `/curso/:slug/scorm` usa banner, imagem, textos, títulos, carga horária e URL de lançamento configurados no admin. A configuração fica no `localStorage` (por navegador) e não há rastreamento SCORM (`initialize`/`commit`). |
| **Blocos de conteúdo no backend** | Parcial | Módulos e títulos de aulas são gravados; o conteúdo dos blocos (texto/vídeo/imagem/quiz) e o SCORM continuam demonstrativos no editor. |
| **Matrícula real** | Implementada no backend | `POST /api/v1/matriculas` grava curso, turma e e-mail do perfil. Como a autenticação é demo, o `UsuarioId` é o e-mail informado no cliente, sem validação de identidade. |
| **Conteúdo dos cursos em 3 idiomas** | Parcial | A interface (navegação, catálogo, área do aluno, AVA, acessibilidade e erros) é traduzida; os textos dos cursos vindos da API permanecem em português. |
| **Conteúdo do AVA** | Parcial | “Introdução”, “Boas práticas” e “Recomendações” têm texto real (o curso de referência usa o texto integral fornecido); os módulos usam os dados da API e os excedentes (4–6) são placeholders curtos. Não há player SCORM funcional. |
| **Progresso do AVA** | Demonstrativo | O percentual é calculado pela posição do item selecionado no menu; os ícones de status (play/check/vazio) e a conclusão por aula não são persistidos no backend. |
| **FAQs do detalhe do curso** | Estáticas | As 10 perguntas e respostas ficam no front-end e não são editáveis pelo admin. |
| **E2E dos fluxos novos** | Implementado | A suíte permanente tem **28 testes** (22 fluxos + 6 verificações de axe/tema), incluindo modal de matrícula, login, AVA, página SCORM, slider de fonte, VLibras, cookies, trava de rolagem dos modais, clique e drag dos sliders de cursos/depoimentos. |
| **Polimento visual 100% fiel ao Figma** | Em revisão | O foco foi atender aos requisitos funcionais e à hierarquia visual; ajustes finos podem ser feitos após a revisão do usuário. |

## Limitações técnicas

- **Banco SQLite em dev:** arquivo local, ideal para desenvolvimento. Em produção usar PostgreSQL (`Database__Provider=Npgsql`).
- **Schema sem migrations:** o backend usa `EnsureCreated()` + seeders idempotentes. As tabelas novas (`Turmas` e `Matriculas`) exigem recriar o banco local; em produção, um banco já existente precisa ser recriado ou migrado manualmente. Não há histórico de migrations neste projeto.
- **Capas dos cursos:** 12 fotos WebP (1200×1500) do Unsplash, mapeadas por slug; cursos novos usam a imagem de reserva da categoria ou a `imagemUrl` informada no admin. As 15 imagens fornecidas foram convertidas para WebP, sendo 12 aplicadas e 3 mantidas como reserva. Os SVGs antigos seguem em `public/cursos` apenas como fallback da API.
- **API em localhost:** para testes locais completos, front-end e back-end precisam estar rodando. Os E2E usam fixtures e não dependem da API.
- **Deploy:** front-end na Vercel e API no Render (plano gratuito, sujeito a cold start).
- **API em produção:** a correção de CORS (D017) e a URL da API em `.env.production` (D018) só passam a valer após o próximo deploy de Render/Vercel.
- **Lint:** o script `npm run lint` foi removido — o projeto usa TypeScript 7 e o `typescript-eslint` atual declara suporte apenas até `<6.1.0`. A verificação estática é feita por `npm run typecheck`.
- **Bundle:** o JS de produção fica em ~685 kB (GSAP + AOS + Lenis + i18n), acima do limite de aviso de 500 kB do Vite. Cabe code splitting das libs de animação e dos locales.
- **VLibras:** o widget oficial é carregado por script externo (`vlibras.gov.br`). A sobreposição com o modal foi corrigida ocultando o wrapper enquanto ele está aberto; o usuário também pode desativá-lo pelo modal. O widget continua dependendo de rede e de terceiros.
- **Vídeos:** o CTA da landing e a página "Sobre" usam embed do YouTube (`youtube-nocookie.com`); dependem de rede, das políticas de autoplay e da disponibilidade dos vídeos.
- **Idioma por fuso horário:** é uma aproximação de região. VPN, fuso manual ou navegador com idioma diferente podem exigir ajuste manual, que sempre prevalece.
- **Preferências locais:** acessibilidade, idioma e consentimento de cookies ficam no `localStorage` (e o consentimento também no cookie `sesi_cookies`) por dispositivo; não sincronizam entre navegadores.
- **Dados de demonstração:** o perfil e o admin usam dados fictícios. Não inserir informações pessoais reais, pois ficam no `localStorage` sem criptografia.

## Notas

Todas as divergências foram intencionais para atender aos requisitos obrigatórios do desafio, que complementam o design fornecido no Figma. Os dados são fictícios, conforme solicitado.
