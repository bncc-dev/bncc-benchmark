# Arquitetura

Como o benchmark está organizado e onde mexer para cada tipo de mudança.

## O pipeline

Cinco etapas, cada uma um CLI, cada uma lendo o artefato da anterior. Nenhuma
etapa altera o que a anterior produziu — é o que permite reexecutar qualquer
uma delas sem invalidar o resto.

```
gerar ──▶ itens/itens-v1.json
              │
executar ──▶ resultados/<rodada>/brutos-<modelo>-<modo>.jsonl
              │
avaliar  ──▶ resultados/<rodada>/juiz.jsonl + julgados.jsonl
              │
agregar  ──▶ resultados/<rodada>/agregados.json
              │
exportar-site ──▶ resultados/<rodada>/site/leaderboard-<versao>.json
```

**gerar** (`harness/gerar-itens.ts`) produz o banco de itens a partir do
dataset e de gramáticas de código, com PRNG seedado: mesma seed, mesmo banco.
Gera também o held-out privado, sob `--com-heldout` (ver `DECISOES.md` D5).

**executar** (`harness/executar.ts`) chama os modelos. Toda resposta passa pelo
cache em disco, indexado por identidade de requisição — reexecutar uma rodada
interrompida não recobra o que já foi pago. É a única etapa que gasta dinheiro,
e roda sempre localmente: o CI nunca executa o benchmark (D3).

**avaliar** (`harness/avaliar.ts`) julga. Tarefas B e D têm verificação
programática; A e C passam por pré-filtro de normalização e, quando não são
triviais, vão a um juiz LLM. O `juiz.jsonl` guarda a trilha completa do juiz,
para que qualquer julgamento seja auditável.

**agregar** (`harness/agregar.ts`) calcula as notas. Com `--verificar`,
recalcula a partir dos brutos e compara com o `agregados.json` commitado — é o
check que o CI roda a cada push e o que impede uma nota de ser editada à mão.

**exportar-site** (`harness/exportar-site.ts`) destila o leaderboard para o
bncc.dev. Artefato derivado: não altera resultado nenhum.

`congelar-itens.ts` fecha o banco `v1-rc` em `v1`, aplicando a pré-triagem dos
códigos falsos (D10).

## Onde fica o quê

| Diretório | Papel |
|---|---|
| `harness/*.ts` | Os CLIs — um por etapa do pipeline |
| `harness/lib/` | A lógica: geração, avaliação, agregação, cache, códigos, manifesto |
| `harness/provedores/` | Um adapter por API de modelo, sobre `fetch` puro |
| `harness/prompts/` | Prompts das quatro tarefas e do juiz |
| `itens/` | Banco de itens versionado e congelado |
| `resultados/<rodada>/` | Brutos, julgamentos, agregados e manifesto |
| `test/` | Um arquivo por módulo de `lib/` |

Peças que merecem atenção antes de mexer:

- `lib/codigos.ts` — as gramáticas de código da BNCC. Um erro aqui contamina a
  geração de itens e o julgamento ao mesmo tempo.
- `lib/manifesto.ts` — log aditivo por rodada; entradas nunca são removidas nem
  reescritas. É o registro de proveniência de cada resultado.
- `lib/cache.ts` — a identidade de uma requisição inclui `maxTokens` e o
  mecanismo de grounding. Mudar isso invalida cache legitimamente; mudar sem
  perceber faz uma rodada reaproveitar resposta de outra configuração.

## Adicionar um modelo

É a contribuição mais comum, e quase sempre são poucas linhas em
`harness/provedores/registro.ts`:

```ts
'meu-modelo': {
  id: 'meu-modelo',                        // usado em --modelos e nos nomes de arquivo
  provedor: 'openai-compat',               // anthropic | bedrock | openai-compat | google
  modelo: 'fornecedor/modelo-1.2',         // nome exato na API
  envKey: 'MINHA_API_KEY',                 // variável no .env
  baseUrl: 'https://api.exemplo.com/v1',   // só para openai-compat
  precos: { entrada: 1, saida: 5 },        // USD por milhão de tokens, informativo
  suportaGrounded: false,
},
```

Quatro coisas que costumam morder:

**Modelos com raciocínio interno precisam de `maxTokensPadrao` maior.** Eles
gastam orçamento pensando antes de escrever; sem folga a resposta sai truncada
e é descartada do cálculo (`finish_reason` diferente de `fim`).

**Pinar o provedor quando a rota é agregada.** Em roteadores como o OpenRouter,
use `corpoExtra` para fixar quem serve o modelo. Sem isso, a mesma rodada pode
sair de backends diferentes, com quantizações diferentes, e a medição deixa de
significar uma coisa só.

**`precos` é estimativa.** O custo real de cada rodada sai dos tokens gravados
nos brutos.

**Conferir o identificador na data da rodada.** Provedores renomeiam e repreçam
sem aviso.

Se o provedor não fala nenhum dos quatro protocolos existentes, aí sim é um
adapter novo em `harness/provedores/`, implementando a interface de
`provedores/tipos.ts`. Os existentes são curtos e servem de modelo.

Antes de propor um modelo novo no leaderboard oficial, leia o
`CONTRIBUTING.md`: medições novas entram por release, dependem de rota estável
e têm custo.

## Testes

```bash
pnpm test        # tudo
pnpm typecheck
```

Um arquivo de teste por módulo de `lib/`. Vale saber o que alguns protegem,
porque falham por motivo não óbvio:

- `gabarito.test.ts` fixa o SHA-256 do dataset vendorizado. Falha se o arquivo
  mudar sem atualizar a proveniência — é intencional (D4).
- `congelamento.test.ts` garante que todo código falso tenha pré-triagem
  concluída antes do congelamento do banco.
- `gerador.test.ts` cobre os invariantes da geração, incluindo determinismo por
  seed.
- `execucao.test.ts` cobre a identidade de cache — o teste que impede
  reaproveitamento indevido entre configurações.

## O que não muda

Rodadas publicadas são imutáveis: nem itens nem resultados de release existente
são editados, e o check de consistência do CI reprova quem tentar. Correções
entram na próxima versão. Ver `CONTRIBUTING.md`, `RELEASES.md` e o D11.
