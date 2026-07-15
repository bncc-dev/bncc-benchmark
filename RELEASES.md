# Releases de resultados

Cada release é um conjunto imutável de resultados, identificado por git tag
`vX.Y.Z` (semântica em DECISOES.md D11: PATCH = re-julgamento dos mesmos
brutos; MINOR = medições novas na mesma metodologia; MAJOR = quebra de
comparabilidade; 1.0.0 = primeira publicação pública, gate `dados-v1.0.0`).

Processo de release: bateria executada e avaliada → resultados commitados e
CI verde (check de consistência) → entrada preenchida aqui → `git tag vX.Y.Z`
+ push da tag. Alterou qualquer julgamento depois? Número novo, nunca
sobrescrever.

## v0.1.0 · em preparação (não lançada)

Primeira medição de referência do benchmark, interna (pré-publicação).

- **Rodada**: `oficial-seca-2026-07` (modo seco; a rodada grounded entra numa
  release MINOR futura)
- **Elenco**: 17 modelos — pares primeira-categoria/econômico de OpenAI,
  Anthropic, Google, DeepSeek, Alibaba/Qwen e Maritaca, mais Grok 4.5,
  Kimi K2.6/K2.5, Claude Fable 5 e os Claude 4.6/Haiku 4.5 via Bedrock
- **Banco de itens**: `itens-v1` (300 itens, adjudicação anti-vexame D10
  aplicada e assinada em 15/jul/2026)
- **Julgamento**: avaliador v2 · rubrica-v1 · juiz haiku-bedrock
- **Dataset**: dados-2026.07 (1.721 aprendizagens)
- **Rotas**: Bedrock + OpenRouter (pins de primeira parte, fallback
  desligado) + Maritaca direta (exceção documentada)
- Data, custo e composição final: preencher no lançamento da tag
