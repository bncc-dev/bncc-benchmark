# Metodologia · benchmark de alucinação sobre a BNCC

**Status: RASCUNHO.** Este documento congela junto com a publicação dos
primeiros resultados oficiais. Até lá, cada seção reflete o protocolo
implementado no harness, e mudanças relevantes passam por `DECISOES.md`.

## Tese

Para medir alucinação sobre a BNCC é preciso do gabarito completo e verificado.
O gabarito é o dataset do bncc.dev: 1.721 aprendizagens (1.580 da BNCC 2018 +
141 do complemento de Computação, Parecer CNE/CEB 2/2022), cada uma com fonte
oficial rastreável. Em particular, as bordas exatas de cada sequência numerada
(onde termina cada série de códigos), conhecidas apenas por quem tem o dado
completo e verificado, permitem construir códigos falsos-mas-plausíveis com
segurança.

## Taxonomia

- **T1 · invenção de código**: o modelo cita um código que não existe.
- **T2 · texto errado para código real**: o código existe, o texto atribuído não é o dele.
- **T3 · metadado errado**: componente, ano ou etapa errados para código real.
- **T4 · falha de discriminação**: o modelo afirma que um código falso existe.

## Nota sobre decodificabilidade (leia antes de criticar)

Os códigos da BNCC são parcialmente decodificáveis: EF67LP08 revela etapa
(Ensino Fundamental), anos (6º e 7º) e componente (Língua Portuguesa) pela
própria gramática. Um modelo pode "acertar" esses metadados sem saber nada da
BNCC. Por isso, este benchmark trata como evidência de conhecimento real apenas
o que a gramática não revela: o número de sequência (tarefas B e D) e o texto
da aprendizagem (tarefas A e C). Erros de metadado (T3) são reportados, mas
acertos de metadado não pontuam.

## Tarefas

- **A · lookup direto** (códigos reais): pedir o texto de um código. Julgamento
  em camadas: match normalizado exato, paráfrase fiel (via juiz), texto de
  outra habilidade, texto inventado, abstenção.
- **B · discriminação de existência** (reais + falsos em proporção igual):
  responder sim/não. Reportado como taxas de acerto em reais e de falso "sim"
  em falsos (sinal-detecção).
- **C · geração aberta**: pedidos realistas ("liste N habilidades de X do ano
  Y, com código e texto"). Cada código citado é verificado contra o gabarito
  (T1), e o texto associado contra o canônico (T2).
- **D · lookup inverso** (códigos reais): dado o texto canônico, pedir o código.

Códigos falsos da tarefa B em três estratos (ver DECISOES.md D8; a numeração
real é contígua, então as armadilhas são as bordas): extensão de borda (o
número seguinte ao último real de uma sequência, ex.: EF67LP39), profundo
(alguns números além da borda) e combinação gramaticalmente válida sem nenhum
código (ex.: EF01AR01, porque Arte no Fundamental numera por blocos de anos).

## Condições de execução

- Temperatura 0, sem system prompt (condição "usuário comum"); prompt exato registrado por chamada.
- 2 a 3 paráfrases por item; média e variância reportadas.
- Versão exata de cada modelo registrada, com data de medição.
- **Rodada seca** (sem grounding) e **rodada grounded** (mesmo modelo conectado
  ao bncc.dev via MCP em `https://mcp.bncc.dev/mcp`, ou tool-use na API REST
  onde MCP não for suportado; o mecanismo fica registrado por chamada).
- Abstenção honesta ("não tenho certeza") é categoria própria em todas as
  tarefas e é reportada positivamente: o benchmark premia calibração.

## Julgamento

- Tarefas B e D: verificação programática contra o gabarito.
- Tarefas A e C: pré-filtro por normalização de texto (casos triviais);
  casos não triviais vão a um juiz LLM com rubrica fechada ("mesmo conteúdo
  pedagógico? sim / não / parcial"), com prompt versionado neste repositório.
  O juiz é validado contra uma amostra julgada por humanos (Equipe Pedagógica
  Profy, revisora nomeada do dataset); a taxa de concordância é publicada.

## Reprodutibilidade

- Banco de itens gerado deterministicamente (seed registrada) a partir do
  dataset público; versão do dataset e checksums carimbados em cada artefato.
- Respostas brutas completas (prompt, resposta, timestamp, versão do modelo,
  custo) publicadas em JSONL.
- Harness completo neste repositório; qualquer pessoa reproduz a rodada com as
  próprias keys.
- Um conjunto held-out privado, gerado pelo mesmo processo com seed distinta,
  fica fora do repositório: em re-medições futuras ele separa aprendizado real
  de memorização do teste publicado. Dele divulgam-se **apenas resultados
  agregados**, nunca os itens ou o desempenho item a item — estes permitiriam
  a quem varresse seeds reconhecer um acerto e reconstruir o conjunto,
  anulando sua função (ver `DECISOES.md` D5).
- Consistência: o CI recalcula os agregados a partir dos brutos commitados e
  falha se divergirem.

## Limitações conhecidas

- Resultados variam com a formulação do prompt; as paráfrases medem essa
  variância, não a eliminam.
- O juiz LLM tem viés próprio; a validação humana amostral quantifica, não
  zera.
- A rodada grounded depende da capacidade de cada modelo de usar tools; um
  resultado grounded ruim pode refletir uso fraco de tools, não ausência do
  dado. O relatório separa "não chamou a tool" de "chamou e errou mesmo assim".
