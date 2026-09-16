/**
 * Registro dos modelos que o benchmark sabe chamar. Adicionar um modelo é
 * acrescentar uma entrada aqui — ver `docs/arquitetura.md`.
 *
 * Identificadores de modelo e preços DEVEM ser conferidos na data da rodada:
 * provedores renomeiam e repreçam sem aviso. O campo `precos` é informativo e
 * serve para estimativa; o custo real de cada rodada vem dos tokens
 * registrados nos brutos, não daqui.
 */

import type { DefModelo } from './tipos.js';

export const MODELOS: Record<string, DefModelo> = {
  // Bedrock (Converse API, bearer token AWS_BEARER_TOKEN_BEDROCK; região via
  // AWS_REGION, default us-east-1). Conferir os IDs de modelo na data da
  // rodada: a Bedrock versiona os identificadores.
  'sonnet-bedrock': {
    id: 'sonnet-bedrock',
    provedor: 'bedrock',
    modelo: 'us.anthropic.claude-sonnet-4-6',
    envKey: 'AWS_BEARER_TOKEN_BEDROCK',
    precos: { entrada: 3, saida: 15 },
    suportaGrounded: true, // loop de tool-use com o mini-cliente MCP
  },
  'haiku-bedrock': {
    id: 'haiku-bedrock',
    provedor: 'bedrock',
    modelo: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
    envKey: 'AWS_BEARER_TOKEN_BEDROCK',
    precos: { entrada: 1, saida: 5 },
    suportaGrounded: true,
  },
  'claude-sonnet': {
    id: 'claude-sonnet',
    provedor: 'anthropic',
    modelo: 'claude-sonnet-5',
    envKey: 'ANTHROPIC_API_KEY',
    semTemperatura: true, // Claude 4.6+ removeu o parâmetro (400 em 24/ago/2026)
    precos: { entrada: 3, saida: 15 },
    suportaGrounded: true,
  },
  'claude-haiku': {
    id: 'claude-haiku',
    provedor: 'anthropic',
    modelo: 'claude-haiku-4-5-20251001',
    envKey: 'ANTHROPIC_API_KEY',
    precos: { entrada: 1, saida: 5 },
    suportaGrounded: true,
  },
  // ---------------------------------------------------------------------
  // LEADERBOARD · rota direta de cada empresa onde funciona; OpenRouter ou
  // Bedrock só onde não (D15, 16/set/2026, substitui a política de 13/jul).
  // O id identifica o modelo (D13.1); a rota fica registrada por chamada no
  // versao_modelo e no campo `rotas` do leaderboard (D9). Condições impostas
  // pela rota (temperatura, raciocínio) ficam declaradas na própria entrada
  // (D13.2). `batch` marca quem pode rodar pela Batch API da empresa (50%).
  // Preços conferidos em 16/set/2026; conferir de novo na data da rodada.
  // ---------------------------------------------------------------------

  // OpenAI direta (chat/completions). Os gpt-5.x/6 com raciocínio rejeitam
  // `temperature` e exigem `max_completion_tokens`; via OpenRouter isso era
  // traduzido em silêncio (smoke de 16/set/2026).
  'gpt-6-astra': {
    id: 'gpt-6-astra',
    maxTokensPadrao: 8192, // raciocina antes de responder; conferir no smoke
    provedor: 'openai-compat',
    modelo: 'gpt-6-astra', // lançado em 03/set/2026, sucessor do gpt-5.6-sol; sem snapshot datado
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    parametroMaxTokens: 'max_completion_tokens',
    semTemperatura: true,
    precos: { entrada: 10, saida: 50 },
    batch: { api: 'openai' },
    suportaGrounded: false, // com tools o chat/completions exige raciocínio desligado; grounded só pelo estudo
  },
  'gpt-sol': {
    id: 'gpt-sol',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'gpt-5.6-sol', // sucedido pelo gpt-6-astra (03/set/2026); fora do elenco, mantido para reprodução
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    parametroMaxTokens: 'max_completion_tokens',
    semTemperatura: true,
    precos: { entrada: 4, saida: 20 }, // repreçado em 21/ago/2026 (era 5/30)
    batch: { api: 'openai' },
    suportaGrounded: false,
  },
  'gpt-luna': {
    id: 'gpt-luna',
    provedor: 'openai-compat',
    modelo: 'gpt-5.6-luna',
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    parametroMaxTokens: 'max_completion_tokens',
    semTemperatura: true,
    // Histórico: na v0.1.0 o custo saiu inflado ~10× (preço 1/6 no registro;
    // OpenRouter cobrava 0.1/0.6). Release imutável (D11), anotado na v0.2.0.
    precos: { entrada: 0.2, saida: 1.2 }, // preço de lista da API direta
    batch: { api: 'openai' },
    suportaGrounded: false,
  },

  // Anthropic direta (Messages API). Claude 5 rejeita `temperature` e pensa
  // por padrão (thinking_tokens dentro de output_tokens). O Bedrock da conta
  // segue 403 para Sonnet 5, Opus 5 e Fable; sonnet-4.6 e haiku-4.5 ficam no
  // Bedrock (entradas acima) por continuidade do juiz.
  'fable-5-1': {
    id: 'fable-5-1',
    maxTokensPadrao: 8192,
    provedor: 'anthropic',
    modelo: 'claude-fable-5-1', // lançado em 01/set/2026, sucessor do claude-fable-5
    envKey: 'ANTHROPIC_API_KEY',
    semTemperatura: true,
    precos: { entrada: 10, saida: 50 },
    batch: { api: 'anthropic' },
    suportaGrounded: true,
  },
  'fable-5': {
    id: 'fable-5',
    maxTokensPadrao: 8192,
    provedor: 'anthropic',
    modelo: 'claude-fable-5', // sucedido pelo fable-5-1; fora do elenco, mantido para reprodução
    envKey: 'ANTHROPIC_API_KEY',
    semTemperatura: true,
    precos: { entrada: 10, saida: 50 },
    batch: { api: 'anthropic' },
    suportaGrounded: true,
  },
  'opus-5': {
    id: 'opus-5',
    maxTokensPadrao: 4096,
    provedor: 'anthropic',
    modelo: 'claude-opus-5', // sucessor do opus-4.8 (aposentado em ago/2026)
    envKey: 'ANTHROPIC_API_KEY',
    semTemperatura: true,
    precos: { entrada: 5, saida: 25 },
    batch: { api: 'anthropic' },
    suportaGrounded: true,
  },
  'sonnet-5': {
    id: 'sonnet-5',
    maxTokensPadrao: 4096,
    provedor: 'anthropic',
    modelo: 'claude-sonnet-5',
    envKey: 'ANTHROPIC_API_KEY',
    semTemperatura: true,
    precos: { entrada: 2, saida: 10 }, // aumento previsto para 01/set/2026 não ocorreu
    batch: { api: 'anthropic' },
    suportaGrounded: true,
  },

  // Google direta, endpoint nativo (generateContent): informa os pensamentos
  // (thoughtsTokenCount) e é o formato que a Batch API exige. O endpoint
  // compatível com OpenAI (entradas `-direto` abaixo) não informa o raciocínio
  // e só serve ao loop de tools do estudo.
  'gemini-pro': {
    id: 'gemini-pro',
    maxTokensPadrao: 8192,
    provedor: 'google',
    modelo: 'gemini-3.1-pro-preview',
    envKey: 'GEMINI_API_KEY',
    precos: { entrada: 2, saida: 12 },
    batch: { api: 'google' },
    suportaGrounded: false, // google.ts não faz loop de tools; grounded só pelo estudo (gemini-pro-direto)
  },
  'gemini-38-flash': {
    id: 'gemini-38-flash',
    maxTokensPadrao: 8192,
    provedor: 'google',
    modelo: 'gemini-3.8-flash', // lançado em 02/set/2026, sucessor do 3.7-flash
    envKey: 'GEMINI_API_KEY',
    precos: { entrada: 0.75, saida: 3.75 }, // promocional até 31/dez/2026; depois 1.5/7.5
    batch: { api: 'google' },
    suportaGrounded: false,
  },
  'gemini-37-flash': {
    id: 'gemini-37-flash',
    maxTokensPadrao: 8192,
    provedor: 'google',
    modelo: 'gemini-3.7-flash', // sucedido pelo gemini-38-flash; fora do elenco, mantido para reprodução
    envKey: 'GEMINI_API_KEY',
    precos: { entrada: 0.75, saida: 3.75 }, // idem (via OpenRouter constava 0.375/1.875 em ago/2026)
    batch: { api: 'google' },
    suportaGrounded: false,
  },

  // xAI direta. Cobra o raciocínio como saída mas NÃO o inclui em
  // completion_tokens (sondagem de 16/set/2026); sem `contagemRaciocinio` o
  // custo saía 10× menor. Sem desconto de batch publicado para o 4.6.
  'grok-46': {
    id: 'grok-46',
    provedor: 'openai-compat',
    modelo: 'grok-4.6', // sucessor do grok-4.5 (12/ago/2026)
    envKey: 'XAI_API_KEY',
    baseUrl: 'https://api.x.ai/v1',
    contagemRaciocinio: 'fora-da-saida',
    precos: { entrada: 2, saida: 6 },
    suportaGrounded: true,
  },

  // Moonshot direta. A API rejeita temperature 0 ("only 1 is allowed for this
  // model", 24/ago/2026): CONDIÇÃO DISTINTA do protocolo, declarada (D13.2).
  // Sem tarifa de batch para o K3.
  'kimi-k3': {
    id: 'kimi-k3',
    maxTokensPadrao: 8192,
    provedor: 'openai-compat',
    modelo: 'kimi-k3', // sucessor do k2.6 (16/jul/2026)
    envKey: 'MOONSHOT_API_KEY',
    baseUrl: 'https://api.moonshot.ai/v1',
    corpoExtra: { temperature: 1 },
    precos: { entrada: 3, saida: 15 },
    suportaGrounded: true,
  },

  // Meta direta, camada standard (a camada "contributor", mais barata, cede os
  // prompts para treino: nunca usar no benchmark).
  'muse-spark-13': {
    id: 'muse-spark-13',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'muse-spark-1.3', // lançado em 02/set/2026, sucessor do 1.2
    envKey: 'META_API_KEY',
    baseUrl: 'https://api.meta.ai/v1',
    precos: { entrada: 1.25, saida: 4.25 },
    suportaGrounded: true,
  },
  'muse-spark': {
    id: 'muse-spark',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'muse-spark-1.2', // sucedido pelo muse-spark-13; fora do elenco, mantido para reprodução
    envKey: 'META_API_KEY',
    baseUrl: 'https://api.meta.ai/v1',
    precos: { entrada: 1.25, saida: 4.25 },
    suportaGrounded: true,
  },

  // DeepSeek via OpenRouter/Fireworks: a primeira parte segue excluída pela
  // política de privacidade da conta (decisão mantida em 16/set/2026); a
  // Fireworks (sem quantização) é a rota efetiva. Sem batch.
  'deepseek-pro': {
    id: 'deepseek-pro',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'deepseek/deepseek-v4-pro-0813', // snapshot datado (fixado em ago/2026; o alias sem data deriva)
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['deepseek', 'fireworks'], allow_fallbacks: false } },
    precos: { entrada: 1.32, saida: 3.96 }, // preço da Fireworks no snapshot -0813
    suportaGrounded: true,
  },
  'deepseek-flash-41': {
    id: 'deepseek-flash-41',
    maxTokensPadrao: 4096, // raciocina por padrão; conferir no smoke se 4096 basta
    provedor: 'openai-compat',
    modelo: 'deepseek/deepseek-v4.1-flash', // lançado em 10/set/2026, sucessor do v4-flash-0731 (aposentado)
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['deepseek', 'fireworks'], allow_fallbacks: false } },
    precos: { entrada: 0.3, saida: 1.2 }, // preço de lista da DeepSeek; conferir o da Fireworks na data
    suportaGrounded: true,
  },
  // APOSENTADO: o snapshot -0731 saiu do ar em 10/set/2026 (V4 Flash
  // substituído pelo V4.1 Flash). Entrada mantida para reprodução da v0.2.0.
  'deepseek-flash': {
    id: 'deepseek-flash',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'deepseek/deepseek-v4-flash-0731',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['deepseek', 'fireworks'], allow_fallbacks: false } },
    precos: { entrada: 0.14, saida: 0.28 },
    suportaGrounded: true,
  },

  // Alibaba via OpenRouter: a API direta (DashScope) responde 403 para a conta
  // (AccessDenied, 24/ago e 16/set/2026). Entradas `-direto` abaixo ficam para
  // quando a rota abrir. Sem batch por esta rota.
  'qwen-38-max-0902': {
    id: 'qwen-38-max-0902',
    maxTokensPadrao: 32768, // raciocina antes de responder; ver histórico do qwen-38-max
    provedor: 'openai-compat',
    modelo: 'qwen/qwen3.8-max-0902', // snapshot datado (D12); o alias qwen3.8-max passou a apontar para ele em 05/set/2026
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Alibaba'], allow_fallbacks: false } },
    precos: { entrada: 2, saida: 6 },
    suportaGrounded: true,
  },
  // Medido na v0.2.0 pelo alias sem data; em 05/set/2026 a Alibaba trocou o
  // snapshot por baixo do alias, então o id fica congelado nesta release e o
  // snapshot novo entra como qwen-38-max-0902 (D12 regra 3, D13.1).
  'qwen-38-max': {
    id: 'qwen-38-max',
    // 32768 (ago/2026): com 4096 (escalando a 8192) 304 das 900 chamadas
    // truncaram e voltaram VAZIAS — a resposta vem depois do raciocínio.
    // Smoke com teto folgado: raciocínio médio 6.330, máximo 15.550, nenhuma
    // truncada. Mesmo motivo do qwen-plus abaixo.
    maxTokensPadrao: 32768,
    provedor: 'openai-compat',
    modelo: 'qwen/qwen3.8-max', // sucessor do 3.7-max (03/ago/2026)
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Alibaba'], allow_fallbacks: false } },
    precos: { entrada: 2, saida: 6 },
    suportaGrounded: true,
  },
  'qwen-plus': {
    id: 'qwen-plus',
    // 32768 (ago/2026): com o teto anterior (1024, default da flag) 427 das 900
    // chamadas truncaram e voltaram VAZIAS — a resposta vem depois do
    // raciocínio, então truncar perde tudo. Medido em smoke com teto folgado:
    // raciocínio médio 4.268 tokens, máximo 14.556, para respostas que às vezes
    // são a palavra "Não". Teto generoso não custa nada por si (paga-se pelos
    // tokens gerados) e é seguro contra a cauda longa.
    maxTokensPadrao: 32768,
    provedor: 'openai-compat',
    modelo: 'qwen/qwen3.7-plus',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Alibaba'], allow_fallbacks: false } },
    precos: { entrada: 0.32, saida: 1.28 },
    suportaGrounded: true,
  },
  'qwen-38-flash': {
    id: 'qwen-38-flash',
    maxTokensPadrao: 4096, // raciocina antes de responder; conferir no smoke
    provedor: 'openai-compat',
    modelo: 'qwen/qwen3.8-flash', // lançado em 26/ago/2026, sucessor do 3.7-flash
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Alibaba'], allow_fallbacks: false } },
    precos: { entrada: 0.15, saida: 0.47 },
    suportaGrounded: true,
  },
  'qwen-flash': {
    id: 'qwen-flash',
    maxTokensPadrao: 4096, // raciocina antes de responder; 1024 truncava com resposta vazia
    provedor: 'openai-compat',
    modelo: 'qwen/qwen3.7-flash', // sucedido pelo qwen-38-flash; fora do elenco, mantido para reprodução
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Alibaba'], allow_fallbacks: false } },
    precos: { entrada: 0.03, saida: 0.13 },
    suportaGrounded: true,
  },
  // APOSENTADO pela Moonshot em 31/ago/2026 (404); nunca medido (v0.2.0
  // revogou a promessa). Entrada mantida só para o histórico do registro.
  'kimi-k25': {
    id: 'kimi-k25',
    maxTokensPadrao: 8192,
    provedor: 'openai-compat',
    modelo: 'moonshotai/kimi-k2.5',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Moonshot AI'], allow_fallbacks: false } },
    precos: { entrada: 0.38, saida: 2.02 },
    suportaGrounded: true,
  },

  // Maritaca direta (Sabiá não existe nos agregadores; conta pré-paga em
  // reais). Preços oficiais em BRL convertidos a ~R$5,40/US$ para o custo
  // informativo: sabia-4 R$5/R$20 por MTok; sabiazinho-4 R$1/R$4. Sem batch.
  'sabia-4': {
    id: 'sabia-4',
    provedor: 'openai-compat',
    modelo: 'sabia-4',
    envKey: 'MARITACA_API_KEY',
    baseUrl: 'https://chat.maritaca.ai/api',
    precos: { entrada: 0.93, saida: 3.7 },
    suportaGrounded: true,
  },
  'sabiazinho-4': {
    id: 'sabiazinho-4',
    provedor: 'openai-compat',
    modelo: 'sabiazinho-4',
    envKey: 'MARITACA_API_KEY',
    baseUrl: 'https://chat.maritaca.ai/api',
    precos: { entrada: 0.19, saida: 0.74 },
    suportaGrounded: true,
  },
  deepseek: {
    id: 'deepseek',
    provedor: 'openai-compat',
    modelo: 'deepseek-chat', // conferir na data da rodada
    envKey: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com',
    precos: { entrada: 0.27, saida: 1.1 }, // conferir na data da rodada
    suportaGrounded: true,
  },

  // ---------------------------------------------------------------------
  // ROTAS DIRETAS do ESTUDO DE INTERVENÇÃO (DECISOES.md D14.1, 24/ago/2026).
  // Desde a D15 (16/set/2026) o leaderboard também roda direto (entradas
  // acima); estas ficam separadas porque carregam condições do estudo (ex.:
  // gpt-5.6 sem raciocínio para aceitar tools). Sufixo `-direto` = loop de
  // tool-use no cliente (`mcp-loop`);
  // `-mcp` (abaixo) = connector nativo. Nunca colidem com os ids oficiais
  // (D13.1) e não entram no leaderboard. Divergências de condição impostas
  // pela rota (temperatura, raciocínio) ficam declaradas na própria entrada.
  // Identificadores e preços conferidos na doc de cada empresa em 24/ago/2026.
  // ---------------------------------------------------------------------
  'gpt-sol-direto': {
    id: 'gpt-sol-direto',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'gpt-5.6-sol',
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    parametroMaxTokens: 'max_completion_tokens', // a API direta rejeita max_tokens nos gpt-5.x
    // A API direta recusa function tools em /chat/completions com raciocínio
    // ligado ("use /v1/responses or set reasoning_effort to 'none'", 24/ago/2026).
    // CONDIÇÃO DISTINTA da rota OpenRouter: aqui o modelo roda SEM raciocínio.
    // Alternativa fiel ao raciocínio exigiria adapter da Responses API.
    corpoExtra: { reasoning_effort: 'none' },
    precos: { entrada: 4, saida: 20 },
    suportaGrounded: true,
  },
  'gpt-luna-direto': {
    id: 'gpt-luna-direto',
    provedor: 'openai-compat',
    modelo: 'gpt-5.6-luna',
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    parametroMaxTokens: 'max_completion_tokens', // idem
    corpoExtra: { reasoning_effort: 'none' }, // idem: sem raciocínio na rota direta
    precos: { entrada: 0.2, saida: 1.2 },
    suportaGrounded: true,
  },
  'grok-46-direto': {
    id: 'grok-46-direto',
    provedor: 'openai-compat',
    modelo: 'grok-4.6',
    envKey: 'XAI_API_KEY',
    baseUrl: 'https://api.x.ai/v1',
    // A xAI cobra o raciocínio como saída mas NÃO o inclui em completion_tokens
    // (sondagem de 16/set/2026); sem isto o custo saía 10× menor.
    contagemRaciocinio: 'fora-da-saida',
    precos: { entrada: 2, saida: 6 },
    suportaGrounded: true,
  },
  'deepseek-pro-direto': {
    id: 'deepseek-pro-direto',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'deepseek-v4-pro',
    envKey: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com',
    precos: { entrada: 1.32, saida: 3.96 }, // tarifa de pico
    suportaGrounded: true,
  },
  'deepseek-flash-direto': {
    id: 'deepseek-flash-direto',
    // 32768 (24/ago/2026, Portão 2 do estudo): a 8192 o modelo truncou 4/30 na
    // seca do piloto — raciocina até o teto. Condição declarada (D13.2).
    maxTokensPadrao: 32768,
    provedor: 'openai-compat',
    modelo: 'deepseek-v4-flash',
    envKey: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com',
    precos: { entrada: 0.44, saida: 1.32 }, // tarifa de pico
    suportaGrounded: true,
  },
  'kimi-k3-direto': {
    id: 'kimi-k3-direto',
    maxTokensPadrao: 8192,
    provedor: 'openai-compat',
    modelo: 'kimi-k3',
    envKey: 'MOONSHOT_API_KEY',
    baseUrl: 'https://api.moonshot.ai/v1',
    // A API direta rejeita temperature 0 ("only 1 is allowed for this model",
    // 24/ago/2026). CONDIÇÃO DISTINTA do protocolo (temperatura 0): declarar.
    corpoExtra: { temperature: 1 },
    precos: { entrada: 3, saida: 15 },
    suportaGrounded: true,
  },
  // Google direto, endpoint compatível com OpenAI (para o loop de tool-use no
  // cliente, condição A; o google.ts nativo não faz loop). Os tool_calls trazem
  // extra_content.google.thought_signature, reenviado como veio pelo adapter.
  'gemini-37-flash-direto': {
    id: 'gemini-37-flash-direto',
    maxTokensPadrao: 8192,
    provedor: 'openai-compat',
    modelo: 'gemini-3.7-flash',
    envKey: 'GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    // O endpoint compatível não informa os pensamentos em campo nenhum (só no
    // total_tokens); sem isto o custo saía 17× menor (smoke de 16/set/2026).
    contagemRaciocinio: 'nao-informado',
    precos: { entrada: 0.375, saida: 1.875 },
    suportaGrounded: true,
  },
  'gemini-pro-direto': {
    id: 'gemini-pro-direto',
    maxTokensPadrao: 8192,
    provedor: 'openai-compat',
    modelo: 'gemini-3.1-pro-preview',
    envKey: 'GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    // O endpoint compatível não informa os pensamentos em campo nenhum (só no
    // total_tokens); sem isto o custo saía 17× menor (smoke de 16/set/2026).
    contagemRaciocinio: 'nao-informado',
    precos: { entrada: 2, saida: 12 },
    suportaGrounded: true,
  },
  // Qwen: fora do estudo de intervenção (D14.1, 24/ago/2026): sem rota direta
  // disponível na data. Entradas mantidas para quando a rota abrir.
  'qwen-38-max-direto': {
    id: 'qwen-38-max-direto',
    maxTokensPadrao: 32768,
    provedor: 'openai-compat',
    modelo: 'qwen3.8-max',
    envKey: 'DASHSCOPE_API_KEY',
    baseUrl: 'https://dashscope-us.aliyuncs.com/compatible-mode/v1',
    precos: { entrada: 2, saida: 6 },
    suportaGrounded: true,
  },
  'qwen-plus-direto': {
    id: 'qwen-plus-direto',
    maxTokensPadrao: 32768,
    provedor: 'openai-compat',
    modelo: 'qwen3.7-plus',
    envKey: 'DASHSCOPE_API_KEY',
    baseUrl: 'https://dashscope-us.aliyuncs.com/compatible-mode/v1',
    precos: { entrada: 0.32, saida: 1.28 },
    suportaGrounded: true,
  },
  'qwen-flash-direto': {
    id: 'qwen-flash-direto',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'qwen3.7-flash',
    envKey: 'DASHSCOPE_API_KEY',
    baseUrl: 'https://dashscope-us.aliyuncs.com/compatible-mode/v1',
    precos: { entrada: 0.03, saida: 0.13 },
    suportaGrounded: true,
  },
  'muse-spark-direto': {
    id: 'muse-spark-direto',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'muse-spark-1.2',
    envKey: 'META_API_KEY',
    baseUrl: 'https://api.meta.ai/v1',
    precos: { entrada: 1.25, saida: 4.25 },
    suportaGrounded: true,
  },

  // ---------------------------------------------------------------------
  // CONNECTORS MCP NATIVOS (sufixo `-mcp`): a empresa conecta ao
  // mcp.bncc.dev do lado dela e resolve o loop numa única requisição
  // (mecanismo `mcp:`, condição distinta do `mcp-loop:` — D14 regra 2).
  // Só quatro empresas oferecem isso (levantamento de 24/ago/2026); a
  // Alibaba exige transporte SSE, que o servidor não tem. Mesma exceção de
  // rota direta das entradas `-direto`.
  // ---------------------------------------------------------------------
  'gpt-sol-mcp': {
    id: 'gpt-sol-mcp',
    maxTokensPadrao: 4096,
    provedor: 'openai-responses',
    modelo: 'gpt-5.6-sol',
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    // Responses API: raciocínio permitido com MCP (ao contrário do
    // /chat/completions), mas `temperature` é rejeitada nos gpt-5.x —
    // CONDIÇÃO DISTINTA do protocolo (temperatura 0): declarar.
    semTemperatura: true,
    opcoesResponses: { requireApproval: true },
    precos: { entrada: 4, saida: 20 },
    suportaGrounded: true,
  },
  'gpt-luna-mcp': {
    id: 'gpt-luna-mcp',
    provedor: 'openai-responses',
    modelo: 'gpt-5.6-luna',
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    semTemperatura: true,
    opcoesResponses: { requireApproval: true }, // idem
    precos: { entrada: 0.2, saida: 1.2 },
    suportaGrounded: true,
  },
  'grok-46-mcp': {
    id: 'grok-46-mcp',
    provedor: 'openai-responses',
    modelo: 'grok-4.6',
    envKey: 'XAI_API_KEY',
    baseUrl: 'https://api.x.ai/v1',
    opcoesResponses: {}, // xAI não aceita require_approval; aceita temperature
    precos: { entrada: 2, saida: 6 },
    suportaGrounded: true,
  },
  'gemini-37-flash-mcp': {
    id: 'gemini-37-flash-mcp',
    maxTokensPadrao: 8192,
    provedor: 'google-interactions',
    modelo: 'gemini-3.7-flash',
    envKey: 'GEMINI_API_KEY',
    precos: { entrada: 0.375, saida: 1.875 },
    suportaGrounded: true,
  },
  'gemini-pro-mcp': {
    id: 'gemini-pro-mcp',
    maxTokensPadrao: 8192,
    provedor: 'google-interactions',
    modelo: 'gemini-3.1-pro-preview',
    envKey: 'GEMINI_API_KEY',
    precos: { entrada: 2, saida: 12 },
    suportaGrounded: true,
  },
  'sonnet-5-mcp': {
    id: 'sonnet-5-mcp',
    maxTokensPadrao: 4096,
    provedor: 'anthropic',
    modelo: 'claude-sonnet-5',
    envKey: 'ANTHROPIC_API_KEY',
    semTemperatura: true, // Claude 4.6+ removeu o parâmetro (400 em 24/ago/2026)
    precos: { entrada: 3, saida: 15 },
    suportaGrounded: true,
  },
  'haiku-45-mcp': {
    id: 'haiku-45-mcp',
    provedor: 'anthropic',
    modelo: 'claude-haiku-4-5-20251001',
    envKey: 'ANTHROPIC_API_KEY',
    precos: { entrada: 1, saida: 5 },
    suportaGrounded: true,
  },
  'opus-5-mcp': {
    id: 'opus-5-mcp',
    maxTokensPadrao: 4096,
    provedor: 'anthropic',
    modelo: 'claude-opus-5',
    envKey: 'ANTHROPIC_API_KEY',
    semTemperatura: true, // Claude 4.6+ removeu o parâmetro (400 em 24/ago/2026)
    precos: { entrada: 5, saida: 25 },
    suportaGrounded: true,
  },
  'fable-5-mcp': {
    id: 'fable-5-mcp',
    maxTokensPadrao: 8192,
    provedor: 'anthropic',
    modelo: 'claude-fable-5',
    envKey: 'ANTHROPIC_API_KEY',
    semTemperatura: true, // Claude 4.6+ removeu o parâmetro (400 em 24/ago/2026)
    precos: { entrada: 10, saida: 50 },
    suportaGrounded: true,
  },
};
