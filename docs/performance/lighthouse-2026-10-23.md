# Lighthouse CI — 23/10/2026

## Execução

- Comando: `npm run perf:lighthouse`
- Build: `npm run build` concluído antes da coleta.
- Coleta válida: 3 execuções por rota, total de 12 relatórios.
- Rotas: home, catálogo, detalhe do curso de Matemática para a Precisão e página SCORM.
- Lighthouse usou o perfil padrão mobile, em preview local; a API consultada é a publicada no Render.
- A coleta inicial em `127.0.0.1:4173` foi descartada porque a origem não era permitida no CORS da API. A coleta válida usou `localhost:5174`, origem permitida, e carregou o conteúdo real.
- O `autorun` terminou com código 0. A asserção de performance está configurada como aviso abaixo de 80; o log apontou avisos para catálogo e detalhe do curso.

## Resultados

Scores de categoria e métricas Web Vitals abaixo são medianas das 3 execuções por rota.

| Rota | Performance (mediana; faixa) | Acessibilidade | Boas práticas | SEO | FCP | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 83 (83–83) | 100 | 93 | 100 | 2,56 s | 4,06 s | 33 ms | 0,008 |
| `/catalogo` | 72 (72–73) | 98 | 93 | 100 | 2,56 s | 6,81 s | 12 ms | 0 |
| `/curso/matematica-para-a-precisao-medidas-e-escalas-na-metalurgia` | 64 (63–64) | 100 | 93 | 100 | 2,56 s | 3,46 s | 47 ms | 0,786 |
| `/curso/matematica-para-a-precisao-medidas-e-escalas-na-metalurgia/scorm` | 66 (64–84) | 100 | 93 | 100 | 2,56 s | 3,46 s | 149 ms | 0,786 |

## Leitura dos resultados

- O catálogo e o detalhe ficaram abaixo do limite de aviso de 80 pontos. O LCP do catálogo (6,81 s) é o principal gargalo observado.
- A página de detalhe e algumas execuções do SCORM registraram CLS de 0,786, acima do recomendado (0,1); o resultado do SCORM variou entre 64 e 84 pontos.
- A home manteve performance 83 nas três execuções. O TBT foi baixo em todas as rotas (12–149 ms).
- As chamadas à API passaram pelo CORS na coleta válida. Os relatórios ainda registram respostas 404 para recursos não encontrados; isso não impediu a execução, mas deve ser analisado separadamente.
- O processo de preview emitiu um aviso de timeout ao aguardar o padrão de prontidão, embora o servidor tenha respondido e as 12 auditorias tenham sido concluídas.
- A API remota pode introduzir variação de rede e cold start. Portanto, estes números são uma linha de base da execução neste ambiente, não uma medição isolada do frontend nem uma garantia de desempenho de produção.

Os relatórios JSON/HTML brutos ficam no diretório local ignorado `.lhci/`; não são versionados. Para repetir a medição, execute `npm run perf:lighthouse` em `frontend/`.
