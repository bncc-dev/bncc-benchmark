# Guia de gestão da comunidade

Manual operacional para quem cuida da comunidade open source do bncc-benchmark (e, por extensão, do ecossistema bncc.dev). Escrito para funcionar mesmo sem contexto técnico profundo: quando em dúvida, escale para o mantenedor técnico.

## O princípio que rege tudo

O benchmark é um **instrumento de medição**. Diferente de um projeto de software comum, aqui nem toda contribuição bem-intencionada pode ser aceita: mudar um item ou um julgamento publicado quebra a comparabilidade entre releases. A comunidade contribui **para a próxima versão**, nunca reescrevendo a atual. Internalize isso e 80% das decisões de triagem ficam óbvias.

Regras-fonte (não repita, aponte):

- `CONTRIBUTING.md` — o que aceitamos e como
- `RELEASES.md` + D11 do `DECISOES.md` — versionamento e imutabilidade
- `docs/plano-abertura.md` — o que é aberto e o que nunca será (held-out)

## Triagem de issues (o dia a dia)

Responda toda issue em até **2 dias úteis**, nem que seja "recebido, vamos analisar". Fluxo:

| Tipo | Como reconhecer | O que fazer |
|---|---|---|
| Item com problema | "o gabarito do item X está errado", "ambíguo" | Rotular `item-proximo-banco`. Agradecer, explicar que correções entram na próxima versão do banco de itens (nunca na atual) e pedir: código do item, valor observado × esperado, justificativa com fonte. Escalar ao mantenedor para adjudicação. |
| Pedido de modelo novo | "adicionem o modelo Y no leaderboard" | Rotular `modelo-proxima-rodada`. Explicar que medições novas entram em release MINOR e dependem de rota estável (Bedrock/OpenRouter/direta) e custo. Manter uma issue-mãe "próxima rodada" e agregar pedidos lá. |
| Dúvida de metodologia | "por que o modelo Z tirou nota N?" | Apontar `METODOLOGIA.md` e as respostas cruas em `resultados/` (tudo é público e reproduzível). Se a dúvida revelar texto confuso na doc, isso vira PR de documentação — ótimo good first issue. |
| Bug de harness/exportador | erro ao rodar, typo, melhoria de código | Caminho normal de PR. CI valida. Só não pode alterar notas de rodadas publicadas. |
| Acusação de erro/viés no ranking | tom público, às vezes de provedor interessado | Não debater no calor. Responder com processo: "toda resposta bruta e julgamento estão publicados; aponte os itens específicos e abrimos adjudicação". Escalar sempre. |
| Pedido do held-out | "liberem o conjunto privado" | Recusar com gentileza e explicar o porquê (anti-contaminação, D5): ele é o que garante que o ranking continue significando algo. Resposta pronta abaixo. |

### Labels sugeridas

`item-proximo-banco` · `modelo-proxima-rodada` · `metodologia` · `harness` · `docs` · `good-first-issue` · `adjudicacao` (aguardando decisão do mantenedor) · `nao-planejado`

## PRs: o que pode ser mergeado sem escalar

- Documentação, typos, exemplos, exportadores do site.
- Código do harness com CI verde **e** que não toca `itens/` nem `resultados/` de rodadas publicadas.

**Escale sempre**: qualquer diff em `itens/`, `resultados/`, `METODOLOGIA.md`, avaliador/rubrica, ou que adicione dependência nova (o projeto é deliberadamente enxuto).

## Versionamento e releases (o que você precisa saber)

Semver nas tags git (`vX.Y.Z`), regra D11:

- **PATCH** — re-julgamento dos mesmos brutos (ex.: correção no avaliador).
- **MINOR** — medições novas na mesma metodologia (modelos novos, rodada grounded).
- **MAJOR** — quebra de comparabilidade (banco de itens novo, mudança de rubrica).

Releases são **imutáveis**: alterou qualquer julgamento, é número novo, nunca sobrescrever. O processo operacional (CI verde → entrada no `RELEASES.md` → tag → push) é do mantenedor; o papel da comunidade/gestão é **comunicar**: changelog legível para não-técnicos a cada release, destacando o que mudou no leaderboard e por quê.

## Comunicação e tom

- **Idioma**: pt-BR por padrão; responda em inglês se a issue vier em inglês.
- **Tom**: acolhedor e firme — as regras do instrumento não são negociáveis, mas a explicação é sempre devida. "Devolvida com carinho" é o espírito da casa.
- **Transparência como resposta padrão**: quase toda controvérsia se resolve apontando para dados publicados (respostas cruas, julgamentos, manifestos com checksums). Nunca prometa mudança de nota em conversa; tudo passa por adjudicação registrada em `DECISOES.md`.
- **Provedores de LLM são parte interessada**: trate pedidos deles como qualquer issue, com processo idêntico e público. Nenhum canal privilegiado.

## Rituais sugeridos

- **Semanal**: varrer issues sem resposta; atualizar a issue-mãe da próxima rodada.
- **Por release**: post de anúncio (o que mudou, custo, líder/lanterna), agradecimento nominal a contribuidores.
- **Trimestral**: revisar `good-first-issue` (ainda são boas portas de entrada?) e este guia.

## Respostas prontas

**Held-out**: "O conjunto held-out é privado por desenho e assim permanecerá: ele existe para distinguir melhora real de memorização do teste público. Abri-lo destruiria a capacidade do benchmark de detectar contaminação — justamente o que protege a credibilidade do ranking que você consulta. Metodologia completa em METODOLOGIA.md."

**Correção de item**: "Obrigado pelo relato! Itens publicados não mudam dentro de uma versão (isso quebraria a comparabilidade entre modelos já medidos). Sua correção, se procedente, entra na próxima versão do banco com crédito a você. Para avançar, precisamos de: código do item, o problema observado e a fonte que sustenta a correção."

**Modelo novo**: "Anotado na fila da próxima rodada (issue #X). Critérios: rota de acesso estável e custo de medição. Novas medições saem em releases MINOR."

## Quando escalar imediatamente

Segurança (chave exposta, dado sensível), imprensa/uso comercial do ranking em marketing de terceiros com erro, qualquer coisa jurídica, e conduta que viole o `CODE_OF_CONDUCT.md`.
