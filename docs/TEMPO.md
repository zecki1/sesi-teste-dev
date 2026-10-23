# Registro de Tempo

Registro aproximado do esforço total do projeto, montado a partir dos checkpoints de memória e do relato do autor. Não é uma medição automática e não separa horas do autor das horas de interação com ferramentas.

## Resumo

| Item | Valor |
|---|---|
| Início | 21/10/2026, 19:45 |
| Primeiro uso do assistente Copilot nesta rodada | 23/10/2026, ~09:17 |
| Última atualização do registro | 23/10/2026, 11:24 |
| Janela total | ~38 h 33 min |
| Pausa informada pelo autor | 4 h entre 21/10 e 22/10 |
| Tempo efetivo estimado | ~25 h 36 min |
| Tempo com checkpoints registrados | ~17 h 21 min |

> A diferença entre o tempo efetivo estimado e os checkpoints corresponde a períodos de trabalho sem registro de memória. O valor é uma estimativa baseada no relato do autor, não uma soma exata de horas.

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

## Observações

- O tempo estimado se refere ao trabalho total do projeto — implementação, revisão visual, testes, correções e documentação — e não deve ser atribuído integralmente ao assistente de IA.
- A pausa de 4 h foi informada pelo autor; os intervalos entre checkpoints não representam necessariamente pausa.
- O autor conduziu o projeto e é responsável pelas decisões, pelo escopo e pela revisão. O assistente Copilot foi utilizado como apoio a planejamento, sugestões, análise, validação e testes; a janela entre 09:17 e 11:24 é o período observado de interação, não tempo efetivo de codificação nem medida de autoria da IA.
- Em algumas solicitações específicas, o assistente preparou alterações pontuais nos arquivos para revisão. Isso não significa que tenha produzido sozinho o projeto ou que essas mudanças estejam aprovadas.
- O commit acidental foi criado às 10:01:45 antes da revisão do autor e removido de `main`; não houve novo commit.
- A API local respondeu a verificações anteriores de health, catálogo, facetas, matrículas, configuração SCORM e CORS, e foi detectado um pacote ativo. Em verificação posterior, a API local estava indisponível. Builds anteriores foram validadas, mas as alterações mais recentes aguardam revisão e não foram buildadas/testadas novamente, conforme orientação do autor.
