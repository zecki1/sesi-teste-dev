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
| **Autenticação/Autorização real** | Parcial/demonstrativa | No modo `Development`, contas comuns usam senha verificada pela API e hash salgado (`PasswordHasher`); o hash não é exposto. A sessão e os papéis continuam simulados no `localStorage`, sem token nem identidade de produção. As contas `aluno@teste.com` e `admin@sesindustria.com.br` permanecem sem senha para testes. Contas legadas de aluno sem credencial podem definir senha no primeiro cadastro local, sem prova de posse do e-mail; não é uma política apropriada para produção. |
| **Login com Microsoft/Gmail** | Não configurado | Os botões informam que OAuth ainda não está disponível e não autenticam nem criam contas. |
| **Etapas internas de curso** | Implementadas no catálogo local | Rascunho e Homologado não são públicos. Publicado fica visível na data programada; após publicação, a data de liberação das matrículas e a data de disponibilização determinam “Em breve”, “Inscrições abertas” e “Disponível”. |
| **Upload SCORM real** | Implementado | O admin envia ZIPs SCORM 1.2/2004; a API valida o manifesto, extrai o conteúdo, executa o player, persiste progresso, mantém um pacote ativo por curso e oferece download/substituição. O limite configurável é 20/50/80/100/200 MB (padrão 100 MB). A cobertura automatizada usa um ZIP sintético; exports reais de ferramentas de autoria ainda precisam de validação operacional. |
| **Página do curso SCORM** | Implementada com dados persistidos no backend | `/curso/:slug/scorm` reutiliza hero, benefícios, módulos/FAQ, depoimentos, suporte e matrícula do detalhe de cursos em blocos. Textos e URLs de imagem/banner são configuráveis no admin e salvos no backend; benefícios e FAQs seguem estáticos. |
| **Blocos de conteúdo no backend** | Parcial | Módulos e títulos de aulas são gravados; o conteúdo dos blocos (texto/vídeo/imagem/quiz) e o SCORM continuam demonstrativos no editor. |
| **Matrícula real** | Implementada no backend | `POST /api/v1/matriculas` grava curso, turma e e-mail do perfil. Como a autenticação é demo, o `UsuarioId` é o e-mail informado no cliente, sem validação de identidade. |
| **Conteúdo dos cursos em 3 idiomas** | Parcial | Nome, nome breve, descrição, público-alvo, categoria, modalidade e status vêm traduzidos da API (12 cursos em EN/ES). Módulos, aulas e parte da interface do detalhe do curso continuam em português. |
| **Conteúdo do AVA** | Parcial | “Introdução”, “Boas práticas” e “Recomendações” têm texto real (o curso de referência usa o texto integral fornecido); os módulos usam os dados da API e os excedentes (4–6) são placeholders curtos. O player e o progresso SCORM funcionam quando há pacote publicado. |
| **Progresso do AVA** | Demonstrativo | O percentual é calculado pela posição do item selecionado no menu; os ícones de status (play/check/vazio) e a conclusão por aula não são persistidos no backend. |
| **FAQs do detalhe do curso** | Estáticas | As 10 perguntas e respostas ficam no front-end e não são editáveis pelo admin. |
| **E2E dos fluxos novos** | Implementado | A suíte permanente tem **43 testes** (26 fluxos + 6 verificações de axe/tema + 3 estados de catálogo + 8 capturas), incluindo modal de matrícula, login, AVA, página SCORM, configuração do limite no admin, slider de fonte, VLibras, cookies, trava de rolagem dos modais, skeleton/erro, busca sem acentos e capturas das principais páginas. |
| **Polimento visual 100% fiel ao Figma** | Em revisão | O foco foi atender aos requisitos funcionais e à hierarquia visual; ajustes finos podem ser feitos após a revisão do usuário. |

## Limitações técnicas

- **Banco SQLite em dev:** arquivo local, ideal para desenvolvimento. Em produção usar PostgreSQL (`Database__Provider=Npgsql`).
- **Arquivos e configurações SCORM:** índice, limite, dados da página e ZIP original ficam em arquivos sob `Scorm:Root` (padrão `App_Data/scorm`), não no PostgreSQL nem em Blob Storage. Em produção, `Scorm:Root` precisa apontar para um volume persistente; o armazenamento efêmero pode perder pacotes e configurações ao reiniciar/reimplantar o serviço.
- **Limite de extração SCORM:** além do limite configurável para o ZIP enviado, a API limita o conteúdo expandido a 200 MiB. Pacotes com maior expansão são rejeitados.
- **Autorização da API SCORM:** a autenticação atual é demonstrativa e validada somente no front-end. Endpoints de configuração, upload, download e conteúdo não verificam papel/token no backend; não devem ser expostos para uso público/produção antes de implementar autorização real.
- **Arquivos de mídia do editor:** capa, banner e imagens da página aceitam URLs; upload de imagens/vídeos/documentos para Blob Storage, edição de blocos e exercícios/avaliações ainda não foram implementados nesta etapa.
- **Acesso ao pacote:** o ZIP original fica fora da pasta estática, mas seu endpoint de download não exige login. O conteúdo extraído do SCORM é servido publicamente em `/scorm/{id}`. A troca remove o pacote anterior após validação e mantém apenas o atual; não há histórico/versionamento.
- **Schema sem migrations:** o backend usa `EnsureCreated()` + seeders idempotentes; a inicialização adiciona as colunas do fluxo de publicação e cria as tabelas de tradução (`CursosTraducoes`, `CategoriasTraducoes`, `ModalidadesTraducoes`) em bancos existentes. Outras alterações estruturais continuam exigindo migração manual ou recriação do banco. Não há histórico de migrations neste projeto.
- **Capas dos cursos:** 12 fotos WebP (1200×1500) do Unsplash, mapeadas por slug; cursos novos usam a imagem de reserva da categoria ou a `imagemUrl` informada no admin. As 15 imagens fornecidas foram convertidas para WebP, sendo 12 aplicadas e 3 mantidas como reserva. Os SVGs antigos seguem em `public/cursos` apenas como fallback da API.
- **API em localhost:** para testes locais completos, front-end e back-end precisam estar rodando. Os E2E usam fixtures e não dependem da API.
- **Deploy:** front-end na Vercel e API no Render (plano gratuito, sujeito a cold start).
- **API em produção:** a correção de CORS (D017) e a URL da API em `.env.production` (D018) só passam a valer após o próximo deploy de Render/Vercel.
- **Lint:** o script `npm run lint` foi removido — o projeto usa TypeScript 7 e o `typescript-eslint` atual declara suporte apenas até `<6.1.0`. A verificação estática é feita por `npm run typecheck`.
- **Bundle:** o JS de produção fica em ~685 kB (GSAP + AOS + Lenis + i18n), acima do limite de aviso de 500 kB do Vite. Cabe code splitting das libs de animação e dos locales.
- **VLibras:** o widget oficial é carregado por script externo (`vlibras.gov.br`). A sobreposição com o modal foi corrigida ocultando o wrapper enquanto ele está aberto; o usuário também pode desativá-lo pelo modal. O widget continua dependendo de rede e de terceiros.
- **Vídeos:** o CTA da landing e a página "Sobre" usam embed do YouTube (`youtube-nocookie.com`); dependem de rede, das políticas de autoplay e da disponibilidade dos vídeos.
- **Idioma por fuso horário:** é uma aproximação de região. VPN, fuso manual ou navegador com idioma diferente podem exigir ajuste manual, que sempre prevalece. Um `?lang=pt-BR|en-US|es-ES` explícito na URL tem prioridade sobre a detecção e passa a valer como escolha manual.
- **Preferências locais:** acessibilidade, idioma e consentimento de cookies ficam no `localStorage` (e o consentimento também no cookie `sesi_cookies`) por dispositivo; não sincronizam entre navegadores.
- **Dados de demonstração:** o perfil e o admin usam dados fictícios. Não inserir informações pessoais reais, pois ficam no `localStorage` sem criptografia.
- **Uso de IA e revisão:** o assistente foi utilizado como apoio a planejamento, sugestões, análise, validação e testes, não como autor independente do projeto. Alterações pontuais preparadas durante a interação ainda dependem da revisão e aprovação do autor; não se deve estender resultados de builds/testes anteriores a mudanças posteriores que não foram revalidadas.

## Avaliação de curso

| Item | Status | Observação |
|------|--------|------------|
| **Envio (nota + depoimento + survey)** | Implementado localmente | `POST /api/v1/avaliacoes`, uma avaliação por curso e e-mail; reenvio atualiza. |
| **Exibição na home e no detalhe** | Implementado localmente | Home mostra todos os cursos; o detalhe filtra pelo `cursoSlug`. Fallback nos depoimentos estáticos quando não há avaliação com texto. |
| **Autenticação do envio** | Demonstrativa | O frontend só envia com perfil salvo, mas o backend não valida um token; qualquer cliente poderia informar outro `usuarioId`. Autenticação real segue fora do escopo. |
| **Moderação** | Pendente | Existe a coluna `Publicada`, mas ainda não há tela/ação administrativa para ocultar ou excluir avaliações. |
| **Filtro de conteúdo** | Pendente | Depoimento e sugestão são textos livres (até 2000 caracteres) sem curadoria automática. |
| **Média do curso** | Implementado | Calculada apenas com avaliações publicadas e arredondada em uma casa decimal no backend. |

## Internacionalização (i18n)

| Item | Status | Motivo |
|------|--------|--------|
| **Textos estáticos (menu, títulos, CTAs)** | Implementado | Traduções em `src/i18n/locales` para `pt-BR`, `en-US` e `es-ES`. |
| **Dados vindos da API** | Implementado localmente, não publicado | Frontend envia `Accept-Language`; backend resolve o idioma no `IdiomaMiddleware`; tabelas de tradução são criadas de forma idempotente e populadas pelo `CatalogoTraducoesSeeder`. Detalhes em `docs/I18N.md`. |
| **Status calculado do curso** | Implementado localmente, não publicado | “Em breve”, “Inscrições abertas” e “Disponível” são traduzidos no mapper, inclusive nas facetas do catálogo. |
| **Home** | Implementado | Hero, lista de cursos, impacto, diferenciais, depoimentos, CTA final, vídeo e rodapé traduzidos. |
| **Catálogo** | Implementado | Título, subtítulo, rótulos, opções “Todas/Todos”, contagem, estados de carregamento/erro/vazio e paginação traduzidos. |
| **Detalhe do curso** | Parcial | Nome, descrição, categoria, modalidade, status, depoimentos e avaliações traduzidos; “Sobre o curso”, benefícios, FAQ, hero e modal de matrícula seguem em PT. |
| **Módulos e aulas** | Não traduzido | Títulos e descrições vêm do banco apenas em PT; não há tabelas de tradução para módulos/aulas. |
| **Área administrativa** | Não traduzida | Fora do escopo desta rodada. |
| **Deploy do backend** | Pendente | As alterações de i18n estão locais e não commitadas; produção segue em `ae44b56`, sem suporte a idioma. |

## Notas

O autor conduziu os requisitos, as decisões e a revisão do trabalho. O apoio da IA foi complementar e não substitui a validação do autor. Todas as divergências de produto listadas foram intencionais para atender aos requisitos obrigatórios do desafio, que complementam o design fornecido no Figma. Os dados são fictícios, conforme solicitado.
