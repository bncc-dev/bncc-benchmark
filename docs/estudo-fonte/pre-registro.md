# Pré-registro · Estudo de intervenção "acesso à fonte"

**Status: APROVADO e fechado em 24/ago/2026 (Marcos Beto).** Este documento é
fechado e datado **antes** de qualquer chamada da bateria (Fase 3 do plano);
depois disso não muda. Alterações posteriores viram emenda datada ao final.
Base: `DECISOES.md` D14 e D14.1; `METODOLOGIA.md` (Condições de execução).

## Pergunta

Quanto a alucinação de códigos e textos da BNCC diminui quando o modelo tem
acesso ao dado estruturado do bncc.dev — e quanto desse ganho depende do
mecanismo de acesso (dado no prompt × ferramenta MCP)?

## Declaração de conflito de interesse

A fonte de grounding (`mcp.bncc.dev` e a listagem injetada) e o gabarito do
benchmark são o **mesmo dataset**, mantido pelo mesmo time. Um modelo que
consulta a fonte e copia acerta por construção; por isso o objeto do estudo é
o *efeito da intervenção*, não um ranking de modelos, e a condição de controle
*contexto* existe para separar o mérito do dado do mérito do instrumento.

## Desenho

- **Unidade experimental**: item × paráfrase (300 itens do `itens-v1`,
  1 paráfrase; os 3 estratos de falsos e os especiais incluídos).
- **Condições, pareadas no mesmo item e paráfrase**:
  1. *seca* — sem fonte (protocolo do leaderboard);
  2. *contexto* — listagem oficial do escopo do item no prompt, sem tool
     (`harness/lib/contexto.ts`, `listagem-escopo-v1`);
  3. *MCP* — loop de tool-use no cliente contra `mcp.bncc.dev` (`mcp-loop`);
  4. *connector nativo* — condição secundária, 4 modelos (um por empresa que
     oferece), loop no servidor da empresa (`mcp`).
- **Elenco A (condições 1–3)**: 8 modelos, um por critério — ≥1 por terço de
  desempenho na seca (v0.2.0), ≥1 raciocinador, ≥1 rota Bedrock e ≥1 direta,
  os dois brasileiros. Proposto: gpt-sol, deepseek-flash, sabia-4, kimi-k3,
  gemini-3.7-flash, grok-4.6, sabiazinho-4, sonnet-bedrock. Qwen fora (sem
  acesso à API; D14.1).
- **Elenco B (condição 4)**: gpt-sol, grok-4.6, gemini-3.7-flash, sonnet-5.
  Três deles também em A, para a comparação pareada A×B.
- **Rotas**: APIs diretas (D14.1). Divergências de condição impostas pela
  rota são declaradas por modelo: sem `temperature` (gpt-5.6 na Responses
  API; Claude 5), `temperature: 1` (Kimi K3), sem raciocínio (gpt-5.6 em
  Chat Completions, condição 3).
- **Janela**: todas as condições no mesmo intervalo de dias; ordem por modelo
  seca → contexto → MCP; cache novo; versão dos dados do MCP no manifesto.

## Hipóteses (fixadas antes da bateria)

- **H1** — Para todo modelo, as taxas de T1 (invenção de código) e T4 (falso
  aceito) são menores nas condições 2 e 3 do que na 1.
- **H2** — MCP ≈ contexto: a diferença entre as condições 3 e 2, por modelo,
  é explicada pelo custo do tool-use (`nao_chamou` > 0, erros de chamada);
  quando `nao_chamou` = 0, as taxas não diferem além do IC.
- **H3** — Com fonte, *alucinação residual* (tarefa C) < 5% dos códigos
  citados e *rejeição negativa* (tarefa B, falsos) < 5%, por modelo.
- **H4 (secundária)** — Connector nativo (4) não difere de MCP (3) nos três
  modelos em comum além do IC; diferenças, se houver, aparecem em
  `nao_chamou` e em custo/latência, não em acerto.

## Desfechos

**Primário**: delta seca→fonte, por modelo e condição, na taxa de alucinação
por tarefa (A: `inventado`+`texto_de_outra`; B falsos: `incorreto`; C:
códigos inexistentes / códigos citados; D: `incorreto`).

**Secundários** (bloco `fonte` dos agregados): `nao_chamou`,
`chamou_e_errou`, `rejeicao_negativa` / `b_falsos_total`,
`alucinacao_residual` / `c_codigos_citados`; custo (US$) e tokens por
resposta; latência (a registrar).

Respostas com `finish_reason ≠ fim` são `resposta_invalida` e ficam fora das
taxas (contadas e reportadas).

## Análise

- Por modelo e desfecho: diferença pareada de proporções entre condições,
  IC 95% por **bootstrap por cluster de item** (300 clusters, 1.000
  reamostras, semente fixa registrada); McNemar exato como complemento.
- Sem correção para múltiplas comparações e **sem caça a p-valor**: o
  relatório apresenta ICs, não asteriscos. Um painel agregado do elenco
  (média dos deltas com IC) complementa, não substitui, os resultados por
  modelo.
- Limites superiores com 0 eventos pela regra do três (3/n), por estrato.
- Comparação A×B pareada nos 3 modelos em comum (mesmo item, mesma paráfrase).

## Regra sequencial (fixada)

Modelo com ≥ 1 evento de `nao_chamou`, `rejeicao_negativa`,
`alucinacao_residual` ou `chamou_e_errou` na bateria → repetir **só ele** com
3 paráfrases nas condições afetadas, para estimar a taxa. Modelos sem evento
não são expandidos; o dinheiro não gasto é registrado.

## Exclusões e limitações declaradas a priori

- Modelo que não completar as três condições fica fora e é nomeado (D13.3).
- Elenco sem Alibaba (Qwen): lacuna de cobertura declarada.
- A condição *contexto* injeta até ~13k tokens (LP do EF); modelos com
  janela curta ou custo proibitivo nessa condição são declarados.
- "Temperatura 0" não é possível em parte do elenco (ver Rotas).

## Aprovação

- [x] Elenco A e B confirmados
- [x] Hipóteses e desfechos aprovados
- [x] Data de fechamento: 24/ago/2026 · Aprovado por: Marcos Beto (sessão de trabalho, antes de qualquer chamada do piloto e da bateria)

## Emendas

- **24/ago/2026 (antes da bateria; operacional, não altera hipóteses nem
  desfechos)**: onde o Desenho diz "cache novo", leia-se: a bateria
  reaproveita do cache as respostas do piloto (`piloto-fonte-2026-08`, 30
  itens × condição × modelo) desde que comece em até ~1 semana do piloto —
  mesma janela temporal. A contagem `do_cache` por modelo fica no manifesto e
  o relatório declara quantas respostas vieram do piloto. Modelos cuja
  configuração mudar após o piloto (ex.: teto de tokens) têm chave de cache
  nova e são refeitos integralmente. Se o prazo passar, o cache é arquivado e
  a bateria roda com cache vazio (D12).
- **25/ago/2026 (durante a bateria; operacional, não altera hipóteses nem
  desfechos)**: o Gemini 3.7 Flash pela rota direta do Google ficou
  indisponível ("high demand", HTTP 500/503, 12–75 s por chamada) das 23h de
  24/ago até pelo menos as 15h de 25/ago; em 4h30 de retomadas a seca avançou
  4 chamadas. Decisão do mantenedor: as condições seca, contexto e MCP do
  Gemini rodam **via OpenRouter com pin no Google** (id `gemini-37-flash`,
  mesma rota da rodada oficial de agosto; a seca foi refeita em 25/ago, na
  mesma janela das outras condições, porque a chave de cache de agosto não
  bateu), como exceção declarada à D14.1. As respostas parciais da rota
  direta (seca 221, contexto 280, MCP 263) ficam no cache e não entram no
  relatório. A condição **connector nativo** do Gemini (91/300) fica
  **incompleta e declarada**; retomada adiada para quando o Google normalizar.
- **25/ago/2026 (após a bateria; condição NOVA, não substitui a anterior)**:
  o relatório do benchmark levou à correção do `bncc_buscar` no servidor
  (`mcp.bncc.dev`: filtro `componente: "CO"` e busca por palavras em qualquer
  ordem, sem pontuação), publicada com a mesma versão de dados
  (`dados-2026.07.1`). Para que a chave de cache enxergue mudanças de
  ferramenta, o harness passou a incluir nela um hash de `tools/list`
  (`c19cf2eecbaa` após a correção) e a gravá-lo no manifesto. Os dois modelos
  afetados (sabia-4, sabiazinho-4) são re-medidos na condição MCP em rodada
  própria, `estudo-fonte-2026-08-buscar-v2` (3 paráfrases; seca e contexto
  reaproveitados do cache), e o resultado é apresentado como **condição
  distinta ("MCP, busca corrigida")** ao lado da original, nunca em
  substituição a ela. Hipótese declarada antes de rodar: a taxa com MCP cai
  de 4–5% para perto de 1% nos dois; a rejeição negativa do sabia-4 cai
  abaixo de 5%.
- **25/ago/2026 (durante a re-medição `buscar-v2`; regra de validade, não de
  hipótese)**: descobriu-se que o servidor MCP devolveu erro em rajadas
  durante as chamadas dos modelos Maritaca (ex.: 49 "não" do sabiazinho-4 em
  2 minutos, todos após falha da ferramenta). O harness passa a gravar
  `tools_erros` por resposta (só falhas de TRANSPORTE: HTTP, rede, timeout;
  respostas `isError` da tool, como "código não existe", e erros de argumentos
  do modelo não contam, porque voltam ao modelo como texto), e **resposta com
  `tools_erros > 0` é `resposta_invalida`** (artefato de execução, fora das
  taxas), pela mesma lógica já pré-registrada para truncamento. Respostas anteriores a esta
  regra não têm o campo e ficam como estão (limitação declarada); a condição
  `buscar-v2` dos Sabiá é refeita com o campo, com concorrência 2.
- **25/ago/2026 (noite; operacional)**: os `tools_erros` de transporte da
  re-medição eram HTTP 429 do `mcp.bncc.dev` (limite de 60 req/min por IP no
  worker), atingido apenas pelos modelos Maritaca (rápidos, sem raciocínio).
  O cliente MCP do harness passou a paciar 55 chamadas/min por processo e a
  fazer retry com backoff em 429/5xx/rede. A condição `buscar-v2` dos Sabiá
  é refeita (4ª passagem) com esse cliente; as passagens anteriores ficam
  em `cache-expurgado-buscar-v2/`, fora do repositório.
