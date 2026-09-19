# DECISOES.md · benchmark de alucinação

Decisões de desenho deste benchmark, no mesmo espírito do `DECISOES.md` do
bncc-dados: cada escolha que envolve interpretação ou trade-off vira uma entrada
numerada, com racional. O protocolo completo de medição está em
`METODOLOGIA.md`; o que cada release contém, em `RELEASES.md`.

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

**Emenda (27/jul/2026): a seed do held-out também é privada.** A auditoria
pré-abertura mostrou que proteger o arquivo não basta — o gerador é
determinístico, então a seed versionada permitia reconstruir o held-out item a
item a partir do próprio repositório. A seed passou a vir de `SEED_HELDOUT` no
`.env` e nenhum arquivo versionado (código, teste ou documento) pode voltar a
registrá-la ou descrever como derivá-la. Como consequência, a geração do
held-out virou **opt-in**: `pnpm gerar` produz só o banco público e
`pnpm gerar --com-heldout` (só mantenedores, exige a variável) regera também o
privado. O padrão precisa servir quem não tem a seed, que será a maioria depois
da abertura; e esquecer a flag é inofensivo, enquanto o inverso quebraria o
primeiro comando de todo contribuidor externo.

**O conjunto foi regerado com seed nova (27/jul/2026).** Reescrever o histórico
não bastou: depois do force-push, o GitHub seguia servindo os commits órfãos por
SHA direto, com a seed antiga recuperável pela API. Como o held-out nunca havia
sido usado em medição alguma (todas as rodadas até aqui apontam para
`itens/itens-v1.json`), regerar custou um comando e nenhuma comparabilidade —
e é a única remediação que não depende de coleta de lixo de terceiros nem da
suposição de que ninguém copiou os objetos antes. A seed antiga hoje abre um
conjunto que não é mais o held-out.

A seed nova é aleatória de origem criptográfica, não derivada da pública: se um
dia outro valor escapar, a estrutura não deve ser adivinhável. Limite conhecido:
o PRNG (mulberry32, `harness/lib/aleatorio.ts`) trunca a seed em 32 bits, então
o espaço é de ~4,3 bilhões. Ampliá-lo exigiria trocar o PRNG, o que mudaria
também o banco público já congelado. A defesa efetiva contra varredura não é o
tamanho do espaço e sim a ausência de oráculo: sem resultados item a item
publicados, não há como reconhecer um acerto.

Consequência para publicação: do held-out divulgam-se apenas agregados, nunca
itens ou resultados item a item — estes seriam exatamente o oráculo que falta.

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
em `itens-v1.json` depende de duas coisas: pré-triagem manual de
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

## D10 · Pré-triagem dos códigos falsos: protocolo de três categorias

> Terminologia: esta etapa foi chamada de "verificação anti-vexame" durante o
> desenvolvimento, e o nome sobrevive nos campos `verificacao_antivexame` e
> `antivexame_categoria`. Eles não são renomeados porque estão gravados no
> banco de itens congelado e nos julgados publicados, imutáveis por release
> (D11). Na documentação, o termo é **pré-triagem**.

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
`docs/pre-triagem/`) + adjudicação humana registrada no campo
`verificacao_antivexame` de cada item. O congelamento `itens-v1` exige os 60
com status diferente de `pendente`.

## D11 · Releases de resultados com semver

Cada conjunto de resultados que o time trata como referência vira uma
release: git tag `vX.Y.Z` + entrada em `RELEASES.md` declarando a composição
exata (rodadas, modelos, itens_versao, avaliador, rubrica, dataset, custo,
data). Releases são imutáveis; qualquer alteração gera número novo:

- **PATCH**: re-julgamento/correção sobre os mesmos brutos (sem medição nova).
- **MINOR**: medições novas com a mesma metodologia (modelos ou rodadas
  adicionados, ex.: a rodada grounded).
- **MAJOR**: quebra de comparabilidade (banco de itens ou protocolo novos);
  o leaderboard recomeça a série.
- **0.x** enquanto a metodologia ainda pode mudar. Publicação não promove
  versão: o benchmark abriu em 0.1.0 e segue em 0.x.
- **1.0.0** quando o protocolo estabilizar — banco de itens, rubrica e
  avaliador maduros o bastante para que a série de comparabilidade seja um
  compromisso, não uma expectativa.

**Emenda (27/jul/2026):** a regra anterior amarrava 1.0.0 à primeira
publicação pública. Trocada porque as duas coisas não são a mesma: abrir o
repositório é uma decisão de transparência, estabilizar o protocolo é uma
decisão técnica. Numerar 1.0.0 no dia da abertura prometeria estabilidade que
o banco de itens ainda não tem — a v1 pode ganhar correções, e o 0.x avisa
isso a quem for citar o benchmark.

Os manifestos por rodada (D3/RB-8) já amarram cada artefato a config e
commit; a release é o laço externo que dá nome citável ao conjunto.
Decisão do time em 15/jul/2026.

## D12 · Rodada oficial nova = cache novo; snapshots datados quando existirem

O cache em disco (`cache/`) protege contra re-execução acidental dentro de uma
rodada, mas a chave (modelo + prompt + config) não distingue QUANDO a resposta
foi obtida. Modelos servidos por API mudam por baixo de aliases sem data — o
fenômeno é documentado na literatura (Chen, Zaharia & Zou 2023, "How Is
ChatGPT's Behavior Changing over Time?") e foi observado neste projeto na
prática: entre jul e ago/2026, provedores repreçaram aliases (`qwen3.7-max`,
`kimi-k2.6`) e a Fireworks deixou de servir o alias `deepseek-v4-flash`
(mantendo o snapshot datado). Reaproveitar cache entre rodadas oficiais
misturaria medições de datas diferentes sob o rótulo de uma data só.

Regras adotadas (15/ago/2026):

1. **Cada rodada oficial começa com cache vazio.** O cache da rodada anterior
   é arquivado (`cache-YYYY-MM/`), não descartado: continua servindo à
   retomada/reprodução daquela rodada. Dentro de uma mesma rodada, o cache
   segue fazendo o que sempre fez (retomada barata, determinismo do
   checkpoint).
2. **Todos os modelos do elenco fazem chamadas frescas**, inclusive os que não
   mudaram de versão entre rodadas — é exatamente neles que a deriva
   silenciosa passaria despercebida. Smokes e pilotos podem reaproveitar
   cache à vontade.
3. **Identificadores de modelo usam snapshot datado quando o provedor
   oferecer** (ex.: `deepseek-v4-pro-0813` em vez de `deepseek-v4-pro`).
   Aliases sem data só quando não houver alternativa, e o `versao_modelo`
   gravado nos brutos registra o endpoint que de fato serviu.

Custo desta política: re-medir o elenco inteiro a cada rodada oficial (~US$
100-150/rodada na escala atual) em vez de pagar só pelos modelos novos. É o
preço de poder afirmar que todos os números de uma rodada são da mesma janela
temporal. Alternativa considerada e rejeitada: reaproveitar julho para os
modelos "inalterados" com um teste de deriva amostral (subamostra pareada
jul×ago, McNemar) — defensável e mais barata, fica documentada aqui como opção
para quando o elenco ou o custo crescerem a ponto de justificar a complexidade
extra no manifesto.

## D13 · Identidade de modelo entre releases; condição por modelo; elenco parcial

A preparação da segunda rodada oficial (ago/2026) expôs três casos que a D11
não cobria. Ela regula o que muda **dentro** de uma release; estes são sobre o
que muda **entre** releases.

### D13.1 · A unidade de identidade é o modelo, não a vaga

Na v0.1.0, `kimi` significava Kimi K2.6; na rodada de agosto, o mesmo id passou
a apontar para o K3 — e o mesmo vale para `grok`, `qwen-max` e `gemini-flash`.
Quem cruzar duas releases pela chave leria "o kimi melhorou" quando o que houve
foi troca de modelo. O benchmark existe para medir modelos, então **o id
identifica o modelo, não o lugar dele no elenco**.

Regra: quando o modelo por trás de um id muda de versão, o id muda junto
(`kimi-k26` e `kimi-k3` são linhas distintas, não uma linha com histórico).
Ids já publicados nunca são reapontados. O `APRESENTACAO` do exportador guarda
o nome público de cada id, incluindo os aposentados, porque releases antigas
continuam citáveis.

Consequência assumida: o leaderboard não tem série temporal por modelo — tem
fotografias datadas. Uma comparação entre gerações (K2.6 × K3) é legítima, mas
é comparação entre dois modelos, e o texto deve dizer isso.

### D13.2 · Mudança de condição de execução vale por modelo, e é declarada

`max_tokens` faz parte da identidade da chamada (`harness/lib/execucao.ts`), e
mudá-lo muda a medição. Casos reais desta rodada: `deepseek-flash` rodou a
1024 em julho e passou a 4096 em agosto (a 1024 o snapshot novo truncava com
resposta vazia, porque raciocina antes de responder); `qwen-flash` entrou já
com 4096 pelo mesmo motivo.

Regra: alterar condição de execução de **um** modelo não quebra a rodada nem
força MAJOR — mas **entra na entrada da release, nomeando o modelo, o valor
antigo, o novo e o motivo**. Comparar esse modelo entre releases exige a
ressalva. Se a condição mudar para o elenco inteiro (a flag global, o prompt,
o número de paráfrases, a temperatura), aí é protocolo novo: **MAJOR**.

### D13.3 · Elenco parcial: só entra quem completou

Uma rodada pode terminar com modelos incompletos (orçamento, rate limit
persistente do provedor, rota que caiu). Regra: **a release publica apenas
modelos com a bateria completa**; quem ficou pela metade não entra e é
**nomeado na entrada da release**, com o motivo e o estado em que parou.

Racional: amostras desiguais na mesma tabela produzem intervalos de confiança
diferentes por linha, e num leaderboard de ~20 modelos separados por poucos
pontos isso torna metade das comparações inconclusivas. Pior, decidir quem
fica com amostra menor é uma escolha do mantenedor correlacionada com o
resultado — viés de seleção. Publicar menos modelos e dizer quais faltaram é
mais honesto que publicar todos com régua diferente.

Os brutos parciais permanecem no repositório e no cache: servem para retomar a
medição numa release seguinte, sem custo repetido.

Decisão de 16/ago/2026, durante a rodada `oficial-seca-2026-08`.

## D14 · Grounded é estudo de intervenção, não leaderboard

A rodada grounded (modelo conectado ao `mcp.bncc.dev`, prevista em D9 e
prometida como release MINOR na v0.1.0 e na v0.2.0) não entra no leaderboard
como segunda coluna de nota. Ela é publicada como **estudo de intervenção**
("acesso à fonte"), com artefato e vocabulário próprios.

### Racional

1. **Construtos diferentes.** A rodada seca mede conhecimento memorizado
   sobre a BNCC. A grounded mede competência de uso de ferramenta e fidelidade
   à fonte. Colocar as duas notas lado a lado, com os mesmos ids e a mesma
   nota composta, convida à leitura de que são a mesma medida.
2. **Fonte e gabarito são o mesmo dataset.** O MCP serve exatamente os dados
   contra os quais o julgamento é feito. Um modelo que chama `bncc_lookup` e
   copia acerta a tarefa A por construção (smoke de 16/jul/2026: 10/10
   `fiel_exato`). Como ranking, o resultado é quase trivial; como demonstração
   de que a alucinação desaparece com acesso à fonte, é a tese do projeto.
3. **Conflito de interesse.** Quem mantém o benchmark mantém a ferramenta.
   Ablações fonte-fechada × fonte-aberta são desenho padrão na área (Roberts
   et al. 2020; Lewis et al. 2020; Chen et al. 2023, RGB), mas exigem
   declaração explícita e um controle que separe o mérito do dado do mérito
   do instrumento.

### O que o estudo mede

O objeto é o **efeito da intervenção**, não o modelo: o delta seco→grounded
por modelo, com intervalo de confiança. Além dele, quatro medidas que não são
triviais mesmo com a fonte disponível:

- **Uso da ferramenta**: o modelo consulta ou responde de memória
  (`tools_chamadas = 0`)?
- **Rejeição negativa** (tarefa B): quando a fonte diz que o código não
  existe, o modelo aceita ou insiste?
- **Alucinação residual** (tarefa C): lista o que a fonte devolveu ou
  acrescenta itens inventados?
- **Erro apesar da fonte**: chamou, recebeu o dado correto e respondeu errado
  — separado de "não chamou", como a METODOLOGIA já prometia.

### Regras

1. **Três condições, não duas.** Além de *seca* e *MCP*, uma condição de
   controle *contexto*: os registros relevantes do gabarito colocados no
   prompt, sem ferramenta. A comparação MCP × contexto isola o que é mérito
   de ter o dado e o que é mérito do mecanismo de tool-use. Sem esse controle,
   todo ganho é atribuível a "ter informação", e o MCP como instrumento fica
   sem evidência própria.
2. **Um mecanismo por estudo.** O loop de tool-use no cliente (`mcp-loop`,
   D9) alcança todo o elenco; os connectors MCP nativos (OpenAI, Anthropic,
   xAI, Google; levantamento de 24/ago/2026) cobrem menos da metade e mudam
   quem controla as voltas, o teto e a latência. A condição MCP usa o
   `mcp-loop` para todos os modelos. Connector nativo, se medido, é condição
   distinta e declarada, nunca misturada na mesma tabela.
3. **Versão da fonte carimbada.** A versão dos dados servida pelo MCP entra
   no manifesto da rodada e na identidade de cache (lacuna registrada no
   commit `a408a3d`: a chave não capturava a data-version remota).
4. **Declaração de conflito de interesse** no artefato publicado: a fonte de
   grounding e o gabarito são o mesmo dataset, mantido pelo mesmo time.
5. **Artefato à parte.** Relatório próprio com delta por modelo (IC), uso de
   ferramenta, rejeição negativa, alucinação residual, custo e latência. Sem
   coluna no leaderboard principal; no máximo um link. Versionado como série
   própria (não é MINOR da série do leaderboard, porque introduz condições
   novas; se um dia entrar na série, é MAJOR conforme D11).
6. **Vocabulário público.** "Estudo de intervenção: acesso à fonte" (ou
   "ablação: efeito do grounding"). Nunca "benchmark do MCP" nem "leaderboard
   grounded". A mensagem é: sem acesso à fonte os modelos inventam X%; com
   acesso ao dado estruturado, Y%; o MCP do bncc.dev é uma das formas de dar
   esse acesso.

### Consequências

- A promessa "rodada grounded em release MINOR futura" (RELEASES.md v0.1.0 e
  v0.2.0) fica **reinterpretada**: o que sai é o estudo descrito aqui, não
  uma coluna nova no leaderboard. A próxima entrada de release registra isso.
- Antes da bateria: avaliador e agregador passam a ler `tools_chamadas` e a
  distinguir as quatro medidas acima; a condição *contexto* precisa de
  gerador de prompt próprio; o adapter Anthropic direto está defasado em
  relação ao connector atual (beta `mcp-client-2025-11-20` + `mcp_toolset`)
  e só importa se a condição "connector nativo" for medida.
- Rejeitado: publicar leaderboard grounded ao lado do seco com os mesmos ids
  e nota composta; usar só connectors nativos na rodada oficial (dois regimes
  de medição, elenco pela metade).

Decisão de 24/ago/2026, a partir do levantamento de como cada empresa trata
MCP em chamadas de API (registro na sessão de análise; nada implementado).

### Emenda D14.1 (24/ago/2026) · O estudo roda pelas APIs diretas de cada empresa

A política de rotas de 13/jul/2026 (execução só via Bedrock e OpenRouter,
por controle de faturamento) vale para o **leaderboard**. O estudo de
intervenção fica **fora dela**: todas as suas condições (seca pareada,
contexto, MCP e connector nativo) rodam pela API direta de cada empresa,
com as keys do time.

Racional, a partir dos smokes de 24/ago/2026 (`smoke-direto-2026-08`,
`smoke-mcp-2026-08`; registro em `interno/revisoes/`):

1. **O agregador traduzia parâmetros em silêncio.** Pela rota direta
   descobrimos que a OpenAI rejeita `max_tokens` nos gpt-5.x, só aceita
   function tools em Chat Completions sem raciocínio, e que Claude 5 e
   gpt-5.6 (Responses) rejeitam `temperature`. Nada disso era visível via
   OpenRouter. Num estudo cujo objeto é o mecanismo de acesso à fonte, o
   que chega ao modelo precisa ser exatamente o que enviamos.
2. **Connector nativo só existe na rota direta.** A condição "connector
   nativo" (regra 2) é impossível por agregador.
3. **As três condições na mesma rota.** A seca pareada também roda direta,
   na mesma janela e com o mesmo cache: o estudo fica autocontido e não
   depende da seca do leaderboard (rota e data diferentes).
4. **Custo.** ≈ US$ 80–110 distribuídos por oito provedores, sem aporte no
   OpenRouter.

Regras:

- **Ids com sufixo de mecanismo**: `-direto` (loop no cliente, `mcp-loop:`)
  e `-mcp` (connector nativo, `mcp:`). Nunca reaproveitam ids do leaderboard
  (D13.1); não entram no leaderboard.
- **Condições que o protocolo previa e a rota direta não permite são
  declaradas por modelo, não silenciadas**: temperatura ausente (gpt-5.6 na
  Responses API; Sonnet 5, Opus 5, Fable 5), temperatura 1 (Kimi K3),
  raciocínio desligado (gpt-5.6 em Chat Completions, condição A). O campo
  correspondente fica no registro (`semTemperatura`, `corpoExtra`) e a
  ressalva vai para o relatório do estudo.
- **Modelo sem rota direta viável não entra no estudo** — hoje, Qwen
  (sem acesso à API da Alibaba; connector exige SSE). Decisão de 24/ago/2026:
  o estudo segue sem a Alibaba, declarando a lacuna de cobertura no
  relatório; Qwen entra numa expansão futura se a rota abrir. Não se recorre
  ao agregador para completá-lo.
- **Anthropic na condição A**: via Bedrock (loop já existente, token
  próprio) ou via loop de tool-use na Messages API, a implementar; nunca via
  OpenRouter.

Consequência para o `.env`: as keys diretas, antes ociosas, passam a ser
operacionais; `carregarEnv` deve dar precedência ao `.env` sobre variáveis
de shell (hoje é o inverso, e keys antigas exportadas no perfil quebraram o
primeiro smoke).

## D15 · Rotas diretas no leaderboard e execução em lote

A política de rotas de 13/jul/2026 (execução só via Bedrock e OpenRouter,
por controle de faturamento) deixa de valer para o leaderboard. A D14.1 já a
tinha revogado para o estudo de intervenção; esta decisão estende a regra ao
leaderboard e acrescenta a execução em lote.

### Racional

1. **O agregador traduzia parâmetros em silêncio.** O smoke de 16/set/2026
   (`resultados/smoke-direto-leaderboard-2026-09/`, 30 itens, seis modelos,
   rota direta × OpenRouter) confirmou o que a D14.1 tinha visto no estudo:
   Claude 5 e gpt-5.6 rejeitam `temperature`, a OpenAI exige
   `max_completion_tokens`, Kimi K3 só aceita temperatura 1. Via OpenRouter
   nada disso era visível, e a rodada v0.2.0 rodou esses modelos sem
   temperatura 0 sem que o benchmark soubesse. A METODOLOGIA promete
   temperatura 0; a rota direta é a única em que essa promessa é verificável
   e, quando impossível, declarável (D13.2).
2. **A rota não muda a régua.** No smoke pareado de 16/set (30 itens, seis
   modelos nas duas rotas) foram 157 de 180 vereditos iguais. Na rodada
   oficial, comparando os mesmos 300 itens de agosto e setembro (vereditos
   novos projetados na escala da rubrica v1), os modelos que trocaram de
   rota variaram perto da faixa dos que não trocaram: o
   piso de variação natural entre rodadas é 86% a 98% de concordância
   (sabiazinho-4 e haiku-bedrock, mesma rota), e quem trocou ficou entre 79%
   e 90%. Sete dos oito modelos comparáveis variaram menos de 3 pontos na
   nota; a exceção é o grok-46, discutido como ressalva na v0.3.0. A
   diferença que importa não é a nota, é a fidelidade do que chega ao modelo.
3. **Contagem de raciocínio.** Cada API informa os tokens de raciocínio de
   um jeito; o OpenRouter normalizava. Os adapters diretos foram corrigidos
   em 16/set (xAI fora de `completion_tokens`, Gemini compatível sem campo,
   Anthropic em subcampo); sem isso o custo saía até 17× menor. A correção é
   pré-requisito desta decisão, e os brutos do estudo de agosto para grok e
   gemini na rota direta carregam custo subestimado (a declarar na release).
4. **Batch paga o que promete.** OpenAI, Anthropic e Google processam lotes
   em até 24 h por metade do preço, e o volume de tokens medido foi o mesmo
   do síncrono (Fable 1,12→0,60; Opus 1,03→0,53; Gemini Pro 0,67→0,33 nos
   30 itens). Só existe pela rota direta e só aceita chamadas sem tools.
5. **Anthropic direta resolve a exceção temporária.** O Bedrock da conta
   segue 403 para Sonnet 5, Opus 5 e Fable; a key direta tem acesso a todos.

### Regras

1. **Rota**: cada modelo do leaderboard roda pela API direta da própria
   empresa. OpenRouter ou Bedrock só onde a rota direta não é viável, como
   exceção declarada na entrada do registro (hoje: Qwen, sem acesso na
   Alibaba; DeepSeek, primeira parte vetada pela política de privacidade da
   conta, servido pela Fireworks; sonnet-4.6 e haiku-4.5 no Bedrock, por
   continuidade do juiz).
2. **Ids**: o id identifica o modelo (D13.1) e não muda com a rota. A rota
   fica registrada por chamada em `versao_modelo` e no campo `rotas` do
   leaderboard, o que satisfaz a D9 (provedores diferentes são medições
   distintas e o leaderboard identifica o provedor).
3. **Batch é transporte, não condição**: mesmo corpo de requisição, mesma
   identidade de chamada e mesma chave de cache do síncrono; registrado por
   chamada (`execucao: 'batch'`, `lote_id`) e separado no campo `rotas`
   ("(batch)"). Só no modo seco. Escalada de orçamento e retomada seguem as
   regras do síncrono (segundo lote para as cortadas; estado em
   `lotes-<modelo>-<modo>.json`). O desconto (`FATOR_PRECO_BATCH`) entra no
   custo registrado e é conferido na data da rodada.
4. **Condições impostas pela rota são declaradas por modelo** (D13.2):
   temperatura ausente (Claude 5, gpt-5.x/6), temperatura 1 (Kimi K3),
   contagem de raciocínio (xAI, Gemini). Ficam no registro e na release.
5. **Snapshot por baixo do alias**: quando a empresa troca o modelo sob o
   mesmo nome (qwen3.8-max → 0902 em 05/set/2026), o id medido fica
   congelado na release em que foi medido e o snapshot novo entra com id
   próprio (D12 regra 3 + D13.1).
6. **Numeração**: a próxima rodada oficial muda rota, transporte e elenco
   de uma vez e quebra a comparabilidade com a v0.2.0. Ela sai como
   **v0.3.0**, seguindo a série existente: em 0.x a D11 admite mudança de
   metodologia sem MAJOR, e o zero à esquerda é justamente o aviso. A
   entrada de release declara que a série recomeça nesta versão e não
   compara notas com a v0.2.0 (fotografias datadas, D13.1). Decisão do time
   em 16/set/2026.

### Consequências

- Registro reescrito (commit `e9d8c62`): rotas diretas, sete modelos novos
  (gpt-6-astra, fable-5-1, gemini-38-flash, deepseek-flash-41,
  qwen-38-max-0902, qwen-38-flash, muse-spark-13), aposentadorias
  (deepseek-v4-flash-0731, kimi-k2.5), gpt-sol repreçado. Só os sucessores
  entram no elenco; antecessores ativos ficam no registro para reprodução.
- Caminho de execução em lote (commit `5fe8e53`).
- A entrada da próxima release precisa listar: rota por modelo, batch por
  modelo, condições declaradas, aposentados, custo real dos brutos do estudo
  de agosto (grok e gemini direto) com a contagem corrigida.
- Fora desta decisão: ativar Qwen na Alibaba, rever o veto ao DeepSeek,
  concorrência por provedor.

Decisão do time em 16/set/2026, a partir dos smokes de rota direta e de
batch do mesmo dia.
