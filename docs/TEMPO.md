# Registro de Tempo

Registro aproximado do esforço total do projeto, montado a partir dos checkpoints de memória e do relato do autor. Não é uma medição automática e não separa horas do autor das horas de interação com ferramentas.

## Resumo

| Item | Valor |
|---|---|
| Início | 21/10/2026, 19:45 |
| Primeiro uso do assistente de IA nesta rodada | 23/10/2026, ~09:17 |
| Última atualização do registro | 24/10/2026, 14:20 |
| Janela total | ~66 h 35 min (até 24/10, 14:20) |
| Pausa informada pelo autor | 4 h entre 21/10 e 22/10 |
| Tempo efetivo estimado | ~25 h 36 min (não inclui a janela de 24/10, não medida) |
| Tempo com checkpoints registrados | ~17 h 21 min |

> A diferença entre o tempo efetivo estimado e os checkpoints corresponde a períodos de trabalho sem registro de memória. O valor é uma estimativa baseada no relato do autor, não uma soma exata de horas. A janela de 24/10 foi registrada apenas como checkpoint de foco, sem medição de duração.

## Checkpoints

| Data | Janela | Foco principal |
|---|---|---|
| 21/10 | 19:45–23:55 | Estratégia, leitura do Figma, infraestrutura Vercel/Render e decisões iniciais |
| 22/10 | 12:10–13:55 | Motion (Lenis/AOS/GSAP), CORS, 404, testes e validação da API |
| 22/10 | 13:55–14:20 | Ajustes de hero, Impacto e header fixo |
| 22/10 | 14:20–18:05 | Slider de cursos, cards com capa, detalhe do curso e documentação |
| 22/10 | 18:05–21:15 | Área do aluno, AVA, admin demonstrativo, página Sobre e README |
| 22/10 | 21:15–21:45 | Idioma no topo da sidebar, tema escuro, hover lift, testes e docs finais |
| 22/10 | 21:45–22:10 | Backend de turmas/matrículas e CRUD, modal de matrícula, slider de fonte, VLibras opcional, cookies persistentes e validação final |
| 22/10 | 22:10–22:25 | Modal de acessibilidade centralizado, trava de rolagem com Lenis, correção do axe e nova rodada de testes |
| 22/10 | 22:25–22:55 | Detalhe do curso enxuto, AVA em duas colunas, novo E2E, correção de contraste e documentação |
| 22/10 | 22:55–23:15 | FAQs numeradas, CTA flutuante, trava do login, CTA da home, capas WebP, ícones dos cards e sliders full-bleed |
| 22/10–23/10 | 23:15–00:00 | Revisão fiel ao Figma: badges por categoria, drag dos sliders, footer/depoimentos uppercase, faixa sem uppercase, accordion fechado, AVA com progresso branco/logo/status e testes/docs finais |
| 23/10 | 00:00–00:20 | Correção de clique x arrasto nos sliders, página configurável de curso SCORM, reescrita do USO_DE_IA, testes e docs |
| 23/10 | 09:17–10:00 | Upload e substituição de pacotes SCORM, limite configurável persistido, página padronizada, validação final e documentação |
| 23/10 | 10:00–10:18 | Remoção do commit acidental de `main` para branch de feature sem novo commit; cadastro visível, player SCORM separado, otimização de imagens, correção do preload e inicialização/verificação da API local |
| 23/10 | 10:18–11:24 | Continuação do apoio assistido: análise do progresso SCORM, visibilidade do curso no catálogo, indicadores do admin, percentual de upload e revisão da forma de registrar o uso de IA |
| 23/10 | 13:25:34–13:31:56 | Validação dos requisitos do case: inspeção da API e dos dados, execução dos E2E de catálogo e verificação da publicação |
| 23/10 | 13:31:56–13:35:13 | Escopo adicional solicitado durante a validação: testes automatizados do skeleton/erro, busca sem acento e registro separado da janela adicional |
| 23/10 | 14:37:24–14:54:21 | Retomada da validação: Lighthouse CI com CORS permitido (12 medições), ajuste dos E2E para aguardar a decodificação das capas, regeneração das oito capturas e documentação dos resultados |
| 24/10 | não medida (até 14:20) | Diagnóstico e implementação local do i18n (Etapas 1–5): middleware, DDL idempotente das tabelas de tradução, seeder EN/ES, envio de `Accept-Language`, tradução de home/rodapé/catálogo; build, typecheck e validação em navegador. Sem commit, aguardando revisão do autor |
| 24/10 | não medida (até 18:10) | Segunda e terceira rodadas locais: detalhe do curso, FAQ 10×3 idiomas, SCORM traduzido, ajuda via Resend, gestão de chamados, AVA SCORM sem sidebar e sistema de avaliação (nota + depoimento + pesquisa de 5 perguntas) na home e no detalhe; testes e validação em navegador nos três idiomas. Sem commit, aguardando revisão do autor |

## Observações

- O tempo estimado se refere ao trabalho total do projeto — implementação, revisão visual, testes, correções e documentação — e não deve ser atribuído integralmente ao assistente de IA.
- A pausa de 4 h foi informada pelo autor; os intervalos entre checkpoints não representam necessariamente pausa.
- O autor conduziu o projeto e é responsável pelas decisões, pelo escopo, pela implementação e pela revisão. O assistente de IA foi utilizado como apoio à validação e à análise; a janela entre 09:17 e 11:24 é o período observado de interação, não tempo efetivo de codificação nem medida de autoria da IA.
- O código foi escrito pelo autor. A IA acompanhou a codificação validando o que era produzido; sugestões só passaram a valer depois de aplicadas e aceitas pelo autor.
- O commit acidental foi criado às 10:01:45 antes da revisão do autor e removido de `main`; não houve novo commit.
- A API local respondeu a verificações anteriores de health, catálogo, facetas, matrículas, configuração SCORM e CORS, e foi detectado um pacote ativo. Em verificação posterior, a API local estava indisponível. Builds anteriores foram validadas, mas as alterações mais recentes aguardam revisão e não foram buildadas/testadas novamente, conforme orientação do autor.
- Para a validação iniciada em 23/10 às 13:25:34, a janela observável foi de aproximadamente 9 min 39 s até 13:35:13. A solicitação dos itens adicionais chegou às 13:31:56, enquanto a validação anterior ainda estava em andamento; portanto, a janela adicional de aproximadamente 3 min 17 s está contida na janela total e não deve ser somada a ela. Esses intervalos registram tempo de interação, não o tempo ativo individual do autor nem esforço de implementação medido. Para contabilizar o tempo pessoal do autor com precisão, registrar separadamente início/fim informados por ele; não inferir esse dado a partir do tempo de resposta da IA.
- A retomada de 14:37:24 a 14:54:21 registra uma janela observável de interação de aproximadamente 17 min. Ela inclui espera por ferramentas e auditorias; não representa tempo ativo do autor nem deve ser somada ao tempo efetivo estimado sem apontamento pessoal.
- A janela de 24/10/2026 foi dedicada ao diagnóstico e à implementação local do i18n. A duração não foi medida em relógio; o checkpoint registra o foco e o resultado (build, typecheck e validação em navegador), não tempo ativo do autor. Nenhum commit foi criado.
