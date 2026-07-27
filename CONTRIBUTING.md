# Como contribuir

Obrigado pelo interesse. Antes de qualquer coisa, leia a regra que rege este
repositório — ela é diferente da de um projeto de software comum.

## A regra de ouro: isto é um instrumento de medição

O benchmark mede modelos de linguagem. Se os itens ou os julgamentos mudarem
depois de publicados, as notas deixam de ser comparáveis entre releases e o
instrumento perde o valor. Por isso:

> **Rodadas publicadas são imutáveis. A comunidade contribui para a próxima
> versão, nunca reescrevendo a atual.**

Duas consequências práticas, e elas são inegociáveis:

1. **Não aceitamos PRs que alterem `itens/` ou `resultados/` de rodadas já
   publicadas.** Nem para corrigir um erro real. A correção existe, mas entra
   pela porta certa (abaixo).
2. **Não publicamos o conjunto held-out**, nem sob pedido. Ver "held-out".

PRs que violem qualquer uma das duas serão fechados com um apontamento para
esta seção — não é julgamento sobre o mérito técnico da contribuição.

## O que fazer em cada caso

| Situação | Caminho |
|---|---|
| **Item com problema** (ambíguo, gabarito errado) | Abra uma **issue**, não um PR. Inclua o código do item, o valor observado × o esperado e a justificativa com fonte. Se procede, a correção entra na **próxima versão do banco de itens**, registrada em `DECISOES.md` e com novo congelamento. |
| **Proposta de item novo** | Issue. Itens são gerados pelo pipeline (seed + gramáticas), não escritos à mão; a proposta orienta a próxima geração. |
| **Modelo novo no leaderboard** | Issue. Entra em release MINOR, condicionado a rota estável (Bedrock/OpenRouter/direta) e custo. |
| **Harness, avaliador, exportadores, docs** | PR normal, com CI verde. Só não pode alterar notas de rodadas publicadas — o check de consistência do CI reprova automaticamente. |
| **Dúvida de metodologia** | Leia `METODOLOGIA.md` e as respostas cruas em `resultados/`; tudo é público. Se a doc estiver confusa, isso vira um ótimo PR. |

## O held-out

Existe um conjunto de itens gerado pelo mesmo pipeline que **nunca é
publicado**. Ele serve para distinguir, em re-medições futuras, aprendizado
real (o modelo melhora nos itens públicos *e* nos privados) de memorização do
teste publicado (melhora só nos públicos). Ver `DECISOES.md` D5.

Pedidos de acesso serão recusados. Não é falta de transparência: é o que faz o
ranking continuar significando alguma coisa depois de publicado.

## Antes de abrir um PR

```bash
pnpm install
pnpm typecheck
pnpm test
```

O projeto é deliberadamente enxuto: **dependências novas precisam de
justificativa** na descrição do PR e serão discutidas antes do merge.

Escreva em português. Mensagens de commit no imperativo, descrevendo o efeito
("Corrige escopo da tarefa C", não "correções").

## Reportar algo sensível

Não abra issue pública para vulnerabilidades, exposição de credenciais ou
suspeita de vazamento do held-out. Use o canal privado descrito em
`SECURITY.md`.

## Conduta

Participar deste projeto implica seguir o [Código de Conduta](CODE_OF_CONDUCT.md).
