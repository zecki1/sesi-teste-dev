# Limitações Conhecidas

## Divergências entre Figma e implementação

| Item | Observação no Figma | Implementação | Justificativa |
|------|---------------------|---------------|---------------|
| **Seção "Principais cursos"** | Mostra apenas filtro "Todos os cursos" (select simples) | Implementado com filtros completos no catálogo + seção simplificada na landing | O enunciado exige pesquisa + 3 filtros + contador + limpar filtros. Adicionado no catálogo conforme obrigatoriedade. |
| **Contador de resultados** | Não exibido | Exibido como "X resultado(s) encontrado(s)" | Exigido pelo desafio: "Apresentar a quantidade de resultados". |
| **Mensagem "Nenhum curso encontrado"** | Não observada | Implementada com botão "Limpar filtros" | Exigido pelo desafio. |
| **Estado de carregamento** | Não observada | Implementado | Exigido pelo desafio: "Apresentar estado de carregamento". |
| **Mensagem de erro** | Não observada | Implementada | Exigido pelo desafio: "Apresentar mensagem em caso de erro". |
| **Detalhes do curso** | Faltam breadcrumb, carga horária, modalidade, público-alvo, status visíveis | Adicionados todos os campos exigidos pelo enunciado | O enunciado exige exibir esses dados, mesmo que não estejam explícitos em todos os frames do Figma. |
| **Módulos/Aulas** | Aparecem apenas no AVA (fluxo 03) | Exibidos também na página de detalhes do curso | Exigido pelo enunciado: "Cursos com diferentes cargas horárias, módulos, descrições de aulas..." |
| **Seletor de idioma** | Não presente no Figma | Adicionado na estrutura (i18n pt-BR/en-US/es-ES) | Requisito de acessibilidade/internacionalização planejado, sem quebrar design base. |
| **Menu de acessibilidade** | Não presente no Figma | Implementado (daltonismo, fonte, contraste, VLibras, dislexia) | Decisão estratégica para atendimento a requisitos de acessibilidade. |

## Itens não concluídos

| Item | Status | Motivo |
|------|--------|--------|
| **Integração completa com Moodle** | Não implementado | Explicitamente mencionado como "diferencial" - não obrigatório. Aplicação funciona independentemente. |
| **Gerenciamento CRUD de cursos** | Não implementado | Explicitamente não necessário: "Não será necessário desenvolver o gerenciamento de cadastro, edição ou exclusão de cursos." |
| **Autenticação/Autorização completa** | Parcial | Estrutura preparada para AVA, mas autenticação completa não foi implementada por não estar no escopo obrigatório. |
| **Testes E2E completos** | Parcial | Estrutura Playwright configurada com testes a11y, mas cobertura E2E completa dos fluxos pendente. |
| **Polimento visual 100% fiel ao Figma** | Em progresso | Foco foi em atender todos os requisitos funcionais obrigatórios primeiro. Ajustes visuais pontuais podem ser feitos. |

## Limitações técnicas

- **Banco SQLite em dev**: Arquivo local, ideal para desenvolvimento. Em produção usar PostgreSQL.
- **Imagens**: Algumas imagens são placeholders (gradientes) quando não disponíveis nos assets.
- **API em localhost**: Para testes locais completos, ambos front e back devem estar rodando.
- **Deploy**: Frontend público no Vercel, API no Render (pode ter cold start no plano gratuito).

## Notas

Todas as divergências foram intencionalmente realizadas para atender aos requisitos obrigatórios do desafio, que complementam o design fornecido no Figma. Os dados são todos fictícios conforme solicitado.
