# Releases de resultados

Cada release é um conjunto imutável de resultados, identificado por git tag
`vX.Y.Z` (semântica em DECISOES.md D11: PATCH = re-julgamento dos mesmos
brutos; MINOR = medições novas na mesma metodologia; MAJOR = quebra de
comparabilidade). O projeto está em **0.x**: a metodologia ainda pode mudar, e
abrir o repositório não promoveu a versão. O 1.0.0 vem quando o protocolo
estabilizar.

Processo de release: bateria executada e avaliada → resultados commitados e
CI verde (check de consistência) → entrada preenchida aqui → `git tag vX.Y.Z`
+ push da tag → **Release do GitHub criada a partir da tag** (`gh release
create vX.Y.Z --verify-tag`), com as notas resumindo esta entrada. A tag e a
Release são objetos distintos: sem a segunda, a página do repositório segue
anunciando a release anterior como a mais recente, que é o primeiro lugar
onde a maioria das pessoas olha. Alterou qualquer julgamento depois? Número
novo, nunca sobrescrever.

## v0.2.0 · 18/ago/2026 · elenco renovado, 19 modelos

Segunda medição de referência: 17.100 respostas, 19 modelos. Bateria executada
em 15-18/ago/2026.

- **Rodada**: `oficial-seca-2026-08`, modo seco. **17.100 respostas, 19
  modelos, todos com a bateria completa** (900 chamadas cada: 300 itens × 3
  paráfrases). Nenhum modelo ficou parcial, então a D13.3 não foi acionada.
- **Julgamento**: avaliador v2 · rubrica-v1 · juiz haiku-bedrock (9.460
  julgamentos na trilha, `juiz.jsonl`) — mesmo juiz e rubrica da v0.1.0.
- **Líder**: gpt-sol (nota 86,4; era 89,2 em julho). **Lanterna**: qwen-flash
  (27,3), entrante desta rodada. Agregados verificados por CI.
- **Custo do resultado publicado**: US$ 189,47 (contra ~US$ 107 em julho). O
  aumento vem dos modelos que raciocinam antes de responder, que geram muito
  mais tokens de saída: opus-5 custou US$ 28,13 para 900 chamadas contra
  US$ 6,49 estimados a partir dos tokens do opus-4.8. Mais caros: kimi-k3
  (35,65), qwen-38-max (33,40), fable-5 (32,00), opus-5 (28,13). Mais baratos:
  sabiazinho-4 (0,12), qwen-flash (0,17), gpt-luna (0,23).
  **O desembolso total foi maior (~US$ 218)**: inclui as medições dos dois Qwen
  que foram descartadas e refeitas (ver abaixo). Custo publicado é o dos brutos
  que compõem a release, não o da conta.
- **Elenco (19)**: as 17 vagas da v0.1.0 — 7 com modelo atualizado
  (opus-4.8→opus-5, grok-4.5→4.6, gemini-3.5-flash→3.7-flash, kimi-k2.6→k3,
  qwen3.7-max→3.8-max, deepseek-pro/flash fixados nos snapshots -0813/-0731) —
  mais 2 entrantes: muse-spark-1.2 (Meta) e qwen3.7-flash (Alibaba).
- **Ids de modelo renomeados (D13.1)**: `kimi`→`kimi-k3`, `grok`→`grok-46`,
  `gemini-flash`→`gemini-37-flash`, `qwen-max`→`qwen-38-max`. Os ids antigos
  continuam válidos na v0.1.0, onde designam os modelos daquela rodada; o
  `APRESENTACAO` do exportador guarda os dois conjuntos. Um id nunca é
  reapontado para outro modelo.
- **Mudanças de condição de execução (D13.2)**: `deepseek-flash` passou de
  `max_tokens` 1024 (julho, herdado da flag) para 4096, porque o snapshot
  `-0731` raciocina antes de responder e truncava com resposta vazia em 1024;
  `qwen-flash` entrou já com 4096 pelo mesmo motivo. **Comparar o
  deepseek-flash entre v0.1.0 e v0.2.0 exige essa ressalva** — o modelo mudou
  de snapshot e de orçamento de tokens ao mesmo tempo.
- **Truncamento invalidou e refez dois modelos.** Na primeira passada,
  `qwen-plus` devolveu 427 de 900 respostas VAZIAS (47%) e `qwen-38-max`, 303
  (34%): o teto de `max_tokens` não comportava o raciocínio, e como a resposta
  vem depois dele, truncar perdia tudo. Os dois foram refeitos com teto 32768
  (zero truncadas) e só a medição refeita entra nesta release.
  **O efeito no resultado é contraintuitivo e vale registrar**: as notas
  CAÍRAM depois da correção (qwen-38-max 52,1→43,0; qwen-plus 36,4→32,2),
  porque uma resposta vazia nunca aceita um código inventado — o truncamento
  funcionava como abstenção forçada e inflava a dimensão anti-alucinação. Nos
  códigos falsos "limpos", o qwen-plus passou de 18% de aceitação aparente
  para 35% reais. Números truncados são otimistas, não pessimistas.
- **Truncamento residual**: gpt-luna 18 respostas vazias (2,0%), deepseek-flash
  12 (1,3%), deepseek-pro 5, opus-5 2, qwen-flash 2, sabiazinho-4 3 truncadas
  sem perda de resposta. Todos abaixo de 3% e expostos no campo `cortados` do
  leaderboard. Declarados como limitação, não invalidam a medição.
- **fable-5 rodou por duas rotas (D9)**: 898 chamadas via Amazon Bedrock e 2
  via Google, porque a entrada não tinha provedor pinado. As 2 são
  irreproduzíveis pela rota majoritária: em 18/ago/2026 o Amazon Bedrock passou
  a responder 404 ("Claude Fable 5 is not available") para a conta. Mantidas e
  declaradas, por serem 0,2% das chamadas; o registro passou a pinar
  `Anthropic`, rota que respondia naquela data.
- **Leaderboard passa a expor as rotas.** Campo `rotas` por modelo, com o
  endpoint que serviu cada chamada e a contagem — a D9 exige que o leaderboard
  identifique o provedor, e até aqui o artefato exportado não carregava essa
  informação. Vale para os 19 modelos, não só para o caso do fable-5.
- **Rotas com rate limit persistente**: Fireworks (DeepSeek), Maritaca e
  Alibaba devolveram 429 ao longo da bateria, exigindo retomadas sucessivas.
  Achado operacional: janelas curtas se recuperam com tentativas frequentes
  (20-45s), não com esperas longas — uma chamada do deepseek-pro resistiu a
  horas de tentativas espaçadas de 15 min e passou em 2 min de tentativas
  seguidas. Registrado para baterias futuras; ver também a issue sobre
  concorrência por provedor.
- **kimi-k2.5: promessa da v0.1.0 REVOGADA.** A v0.1.0 registrou "medição
  adiada, entra em release MINOR futura". Não será medido: entre as duas
  releases a Moonshot lançou o K2.6 e depois o K3 (16/jul/2026), deixando o
  K2.5 duas gerações defasado — medi-lo não responderia mais nenhuma pergunta
  comparativa do benchmark. Registrado aqui para que a promessa conste como
  resolvida, não esquecida.
- **Comparabilidade**: mesmo `itens-v1`, mesma rubrica-v1, mesmo juiz
  (haiku-bedrock), mesmo dataset dados-2026.07 → MINOR conforme D11. Rodada
  executada com cache novo (chamadas frescas para todo o elenco, inclusive
  modelos inalterados — aliases de API podem mudar por baixo sem aviso).
- **Rodada grounded**: segue prometida para release MINOR futura (promessa da
  v0.1.0 mantida, não é desta release).
- **Errata da v0.1.0 (preço do gpt-luna)**: o `precos` do gpt-luna no registro
  estava em 1/6 por MTok, dez vezes o cobrado pela OpenAI via OpenRouter
  (0.1/0.6). Como o `custo_usd` dos brutos é calculado a partir dessa tabela,
  o custo publicado do gpt-luna na v0.1.0 (~US$ 2,29) está inflado ~10×; o
  real é ~US$ 0,23, e o total da rodada cai de ~US$ 109 para ~US$ 107.
  **Nenhuma nota, resposta ou julgamento é afetado** — o campo é informativo e
  não entra na avaliação. A v0.1.0 é imutável (D11) e não será reescrita: a
  correção vale da v0.2.0 em diante e fica registrada aqui.

## v0.1.0 · 16/jul/2026 · primeira release pública

Primeira medição de referência do benchmark: 15.300 respostas, 17 modelos.
Medida em julho de 2026, quando o repositório ainda era privado, e publicada
sem alteração na abertura de 27/jul/2026 — os resultados são exatamente os
que o CI recalcula a cada push.

- **Rodada**: `oficial-seca-2026-07`, modo seco (a rodada grounded entra numa
  release MINOR futura). Execução 15-16/jul/2026, trilha completa nos
  manifestos (múltiplas invocações com retomada por cache; 4 correções de
  resiliência aplicadas durante a rodada, registradas nos commits).
- **Elenco (17)**: gpt-sol, gpt-luna (OpenAI) · fable-5, opus-4.8, sonnet-5
  (Anthropic/OpenRouter) · sonnet-4.6, haiku-4.5 (Anthropic/Bedrock) ·
  gemini-3.1-pro, gemini-3.5-flash (Google) · grok-4.5 (xAI) · kimi-k2.6
  (Moonshot) · qwen3.7-max, qwen3.7-plus (Alibaba) · deepseek-v4-pro,
  deepseek-v4-flash (DeepSeek via Fireworks) · sabia-4, sabiazinho-4
  (Maritaca). **kimi-k2.5: medição adiada** (decisão de 16/jul, entra em
  release MINOR futura).
- **Banco de itens**: `itens-v1` (300 itens; anti-vexame D10 adjudicado e
  assinado em 15/jul/2026).
- **Julgamento**: avaliador v2 · rubrica-v1 · juiz haiku-bedrock (trilha
  completa em juiz.jsonl).
- **Dataset**: dados-2026.07 (1.721 aprendizagens).
- **Rotas**: Bedrock + OpenRouter (pins de primeira parte, fallback
  desligado; DeepSeek servido por Fireworks por política de privacidade da
  conta) + Maritaca direta (exceção documentada).
- **Custo**: ~US$ 109 de execução + ~US$ 6 de juiz.
- **Líder**: gpt-sol (nota composta 89,2); lanterna: sabiazinho-4 (27,3).
  Agregados verificados por CI (julgados×agregados).
