# Releases de resultados

Cada release é um conjunto imutável de resultados, identificado por git tag
`vX.Y.Z` (semântica em DECISOES.md D11: PATCH = re-julgamento dos mesmos
brutos; MINOR = medições novas na mesma metodologia; MAJOR = quebra de
comparabilidade). O projeto está em **0.x**: a metodologia ainda pode mudar, e
abrir o repositório não promoveu a versão. O 1.0.0 vem quando o protocolo
estabilizar.

Processo de release: bateria executada e avaliada → resultados commitados e
CI verde (check de consistência) → entrada preenchida aqui → `git tag vX.Y.Z`
+ push da tag → **Release do GitHub criada a partir da tag** (`gh release
create vX.Y.Z --verify-tag`), com as notas resumindo esta entrada. A tag e a
Release são objetos distintos: sem a segunda, a página do repositório segue
anunciando a release anterior como a mais recente, que é o primeiro lugar
onde a maioria das pessoas olha. Alterou qualquer julgamento depois? Número
novo, nunca sobrescrever.

## v0.3.0 · 19/set/2026 · rotas diretas, execução em lote, série recomeça

Terceira medição de referência: 17.100 respostas, 19 modelos. Bateria
executada em 16-18/set/2026. Primeira rodada pelas APIs diretas das empresas
e primeira com execução em lote (Batch API), conforme a D15.

- **Rodada**: `oficial-seca-2026-09`, modo seco. **17.100 respostas, 19
  modelos, todos com a bateria completa** (900 chamadas cada: 300 itens × 3
  paráfrases). Nenhum modelo ficou parcial, então a D13.3 não foi acionada.
- **A série recomeça nesta versão.** Rota, transporte e elenco mudaram
  juntos; **as notas não são comparáveis com a v0.2.0** e nenhuma leitura de
  "subiu" ou "caiu" entre as duas releases é válida. O benchmark é uma
  sequência de fotografias datadas (D13.1), e esta é a primeira da série
  nova. Em 0.x a metodologia ainda pode mudar (D11).
- **Julgamento**: **avaliador v3 · rubrica-v3** · juiz haiku-bedrock (9.113
  julgamentos na trilha, `juiz.jsonl`). A rubrica mudou nesta release, ver o
  bullet da abstenção e da negação. Dataset dados-2026.07, banco `itens-v1`.
- **Líder**: gpt-6-astra (nota 94,7), com 88% de fidelidade ao texto oficial e
  nenhuma alucinação na tarefa A: quando não sabe, recusa (11%). **Lanterna**:
  haiku-bedrock (28,2), que recusa 37% das perguntas de texto e confirma só
  11% dos códigos reais. Agregados verificados por CI.
- **Rotas (D15)**: 12 modelos pela API direta da empresa (OpenAI, Anthropic,
  Google, xAI, Moonshot, Meta, Maritaca), 5 via OpenRouter e 2 via Bedrock.
  As exceções são declaradas: os três Qwen porque a conta da Alibaba responde
  `AccessDenied.Unpurchased` na região em que a chave vale; os dois DeepSeek
  porque a primeira parte segue vetada pela política de privacidade da conta,
  e a Fireworks é a rota efetiva; sonnet-4.6 e haiku-4.5 seguem no Bedrock por
  continuidade do juiz. O endpoint que serviu cada chamada está em `rotas`.
- **Execução em lote em 7 modelos** (gpt-6-astra, gpt-luna, fable-5-1, opus-5,
  sonnet-5, gemini-pro, gemini-38-flash): mesma requisição do caminho
  síncrono, submetida à Batch API da empresa por metade do preço, com a mesma
  identidade de chamada e a mesma chave de cache. O leaderboard distingue o
  transporte em `rotas`, com o sufixo `(batch)`; os brutos trazem `execucao`
  e `lote_id`, e o estado de cada lote está em `lotes-<modelo>-seco.json`.
  Tempo entre submissão e coleta (teto, porque a coleta depende de reexecutar
  o comando): cerca de 10 minutos para gpt-6-astra, fable-5-1 e o primeiro
  lote do gemini-38-flash; cerca de 50 minutos para sonnet-5 e gemini-pro; 2
  horas para gpt-luna; **cerca de 12 horas por lote no opus-5**, que precisou
  de dois. Respostas cortadas geram um segundo lote com o dobro do orçamento,
  como no síncrono (gpt-luna 131, opus-5 31, gemini-pro 13, gemini-38-flash
  9). O Google recusou 100 pedidos do gemini-38-flash com "Precondition check
  failed", reenviados num lote próprio.
- **Recusar e negar deixaram de ser contados como invenção (rubrica-v3).** Até
  a v0.2.0, na tarefa A, um modelo que não atribuía texto nenhum mas
  acrescentava contexto (a área, o ano, onde consultar) caía no juiz, e a
  rubrica só oferecia sim, parcial e não: o veredito virava `inventado`. A
  revisão de fechamento desta release leu amostras e separou três
  comportamentos que estavam misturados. A rubrica agora decide em ordem: o
  modelo **atribuiu um texto** (mesmo com ressalva)? Julga-se o conteúdo. Não
  atribuiu e **negou** que o código exista? É `negacao`. Não atribuiu e só
  declarou não saber? É `abstencao`. Uma guarda programática
  (`extrairTextoCandidato`) impede que texto atribuído com ressalva, ou
  depois de negar o código, escape como recusa: o trecho é julgado sozinho por
  fidelidade. Nesta rodada, das 5.016 respostas da tarefa A, **476 são
  abstenções e 207 são negações** que a rubrica antiga contaria como
  alucinação. Das 207 negações, **195 são de Computação 2022**: o modelo
  afirma que "CO" não é componente da BNCC, porque não conhece o complemento
  de 2022. A nota composta quase não muda (só a fidelidade entra nela), mas a
  taxa de alucinação muda muito nos modelos que recusam: sonnet-5 de 0,86 para
  0,42, haiku-bedrock de 0,76 para 0,36, kimi-k3 de 0,73 para 0,38, opus-5 de
  0,22 para 0,04, gpt-6-astra de 0,11 para 0,00. As quatro taxas da tarefa A
  (`a_fiel`, `a_aluc`, `a_negacao`, `a_abstencao`) saem lado a lado no
  leaderboard. Dois exemplos que iriam para o site rotulados como invenção
  eram recusas honestas e saíram. Limitação declarada: a fronteira entre
  negar e contextualizar ("não está na BNCC de 2017, é do complemento de
  2022") é decisão do juiz, e cerca de 36 negações reconhecem o complemento.
  O manifesto registra as três passagens do juiz (rubricas v1, v2
  intermediária e v3).
  **Errata das releases anteriores**: v0.1.0, v0.2.0 e estudo-fonte-v0.1.0
  foram julgadas com a rubrica v1 e têm a taxa de alucinação da tarefa A
  inflada pelo mesmo motivo. Releases são imutáveis (D11) e não serão
  reescritas; a ressalva fica registrada aqui.
- **Elenco (19)**: sete entrantes — gpt-6-astra (sucede gpt-5.6-sol),
  fable-5-1 (sucede fable-5), gemini-38-flash (sucede gemini-37-flash),
  muse-spark-13 (sucede muse-spark-1.2), deepseek-flash-41 (o v4-flash-0731
  foi aposentado pela DeepSeek em 10/set), qwen-38-flash (sucede qwen-flash) e
  qwen-38-max-0902 (ver ids abaixo). Saíram do leaderboard os sete ids
  correspondentes; eles continuam no registro e seguem citáveis nas releases
  em que foram medidos.
- **Ids de modelo (D13.1)**: `qwen-38-max` designa o modelo medido em agosto
  pelo alias `qwen3.8-max`. Em 05/set a Alibaba trocou o snapshot por baixo
  desse alias, então a medição nova entra como `qwen-38-max-0902`, id próprio,
  e o id antigo fica congelado na v0.2.0 (D12 regra 3). Ids não são
  reapontados. Modelo que apenas mudou de rota mantém o id, porque o id
  designa o modelo e a rota fica registrada por chamada (D9 + D15 regra 2).
- **Condições de execução declaradas (D13.2)**: Claude 5 (fable-5-1, opus-5,
  sonnet-5) e os gpt-5.x/6 rejeitam `temperature` e rodaram sem o parâmetro;
  kimi-k3 só aceita temperatura 1 na API direta; qwen-38-flash subiu de 4.096
  para 32.768 tokens de orçamento porque truncava com resposta vazia;
  qwen-38-max-0902 recebeu timeout de 15 minutos por requisição, já que uma
  resposta chegou a 11 minutos. Comparar esses modelos com outras releases
  exige a ressalva.
- **Contagem de tokens de raciocínio corrigida**: cada API informa o
  raciocínio de um jeito e o agregador normalizava. Pela rota direta, a xAI
  reporta `reasoning_tokens` fora de `completion_tokens`, o endpoint
  compatível do Gemini não reporta em campo nenhum, e a Anthropic traz o
  pensamento num subcampo. Sem a correção o custo saía até 17 vezes menor.
  **Errata**: os brutos do estudo de intervenção de agosto, para
  `grok-46-direto` e `gemini-*-direto`, têm custo subestimado pelo mesmo
  motivo. Só o custo; os vereditos não mudam.
- **Respostas cortadas**: 152 de 17.100 (0,9%), expostas no campo `cortados`.
  Truncamento após a escalada automática em 122 casos, concentrados em
  deepseek-flash-41 (29), qwen-38-max-0902 (29), gpt-luna (27) e
  muse-spark-13 (22), todos abaixo de 3,3%. **Causa nova nesta rodada**: 28
  bloqueios por `RECITATION` no Google (gemini-pro 16, gemini-38-flash 12),
  em que o modelo se recusa a reproduzir texto que reconhece como citação
  literal, sempre na tarefa C. Mais 2 casos de `finish_reason: error` no
  DeepSeek via Fireworks, com resposta vazia.
- **Ressalva do grok-46**: ele é o único modelo comparável que caiu de forma
  relevante contra agosto (54,5 → 47,9), e a queda está inteira nas três
  dimensões de memória do texto oficial (fidelidade na A, acerto na D e texto
  correto na C); reconhecer códigos reais e recusar falsos não mudou. Mudaram
  ao mesmo tempo a rota (OpenRouter → xAI direta), a data e o comportamento
  do modelo, que gerou 47% mais tokens de raciocínio. Os dados não permitem
  separar as causas, e nenhuma nova medição foi feita. Para contraste, o
  gpt-luna trocou de rota e transporte no mesmo período e subiu 2,7 pontos.
  Régua da variação entre rodadas, nos mesmos 300 itens e projetando os
  vereditos novos na escala da rubrica v1: quem **não** trocou de rota
  concorda com agosto em 86% a 98% dos vereditos (sabiazinho-4 e
  haiku-bedrock nos extremos); quem trocou, em 79% a 90%.
- **Custo do resultado publicado**: US$ 175,18 de execução. Os quatro mais
  caros somam US$ 118: qwen-38-max-0902 (47,03), kimi-k3 (35,43), fable-5-1
  (21,18) e grok-46 (14,84). Os mais baratos: sabiazinho-4 (0,11), gpt-luna
  (0,23) e sabia-4 (0,33). O lote cortou o custo pela metade onde foi usado.
  O juiz custa cerca de US$ 5 por passagem completa; o manifesto registra
  US$ 9,48 somando as passagens das três rubricas. Custo publicado é o dos
  brutos que compõem a release, não o da conta: a fatura real foi maior por
  causa das retomadas e de chamadas que falharam depois de gerar tokens.
- **Achados operacionais**: crédito do OpenRouter esgotado duas vezes durante
  a bateria, porque o agregador reserva o teto de tokens por chamada e os
  Qwen pedem 32.768; conta da Moonshot suspensa por saldo no meio do kimi-k3;
  429 persistentes da Fireworks, que cederam com retomadas sucessivas, como
  em agosto; 404 intermitente do Bedrock no juiz, que aborta a avaliação
  inteira por não ser tratado como transitório; e 429 da Google na submissão
  de lotes de escalada.
- **Comparabilidade**: mesmo `itens-v1` e mesmo dataset dados-2026.07 das
  releases anteriores, mas **rubrica e rota mudaram**, então a série recomeça
  aqui. Cache novo (D12): o de agosto foi arquivado em `cache-2026-08/`.
- **Rodada grounded**: segue publicada à parte, como estudo de intervenção
  (D14). Ela não roda em lote, porque Batch API não aceita ferramentas.

## estudo-fonte-v0.1.0 · 25/ago/2026 · estudo de intervenção "acesso à fonte" (série própria)

A rodada grounded prometida na v0.1.0 e na v0.2.0 foi realizada e publicada
**como estudo de intervenção, em série própria** (DECISOES.md D14): mede o
efeito do acesso ao dado do bncc.dev, não classifica modelos. O leaderboard
não muda; esta série tem numeração independente da série `vX.Y.Z`.

- **Rodadas**: `estudo-fonte-2026-08` (bateria, 24–25/ago) e
  `estudo-fonte-2026-08-buscar-v2` (re-medição dos dois Sabiá após correção
  do `bncc_buscar` no servidor MCP; condição distinta, apresentada ao lado da
  original). Piloto `piloto-fonte-2026-08` publicado para auditoria da
  sequência pré-registro → piloto → bateria.
- **Desenho**: 300 itens do `itens-v1`, 1 paráfrase; 8 modelos (um por
  critério fixado antes da bateria); três condições pareadas (seca, contexto,
  MCP) + connector nativo em 3 modelos; pré-registro fechado antes da
  primeira chamada, com cinco emendas datadas (`docs/estudo-fonte/pre-registro.md`).
- **Resultado**: seca 31,9% de alucinação (elenco A agregado) → contexto 0,2%
  → MCP 2,3%; queda média de 30,6 pp por modelo, IC 95% por bootstrap por
  item, em todos os 8 modelos; zero "não chamou a ferramenta" em 2.400
  respostas; zero código inventado em listas. Erros residuais concentrados
  nos dois Sabiá, no lookup inverso; após a correção do `bncc_buscar`:
  Sabiá-4 4,0% → 1,0%, Sabiazinho-4 5,3% → 3,5%, falsos aceitos 0/180.
- **Achados devolvidos ao produto**: dois defeitos do `bncc_buscar` (filtro
  de Computação; busca literal) corrigidos em `@bncc/mcp` 0.3.0 / worker
  0.2.2; rate limit de 60 req/min por IP documentado.
- **Ressalvas** (por modelo, no relatório): rotas diretas (D14.1); gpt-5.6
  sem raciocínio na condição A; Claude 5 e gpt-5.6 sem `temperature`; Kimi K3
  a temperatura 1; Gemini via OpenRouter por indisponibilidade do Google;
  connector do Gemini incompleto (91/300, retomada em PATCH); seca de três
  modelos reaproveitada do cache de 15–18/ago; três passagens da re-medição
  descartadas por defeitos do próprio cliente de medição (registradas).
- **Julgamento**: avaliador v2 · rubrica-v1 · juiz haiku-bedrock, os mesmos
  do leaderboard. Dataset dados-2026.07 (MCP em dados-2026.07.1).
- **Custo**: US$ 61,9 de execução (bateria 59,9 + re-medição 2,0) + ~US$ 0,5
  de juiz; passagens descartadas ≈ US$ 3 adicionais, fora do publicado.
- **Artefatos**: brutos, julgados, agregados, manifestos e `estudo.json` em
  `resultados/estudo-fonte-*/`; relatório `estudo.html` anexado à Release.
  Página no bncc.dev prevista; até lá, a Release é o ponto de leitura.
- **Conflito de interesse declarado**: fonte de grounding e gabarito são o
  mesmo dataset, mantido pelo mesmo time.

## v0.2.0 · 18/ago/2026 · elenco renovado, 19 modelos

Segunda medição de referência: 17.100 respostas, 19 modelos. Bateria executada
em 15-18/ago/2026.

- **Rodada**: `oficial-seca-2026-08`, modo seco. **17.100 respostas, 19
  modelos, todos com a bateria completa** (900 chamadas cada: 300 itens × 3
  paráfrases). Nenhum modelo ficou parcial, então a D13.3 não foi acionada.
- **Julgamento**: avaliador v2 · rubrica-v1 · juiz haiku-bedrock (9.460
  julgamentos na trilha, `juiz.jsonl`) — mesmo juiz e rubrica da v0.1.0.
- **Líder**: gpt-sol (nota 86,4; era 89,2 em julho). **Lanterna**: qwen-flash
  (27,3), entrante desta rodada. Agregados verificados por CI.
- **Custo do resultado publicado**: US$ 189,47 (contra ~US$ 107 em julho). O
  aumento vem dos modelos que raciocinam antes de responder, que geram muito
  mais tokens de saída: opus-5 custou US$ 28,13 para 900 chamadas contra
  US$ 6,49 estimados a partir dos tokens do opus-4.8. Mais caros: kimi-k3
  (35,65), qwen-38-max (33,40), fable-5 (32,00), opus-5 (28,13). Mais baratos:
  sabiazinho-4 (0,12), qwen-flash (0,17), gpt-luna (0,23).
  **O desembolso total foi maior (~US$ 218)**: inclui as medições dos dois Qwen
  que foram descartadas e refeitas (ver abaixo). Custo publicado é o dos brutos
  que compõem a release, não o da conta.
- **Elenco (19)**: as 17 vagas da v0.1.0 — 7 com modelo atualizado
  (opus-4.8→opus-5, grok-4.5→4.6, gemini-3.5-flash→3.7-flash, kimi-k2.6→k3,
  qwen3.7-max→3.8-max, deepseek-pro/flash fixados nos snapshots -0813/-0731) —
  mais 2 entrantes: muse-spark-1.2 (Meta) e qwen3.7-flash (Alibaba).
- **Ids de modelo renomeados (D13.1)**: `kimi`→`kimi-k3`, `grok`→`grok-46`,
  `gemini-flash`→`gemini-37-flash`, `qwen-max`→`qwen-38-max`. Os ids antigos
  continuam válidos na v0.1.0, onde designam os modelos daquela rodada; o
  `APRESENTACAO` do exportador guarda os dois conjuntos. Um id nunca é
  reapontado para outro modelo.
- **Mudanças de condição de execução (D13.2)**: `deepseek-flash` passou de
  `max_tokens` 1024 (julho, herdado da flag) para 4096, porque o snapshot
  `-0731` raciocina antes de responder e truncava com resposta vazia em 1024;
  `qwen-flash` entrou já com 4096 pelo mesmo motivo. **Comparar o
  deepseek-flash entre v0.1.0 e v0.2.0 exige essa ressalva** — o modelo mudou
  de snapshot e de orçamento de tokens ao mesmo tempo.
- **Truncamento invalidou e refez dois modelos.** Na primeira passada,
  `qwen-plus` devolveu 427 de 900 respostas VAZIAS (47%) e `qwen-38-max`, 303
  (34%): o teto de `max_tokens` não comportava o raciocínio, e como a resposta
  vem depois dele, truncar perdia tudo. Os dois foram refeitos com teto 32768
  (zero truncadas) e só a medição refeita entra nesta release.
  **O efeito no resultado é contraintuitivo e vale registrar**: as notas
  CAÍRAM depois da correção (qwen-38-max 52,1→43,0; qwen-plus 36,4→32,2),
  porque uma resposta vazia nunca aceita um código inventado — o truncamento
  funcionava como abstenção forçada e inflava a dimensão anti-alucinação. Nos
  códigos falsos "limpos", o qwen-plus passou de 18% de aceitação aparente
  para 35% reais. Números truncados são otimistas, não pessimistas.
- **Truncamento residual**: gpt-luna 18 respostas vazias (2,0%), deepseek-flash
  12 (1,3%), deepseek-pro 5, opus-5 2, qwen-flash 2, sabiazinho-4 3 truncadas
  sem perda de resposta. Todos abaixo de 3% e expostos no campo `cortados` do
  leaderboard. Declarados como limitação, não invalidam a medição.
- **fable-5 rodou por duas rotas (D9)**: 898 chamadas via Amazon Bedrock e 2
  via Google, porque a entrada não tinha provedor pinado. As 2 são
  irreproduzíveis pela rota majoritária: em 18/ago/2026 o Amazon Bedrock passou
  a responder 404 ("Claude Fable 5 is not available") para a conta. Mantidas e
  declaradas, por serem 0,2% das chamadas; o registro passou a pinar
  `Anthropic`, rota que respondia naquela data.
- **Leaderboard passa a expor as rotas.** Campo `rotas` por modelo, com o
  endpoint que serviu cada chamada e a contagem — a D9 exige que o leaderboard
  identifique o provedor, e até aqui o artefato exportado não carregava essa
  informação. Vale para os 19 modelos, não só para o caso do fable-5.
- **Rotas com rate limit persistente**: Fireworks (DeepSeek), Maritaca e
  Alibaba devolveram 429 ao longo da bateria, exigindo retomadas sucessivas.
  Achado operacional: janelas curtas se recuperam com tentativas frequentes
  (20-45s), não com esperas longas — uma chamada do deepseek-pro resistiu a
  horas de tentativas espaçadas de 15 min e passou em 2 min de tentativas
  seguidas. Registrado para baterias futuras; ver também a issue sobre
  concorrência por provedor.
- **kimi-k2.5: promessa da v0.1.0 REVOGADA.** A v0.1.0 registrou "medição
  adiada, entra em release MINOR futura". Não será medido: entre as duas
  releases a Moonshot lançou o K2.6 e depois o K3 (16/jul/2026), deixando o
  K2.5 duas gerações defasado — medi-lo não responderia mais nenhuma pergunta
  comparativa do benchmark. Registrado aqui para que a promessa conste como
  resolvida, não esquecida.
- **Comparabilidade**: mesmo `itens-v1`, mesma rubrica-v1, mesmo juiz
  (haiku-bedrock), mesmo dataset dados-2026.07 → MINOR conforme D11. Rodada
  executada com cache novo (chamadas frescas para todo o elenco, inclusive
  modelos inalterados — aliases de API podem mudar por baixo sem aviso).
- **Rodada grounded**: segue prometida para release MINOR futura (promessa da
  v0.1.0 mantida, não é desta release).
- **Errata da v0.1.0 (preço do gpt-luna)**: o `precos` do gpt-luna no registro
  estava em 1/6 por MTok, dez vezes o cobrado pela OpenAI via OpenRouter
  (0.1/0.6). Como o `custo_usd` dos brutos é calculado a partir dessa tabela,
  o custo publicado do gpt-luna na v0.1.0 (~US$ 2,29) está inflado ~10×; o
  real é ~US$ 0,23, e o total da rodada cai de ~US$ 109 para ~US$ 107.
  **Nenhuma nota, resposta ou julgamento é afetado** — o campo é informativo e
  não entra na avaliação. A v0.1.0 é imutável (D11) e não será reescrita: a
  correção vale da v0.2.0 em diante e fica registrada aqui.

## v0.1.0 · 16/jul/2026 · primeira release pública

Primeira medição de referência do benchmark: 15.300 respostas, 17 modelos.
Medida em julho de 2026, quando o repositório ainda era privado, e publicada
sem alteração na abertura de 27/jul/2026 — os resultados são exatamente os
que o CI recalcula a cada push.

- **Rodada**: `oficial-seca-2026-07`, modo seco (a rodada grounded entra numa
  release MINOR futura). Execução 15-16/jul/2026, trilha completa nos
  manifestos (múltiplas invocações com retomada por cache; 4 correções de
  resiliência aplicadas durante a rodada, registradas nos commits).
- **Elenco (17)**: gpt-sol, gpt-luna (OpenAI) · fable-5, opus-4.8, sonnet-5
  (Anthropic/OpenRouter) · sonnet-4.6, haiku-4.5 (Anthropic/Bedrock) ·
  gemini-3.1-pro, gemini-3.5-flash (Google) · grok-4.5 (xAI) · kimi-k2.6
  (Moonshot) · qwen3.7-max, qwen3.7-plus (Alibaba) · deepseek-v4-pro,
  deepseek-v4-flash (DeepSeek via Fireworks) · sabia-4, sabiazinho-4
  (Maritaca). **kimi-k2.5: medição adiada** (decisão de 16/jul, entra em
  release MINOR futura).
- **Banco de itens**: `itens-v1` (300 itens; anti-vexame D10 adjudicado e
  assinado em 15/jul/2026).
- **Julgamento**: avaliador v2 · rubrica-v1 · juiz haiku-bedrock (trilha
  completa em juiz.jsonl).
- **Dataset**: dados-2026.07 (1.721 aprendizagens).
- **Rotas**: Bedrock + OpenRouter (pins de primeira parte, fallback
  desligado; DeepSeek servido por Fireworks por política de privacidade da
  conta) + Maritaca direta (exceção documentada).
- **Custo**: ~US$ 109 de execução + ~US$ 6 de juiz.
- **Líder**: gpt-sol (nota composta 89,2); lanterna: sabiazinho-4 (27,3).
  Agregados verificados por CI (julgados×agregados).
