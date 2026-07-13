# Revisão pré-bateria · 13/jul/2026

**Status: achados registrados, correções pendentes.** Cada correção deve
referenciar o identificador (RB-n) no commit; este documento é atualizado com
o hash do commit que resolve cada item. Nenhuma bateria paga roda antes de
RB-1 a RB-10 estarem resolvidos ou formalmente aceitos como risco.

## Contexto e método

Antes de disparar as baterias piloto (fronteira + segundo escalão, ~US$ 75-200
em chamadas de API) foi executada uma revisão profunda do harness, focada em:
corretude dos algoritmos de julgamento e agregação, integridade de execução e
cache, e auditabilidade dos artefatos para publicação científica.

Método: revisão multi-agente (33 agentes; 4 frentes de busca por ângulo de
corretude + limpeza), com **verificação adversarial independente** de cada
candidato. Resultado: 38 candidatos verificados, 37 confirmados (colapsando em
~19 defeitos distintos), 1 refutado. Os 10 mais severos estão registrados
abaixo; os demais são variações do mesmo defeito raiz.

## Achados confirmados

### Família 1 · números publicados sairiam errados

**RB-1 · Tarefa C não verifica escopo** (`harness/lib/avaliacao.ts:137`)
`item.gabarito.codigosValidos` é gerado pelo gerador mas nenhum julgador o
usa. Modelo que responde "5 habilidades de Computação do 3º ano" com 5 códigos
reais de Matemática recebe avaliação perfeita. Subconta erro sistematicamente.
Correção: novo campo `escopo` por código citado (`dentro`|`fora`), métrica
própria na agregação.

**RB-2 · Hedge mascara alucinação confiante** (`harness/lib/avaliacao.ts:70,107`)
A precedência de abstenção (correção do piloto de 12/jul) foi longe demais:
"Sim, EF04MA29 existe (...). Para detalhes, consulte o documento oficial."
vira `abstencao` em vez de `incorreto`, porque a frase de hedge no fim casa
com `detectarAbstencao`. Correção: abstenção só quando NÃO há resposta
substantiva (sim/não na tarefa B; texto proposto na A); hedge após resposta
não anula a resposta.

**RB-5 · Juiz não parseável vira "inventado" permanente** (`harness/avaliar.ts:93`)
`extrairVereditoJuiz(...) ?? 'nao'`: saída cortada/anômala do juiz vira
alucinação contada, é cacheada sem o texto bruto e se torna permanente e
inauditável. Correção: veredito `indeterminado` (re-tentado com maxTokens
maior; nunca contado como alucinação), cache guarda a resposta bruta do juiz.

**RB-6 · Associação código→trecho por indexOf colide prefixos**
(`harness/lib/avaliacao.ts:141` e `trechoDoCodigo:178`)
`indexOf("EF05CO01")` casa com o prefixo de "EF05CO011" citado antes; o trecho
avaliado (inclusive o enviado ao juiz) aponta para o lugar errado. É
exatamente o cenário do item especial do typo. Correção: localizar códigos por
regex com fronteira (posição exata de cada citação, na ordem do extrator), não
por substring.

**RB-7 · Tarefa D pune acerto em textos duplicados** (`harness/lib/gerador.ts:294`)
Computação tem 14 grupos de texto idêntico com códigos distintos (numeração
por ano × por bloco: EF69CO04 = EF06CO04 etc.). `julgarD` exige igualdade com
UM código; modelo que responde o outro código igualmente correto é contado
como alucinação. Verificado por regeneração: o held-out contém os casos; o
v1-rc escapou por sorte da seed. Correção: gabarito da D vira conjunto de
códigos aceitos (todos com o mesmo texto canônico); gerador registra o grupo.

### Família 2 · dinheiro em risco

**RB-3 · Chave de cache omite maxTokens e config de grounding**
(`harness/lib/execucao.ts:77`)
Smoke com `--max-tokens 256` contaminaria a bateria oficial (1024+) com
respostas truncadas reutilizadas silenciosamente. Correção: incluir maxTokens
(e, no grounded, identificador do mecanismo) na chave.

**RB-9 · Bateria roda com falsos não verificados** (`harness/executar.ts:45`)
Os 60 códigos falsos do v1-rc estão com `verificacao_antivexame: pendente`.
Se um deles existir em fonte não coberta, respostas corretas do modelo viram
alucinação publicada e a bateria paga se invalida. Correção: executar.ts
recusa itens com anti-vexame pendente, com flag explícita de override
(`--aceitar-antivexame-pendente`) para smokes; a verificação manual dos 60 é
bloqueio da bateria.

**RB-10 · Re-run com --limite trunca o artefato bruto da bateria**
(`harness/executar.ts:89`)
`writeFileSync` substitui `brutos-*.jsonl`; um debug com `--limite 10` na
mesma rodada apagaria os 900 registros pagos. Correção: merge por chave
(item, paráfrase) com o arquivo existente, nunca encolher; aviso quando a
seleção é parcial.

### Família 3 · auditoria externa impossível

**RB-4 · finish/stop reason descartado nos 4 adapters**
(`harness/provedores/anthropic.ts:22`, `openai-compat.ts`, `google.ts`, `bedrock.ts`)
Truncamento por max_tokens e safety blocks ficam indistinguíveis de resposta
genuína nos brutos; auditor não consegue excluir artefatos do harness.
Correção: campo `finish_reason` no RegistroBruto (padronizado entre adapters);
avaliação trata truncado/bloqueado como categoria própria (`resposta_invalida`),
fora das taxas de alucinação; reasoning tokens registrados quando o provedor
expõe.

**RB-8 · Vereditos do juiz irreprodutíveis a partir dos artefatos**
(`harness/avaliar.ts:105`)
`julgados.jsonl` só guarda a palavra do veredito; resposta bruta, versão
exata, tokens e custo do juiz ficam apenas no `cache/` (gitignored), e a chave
do cache do juiz omite a versão da rubrica. Correção: arquivo
`julgamentos-juiz-<rodada>.jsonl` commitado (prompt-hash, rubrica-versão,
resposta bruta, versão do modelo juiz, tokens, custo); versão da rubrica entra
na chave de cache.

## Refutado na verificação

- "julgarC deveria reusar trechoDoCodigo" (avaliacao.ts:141): duplicação
  apontada por um finder, refutada como defeito independente; a raiz é RB-6 e
  a correção unifica as duas implementações.

## Registro de resolução

| Achado | Commit | Data |
|---|---|---|
| RB-1 | pendente | |
| RB-2 | pendente | |
| RB-3 | pendente | |
| RB-4 | pendente | |
| RB-5 | pendente | |
| RB-6 | pendente | |
| RB-7 | pendente | |
| RB-8 | pendente | |
| RB-9 | pendente (código) + verificação manual dos 60 falsos (time) | |
| RB-10 | pendente | |

## Implicações para rodadas já executadas

Os pilotos de 12/jul (seca-piloto, smokes) foram medidos com RB-1/2/5/6/7
ativos: seus números continuam úteis como piloto, mas NÃO são comparáveis aos
das baterias pós-correção e não devem ser citados fora do time. Após as
correções, re-avaliar as rodadas existentes custa perto de zero (respostas
brutas preservadas; muda só o julgamento).
