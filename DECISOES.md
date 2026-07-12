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
| B · discriminação de existência | 120 | 60 reais + 60 falsos (30 lacuna interna, 20 extensão de sequência, 10 combinação inexistente) |
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

## D4 · Computação: JSON bruto + gramática própria

O `@bncc/dados` 0.2.0 publica `computacao.json` via subpath
(`@bncc/dados/dados/computacao.json`), mas sem API tipada, e o `decodificar`
do pacote não reconhece códigos CO (o módulo entra na API na 1.0). O benchmark
carrega o JSON bruto do próprio pacote (nunca cópia local) e mantém em
`harness/lib/codigos.ts` as três gramáticas CO (EI0[123]CO\d{2}, EF\d{2}CO\d{2},
EM13CO\d{2}) ao lado das quatro gramáticas da BNCC-2018. Quando o pacote 1.0
expuser Computação na API tipada, esta camada encolhe.

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
