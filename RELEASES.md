# Releases de resultados

Cada release é um conjunto imutável de resultados, identificado por git tag
`vX.Y.Z` (semântica em DECISOES.md D11: PATCH = re-julgamento dos mesmos
brutos; MINOR = medições novas na mesma metodologia; MAJOR = quebra de
comparabilidade). O projeto está em **0.x**: a metodologia ainda pode mudar, e
abrir o repositório não promoveu a versão. O 1.0.0 vem quando o protocolo
estabilizar.

Processo de release: bateria executada e avaliada → resultados commitados e
CI verde (check de consistência) → entrada preenchida aqui → `git tag vX.Y.Z`
+ push da tag. Alterou qualquer julgamento depois? Número novo, nunca
sobrescrever.

## v0.2.0 · EM PREPARAÇÃO · rodada seca 2026-08

Rascunho — esta entrada se completa quando a bateria rodar; até lá registra as
decisões de composição já tomadas (15/ago/2026).

- **Elenco (19)**: as 17 vagas da v0.1.0 — 7 com modelo atualizado
  (opus-4.8→opus-5, grok-4.5→4.6, gemini-3.5-flash→3.7-flash, kimi-k2.6→k3,
  qwen3.7-max→3.8-max, deepseek-pro/flash fixados nos snapshots -0813/-0731) —
  mais 2 entrantes: muse-spark-1.2 (Meta) e qwen3.7-flash (Alibaba).
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
