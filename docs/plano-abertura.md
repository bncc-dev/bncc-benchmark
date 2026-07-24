# Plano de abertura do repositório

Análise e estratégia para tornar público o `bncc-dev/bncc-benchmark`, registrada em 2026-07-23. Irmão do [plano de abertura do bncc-dados](https://github.com/bncc-dev/bncc-dados/blob/main/docs/plano-abertura.md) e alinhado ao compromisso da divisão aberto/comercial firmada lá.

## Diagnóstico

O repositório foi arquitetado para ser aberto. Estado verificado:

| Item | Situação |
|---|---|
| Visibilidade atual | Privado (`github.com/bncc-dev/bncc-benchmark`) |
| Licenças | MIT (código, `LICENSE-CODIGO.md`) + CC BY 4.0 (itens, resultados e metodologia, `LICENSE-DADOS.md`) — corretas e commitadas, com atribuição e proveniência do bncc-dados citadas |
| Segredos/PII | Nenhum `.env` jamais commitado; nenhuma chave de API literal em nenhum commit do histórico (verificado) — **o histórico completo pode ser aberto sem reescrita** |
| Held-out | Fora do repo (`~/Dev/bncc-benchmark-heldout/`), bloqueado no `.gitignore` (`*heldout*`, `*held-out*`), ausente do working tree e do histórico — decisão D5 do `DECISOES.md` |
| Proveniência | Dataset vendorizado com commit de origem e SHA-256 fixados em teste (D4); artefatos carimbam versão e checksums (`METODOLOGIA.md`) |
| Comunidade | Nada ainda: sem CONTRIBUTING, CODE_OF_CONDUCT, templates de issue/PR |
| CI | Sem workflows no repo (os testes existem em `test/`, mas só rodam localmente) |
| Estado de release | v0.1.0 (rodada oficial-seca-2026-07: 17 modelos, 15.300 respostas, avaliador v2) |

## O que NÃO abrir

- **O conjunto held-out — nunca.** É o único segredo real do benchmark e sua razão de existir: discriminar, em re-medições futuras, aprendizado real (melhora nos itens públicos E no held-out) de memorização do teste publicado (melhora só nos públicos). A proteção atual (diretório externo + `.gitignore` como defesa em profundidade) está sólida; a abertura do repo não muda nada aqui.
- Nada mais. Chaves de API vivem em `.env` (ignorado desde sempre) e o `cache/` de respostas não é versionado.

## Pontos a resolver antes do flip para público

### 1. Regra de contribuição própria (não copiar a do bncc-dados)

O benchmark é um instrumento de medição: itens publicados **não podem ser "corrigidos" livremente por PR**, ou as notas deixam de ser comparáveis entre releases. A regra aqui é diferente da regra de ouro do bncc-dados:

- **Item com problema** (ambíguo, gabarito errado): issue, não PR. Correção aceita entra só na **próxima versão do banco de itens**, com registro em `DECISOES.md` e novo congelamento (`congelar-itens.ts`).
- **Item novo**: proposta via issue para a próxima versão; geração continua sendo pelo pipeline (seed + gramáticas), não item artesanal.
- **Harness, avaliador, exportadores**: PRs bem-vindos, desde que não alterem notas de rodadas já publicadas (resultados são imutáveis por release).

Escrever isso num `CONTRIBUTING.md` próprio é pré-requisito da abertura.

### 2. Redistribuição das respostas dos modelos (`resultados/`)

Publicar as 15.300 respostas cruas é prática padrão de benchmarks (HELM, LMSYS). Risco baixo: os ToS dos provedores em geral permitem redistribuição de outputs; restrições existentes (ex.: não usar outputs para treinar concorrentes) recaem sobre o reusuário, não sobre quem publica. **Ação: uma nota curta no README dos resultados** informando a origem (modelo, data, ToS do provedor à época) e que o reuso está sujeito aos termos de cada provedor.

### 3. Documentos de comunidade

- `CONTRIBUTING.md` — com a regra da seção 1.
- `CODE_OF_CONDUCT.md` — Contributor Covenant em pt-BR (idealmente o mesmo texto do bncc-dados).
- Templates de issue em `.github/`: "item com problema" (exige código do item, resposta esperada vs. observada, justificativa) e "proposta de item".

### 4. CI antes do flip

Ligar os testes de `test/` num workflow (`.github/workflows/`) para que PRs externos sejam validados automaticamente — em especial os testes de manifesto/proveniência, que protegem a integridade do banco de itens. Barato e recomendado antes da abertura, como o `validacao.yml` faz no bncc-dados.

## Estratégia de comunidade

- **Abertura casada com o bncc-dados**: abrir junto ou logo após fortalece a narrativa — dataset aberto + benchmark aberto + held-out privado como garantia de integridade. O trio é raro e é o diferencial de comunicação.
- **Públicos naturais**: labs e provedores de LLM (querem aparecer bem no leaderboard), edtechs avaliando modelos, pesquisadores de avaliação de LLMs em português.
- **Good first issues**: relatar itens ambíguos, propor novos modelos para a próxima rodada, melhorias nos exportadores do site.
- **Narrativa de lançamento**: primeiro benchmark de alucinação sobre a BNCC; metodologia e respostas cruas 100% públicas; held-out privado contra contaminação; leaderboard vivo em bncc.dev.

## Sequência de execução

1. Escrever `CONTRIBUTING.md` (regra de instrumento de medição) + `CODE_OF_CONDUCT.md` + templates de issue.
2. Ligar CI com os testes existentes.
3. Adicionar nota de redistribuição em `resultados/`.
4. Flip do repositório para público, coordenado com a abertura do bncc-dados.
5. Anunciar em conjunto (dataset + benchmark + leaderboard).
