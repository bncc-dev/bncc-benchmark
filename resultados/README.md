# Resultados

Respostas cruas, julgamentos e agregados de cada rodada. Publicar isto por
inteiro é deliberado: sem as respostas, uma nota é um número em que se acredita
ou não; com elas, qualquer pessoa confere por que um modelo pontuou o que
pontuou.

## Estrutura de uma rodada

| Arquivo | Conteúdo |
|---|---|
| `brutos-<modelo>-<modo>.jsonl` | Uma linha por resposta: prompt enviado, resposta literal, custo, tokens, versão do modelo |
| `juiz.jsonl` | Julgamento de cada resposta pelo avaliador |
| `julgados.jsonl` | Respostas cruzadas com o julgamento |
| `agregados.json` | Notas por modelo e por tarefa |
| `manifesto.json` | Registro auditável: quando rodou, com qual commit do harness, contra qual versão do banco de itens e do dataset |
| `lotes-<modelo>-<modo>.json` | Execução em lote (Batch API): ids dos lotes remotos, tempos de submissão e coleta, situação de cada pedido. Sem respostas nem chaves |

Os agregados são recalculáveis a partir dos brutos — é o que o CI verifica a
cada push (`pnpm agregar --rodada <nome> --verificar`). Se alguém editar uma
nota à mão, o check reprova.

## Origem das respostas

As respostas foram produzidas por modelos de terceiros, chamados pelas rotas
registradas em cada `manifesto.json`. Cada rodada oficial tem a sua data de
coleta, o elenco e as rotas descritos na entrada correspondente de
`RELEASES.md`. A mais recente, `oficial-seca-2026-11`, cobre **20.700 respostas
de 23 modelos**, coletadas entre **24 e 25 de novembro de 2026**, pelas APIs
diretas das empresas (OpenAI, Anthropic, Google, xAI, Moonshot, Meta,
Maritaca), pelo OpenRouter (DeepSeek e Qwen) e pelo Amazon Bedrock. A versão exata de cada modelo
está no campo `versao_modelo` de cada linha — não no nome do arquivo, que usa
apelidos internos do elenco.

## Reuso

O conteúdo deste diretório é publicado sob CC BY 4.0 (ver `LICENSE-DADOS.md`),
o que cobre a nossa parte: a curadoria, os julgamentos e a agregação.

As respostas em si foram geradas por serviços de terceiros, e **o reuso delas
está sujeito aos termos de cada provedor à época da coleta**. Publicar outputs
de modelo é prática estabelecida em benchmarks (HELM, LMSYS Arena e outros
publicam respostas cruas), e as restrições usuais — como não usar outputs para
treinar modelos concorrentes — recaem sobre quem reutiliza, não sobre quem
publica. Se o seu uso for além de análise e reprodução, confira os termos do
provedor do modelo em questão.

## Imutabilidade

Rodadas publicadas não são editadas. Um erro encontrado depois da publicação
vira registro em `DECISOES.md` e correção na próxima release — nunca uma
alteração retroativa, que quebraria a comparabilidade entre versões. Ver
`CONTRIBUTING.md` e `RELEASES.md`.
