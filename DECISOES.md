# DECISOES.md · benchmark de alucinação

Decisões de desenho deste benchmark, no mesmo espírito do `DECISOES.md` do
bncc-dados: cada escolha que envolve interpretação ou trade-off vira uma entrada
numerada, com racional. Documentos de referência: design doc e plano de
implementação no repositório de planejamento do bncc.dev
(`docs/plans/benchmark-alucinacao.md` e `benchmark-alucinacao-implementacao.md`).

## D1 · Stack TypeScript, sem build, provedores via fetch puro

Gerador, harness e avaliadores em TypeScript ESM (Node 22+, executados com
`tsx`), consumindo `@bncc/dados` do npm como gabarito. Sem SDKs de provedores:
três adapters sobre `fetch` (Anthropic, compatíveis com OpenAI, Google) cobrem
todos os modelos-alvo. Racional: dogfooding do pacote, consistência com o
ecossistema bncc.dev (ESM, NodeNext, strict, vitest), superfície mínima de
dependências.

## D2 · Distribuição default do banco de itens (~300)

| Tarefa | Itens | Composição |
|---|---|---|
| A · lookup direto | 80 | códigos reais |
| B · discriminação de existência | 120 | 60 reais + 60 falsos (30 extensão de borda, 20 profundos, 10 combinação inexistente; ver D8) |
| C · geração aberta | 40 | pedidos estratificados por etapa/componente |
| D · lookup inverso | 50 | códigos reais |
| Especiais | ~10 | typo EF05CO011/EF05CO11 (D6) e pares vizinhos de texto similar |

Computação (computacao-2022) representa ~20% dos itens, deliberadamente
super-representada em relação ao seu peso no dataset (141/1.721 ≈ 8%): é o
grupo de controle temporal (documento de 2022, raro em corpora de treino).
2 a 3 paráfrases por item. Parâmetros ajustáveis por flag no gerador
(determinístico por seed); esta tabela é o default registrado.

## D3 · Execução local-first

Execução e avaliação rodam na máquina do time; só os resultados entram no
repositório (via commit/PR). O CI nunca executa o benchmark: roda typecheck,
testes e o check de consistência (recalcular agregados a partir dos brutos e
comparar). Racional: keys de provedores não entram no GitHub; workload é
I/O-bound e cabe em qualquer máquina; a credibilidade vem dos artefatos
publicados (JSONL brutos + harness reproduzível), não do lugar onde o loop
rodou.

## D4 · Computação: vendorizada com proveniência + gramática própria

O `@bncc/dados@0.2.0` publicado no npm (09/jul/2026) antecede a extração de
Computação (11/jul/2026): não embute `computacao.json`, não tem API tipada
para o módulo e o `decodificar` não reconhece códigos CO (tudo isso entra na
1.0). Até lá, o benchmark vendoriza `computacao.json` do repositório
bncc-dados em `dados-vendorizados/`, com commit de origem e SHA-256
registrados em `PROVENIENCIA.md` e fixados em teste. As três gramáticas CO
(EI0[123]CO\d{2}, EF\d{2}CO\d{2}, EM13CO\d{2}) vivem em
`harness/lib/codigos.ts`, ao lado das quatro da BNCC-2018. Quando o pacote
1.0 expuser Computação, o diretório vendorizado sai e esta camada encolhe.

## D5 · Held-out privado fora do repositório

O conjunto held-out (mesma geração, seed distinta) é gravado em diretório
externo ao repositório e nunca é publicado. Ele existe para discriminar, em
re-medições futuras, aprendizado real (melhora nos itens públicos E no
held-out) de memorização do teste publicado (melhora só nos públicos).
O `.gitignore` bloqueia padrões `*heldout*` como defesa em profundidade.

## D6 · O typo EF05CO011 como item especial

O anexo oficial do Parecer CNE/CEB 2/2022 grafa EF05CO011 (três dígitos de
sequência); o dataset adota EF05CO11 (DECISOES 9-10 do bncc-dados). O benchmark
testa as duas formas na tarefa B: EF05CO11 tem gabarito "existe" e EF05CO011
tem gabarito "não existe" com nota explicando o typo do documento oficial.
Modelos que aprenderam do PDF original podem reconhecer a forma com typo;
o julgamento registra esse caso separadamente, sem penalizar como alucinação
comum (é divergência documentada entre fonte e forma canônica).

## D7 · Rótulo dos itens: v1-rc até o congelamento

O arquivo gerado agora é `itens-v1-rc.json` (release candidate). O congelamento
em `itens-v1.json` depende de duas coisas: verificação anti-vexame manual de
cada código falso (nenhum pode existir em currículo estadual ou material
derivado; o gerador emite o checklist com status `pendente`) e ratificação da
distribuição D2 pelo time.

## D8 · A numeração da BNCC é contígua: estratos de falsos redefinidos

Achado empírico de 12/jul/2026, verificado por teste: em todos os 1.721
códigos do dataset (BNCC-2018 + Computação), toda sequência numerada vai de 01
ao máximo sem nenhum buraco interno. O desenho original do benchmark previa
"lacunas internas da numeração" como armadilha principal da tarefa B; elas não
existem nos dados atuais. Os estratos de códigos falsos foram redefinidos:

1. **Extensão de borda** (`falso-extensao`): máximo + 1 de uma sequência real
   (ex.: EF67LP39 quando a série termina em 38). A armadilha mais difícil,
   inclusive nas fronteiras de competência do EM (EM13LGG106 quando a
   competência 1 termina em 105).
2. **Profundo** (`falso-profundo`): máximo + 2 a + 15. Plausível, mas mais
   distante da borda.
3. **Combinação inexistente** (`falso-combinacao`): prefixo gramaticalmente
   válido sem nenhum código (ex.: EF01AR01, porque Arte numera por blocos).

A detecção de buracos internos permanece no código e no CI como invariante:
se uma versão futura do dataset introduzir buracos (habilidades revogadas,
por exemplo), eles voltam a ser o estrato mais forte.

## D9 · AWS Bedrock como provedor, grounded via loop de tool-use próprio

Os modelos Claude podem rodar via AWS Bedrock (Converse API) com API
key/bearer token (`AWS_BEARER_TOKEN_BEDROCK`), o que mantém o adapter em
fetch puro, sem SigV4 nem SDK (coerente com D1). Como o Bedrock não tem o MCP
connector da API direta da Anthropic, a rodada grounded usa um loop de
tool-use explícito com um mini-cliente MCP falando com mcp.bncc.dev
(stateless, JSON-RPC por HTTP). O mecanismo fica registrado por chamada nos
brutos (`mcp:...` para o connector nativo, `mcp-loop:...` para o loop), e o
mesmo loop é a base do grounded de OpenAI/Google no M5. Ao comparar
resultados, rodadas pelo mesmo modelo em provedores diferentes são medições
distintas (versões e serving podem divergir); o leaderboard identifica o
provedor.

## D10 · Verificação anti-vexame: protocolo de três categorias

A pergunta da tarefa B é sempre "existe NA BNCC?", então um código que exista
apenas em currículo estadual não invalida o gabarito "não". A verificação
manual dos falsos serve para CLASSIFICAR, não para descartar:

1. **Limpo**: nenhuma ocorrência relevante fora do formato. Conta como
   alucinação normal quando aceito.
2. **Existe em derivado** (currículo estadual/municipal ou material de ampla
   circulação): mantém gabarito "não", ganha nota no item e é reportado como
   categoria separada ("confusão com currículo derivado"), não somado à
   invenção pura.
3. **Zona cinzenta federal** (grafado em documento do MEC/CNE, como o typo
   EF05CO011): vira item especial com gabarito anotado.

Fluxo operacional: pré-triagem automatizada por busca (planilha em
`docs/anti-vexame/`) + adjudicação humana registrada no campo
`verificacao_antivexame` de cada item. O congelamento `itens-v1` exige os 60
com status diferente de `pendente`.
