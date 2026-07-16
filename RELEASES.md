# Releases de resultados

Cada release é um conjunto imutável de resultados, identificado por git tag
`vX.Y.Z` (semântica em DECISOES.md D11: PATCH = re-julgamento dos mesmos
brutos; MINOR = medições novas na mesma metodologia; MAJOR = quebra de
comparabilidade; 1.0.0 = primeira publicação pública, gate `dados-v1.0.0`).

Processo de release: bateria executada e avaliada → resultados commitados e
CI verde (check de consistência) → entrada preenchida aqui → `git tag vX.Y.Z`
+ push da tag. Alterou qualquer julgamento depois? Número novo, nunca
sobrescrever.

## v0.1.0 · 16/jul/2026 · interna (pré-publicação)

Primeira medição de referência do benchmark: 15.300 respostas, 17 modelos.

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
