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
  // OpenRouter (uma key para GPT/Gemini/chineses; provedor pinado por requisição,
  // endpoint que serviu fica registrado no versao_modelo).
  'gpt-sol': {
    id: 'gpt-sol',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'openai/gpt-5.6-sol',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['OpenAI'], allow_fallbacks: false } },
    precos: { entrada: 5, saida: 30 },
    suportaGrounded: true,
  },
  // POLÍTICA (decisão do time, 13/jul/2026): modelos Anthropic rodam via
  // Bedrock sempre que a conta tiver acesso (sonnet-bedrock/haiku-bedrock
  // acima). Os três abaixo estão 403 no Bedrock da conta ("contact AWS
  // Sales"); ficam via OpenRouter como EXCEÇÃO TEMPORÁRIA até a liberação.
  // Quando liberar: migrar para provedor 'bedrock' e aposentar estas entradas.
  'sonnet-5': {
    id: 'sonnet-5',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'anthropic/claude-sonnet-5',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Amazon Bedrock'], allow_fallbacks: false } },
    precos: { entrada: 2, saida: 10 },
    suportaGrounded: true,
  },
  'opus-5': {
    id: 'opus-5',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'anthropic/claude-opus-5', // sucessor do opus-4.8 (aposentado em ago/2026)
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Amazon Bedrock'], allow_fallbacks: false } },
    precos: { entrada: 5, saida: 25 },
    suportaGrounded: true,
  },
  'fable-5': {
    id: 'fable-5',
    maxTokensPadrao: 8192,
    provedor: 'openai-compat',
    modelo: 'anthropic/claude-fable-5',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    // Sem pin, o OpenRouter desviou 2 das 900 chamadas da rodada 2026-08 para
    // o Google, misturando duas medições na mesma linha (D9). O pin natural
    // seria 'Amazon Bedrock', que serviu as outras 898 — mas em 18/ago/2026
    // essa rota passou a responder 404 ("Claude Fable 5 is not available",
    // gating de acesso do fornecedor) e as 2 chamadas ficaram irreproduzíveis
    // por ela. Rotas que respondiam naquela data: Anthropic e Google.
    // Pinado em 'Anthropic'; conferir na data da próxima rodada.
    corpoExtra: { provider: { order: ['Anthropic'], allow_fallbacks: false } },
    precos: { entrada: 10, saida: 50 },
    suportaGrounded: true,
  },
  'gpt-luna': {
    id: 'gpt-luna',
    provedor: 'openai-compat',
    modelo: 'openai/gpt-5.6-luna',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['OpenAI'], allow_fallbacks: false } },
    // Corrigido em 15/ago/2026: estava 1/6, dez vezes o cobrado. A OpenAI via
    // OpenRouter cobra 0.1/0.6 (conferido no endpoint do provedor pinado).
    // Consequência: o custo do gpt-luna na v0.1.0 saiu inflado ~10× (US$ 2,29
    // publicados; ~US$ 0,23 reais). Release imutável (D11), corrigido daqui
    // em diante e anotado na v0.2.0.
    precos: { entrada: 0.1, saida: 0.6 },
    suportaGrounded: true,
  },
  // POLÍTICA (decisão do time, 13/jul/2026): execução SÓ via Bedrock e
  // OpenRouter, onde o faturamento é controlado. A rota direta do Google
  // (AI Studio) fica suspensa até decisão em contrário; o OpenRouter serve
  // Gemini pelo próprio Google e registra o endpoint nos brutos.
  'gemini-pro': {
    id: 'gemini-pro',
    maxTokensPadrao: 8192,
    provedor: 'openai-compat',
    modelo: 'google/gemini-3.1-pro-preview',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Google'], allow_fallbacks: false } },
    precos: { entrada: 2, saida: 12 },
    suportaGrounded: true,
  },
  'gemini-37-flash': {
    id: 'gemini-37-flash',
    maxTokensPadrao: 8192,
    provedor: 'openai-compat',
    modelo: 'google/gemini-3.7-flash', // sucessor do 3.5-flash (13/ago/2026)
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Google'], allow_fallbacks: false } },
    precos: { entrada: 0.375, saida: 1.875 },
    suportaGrounded: true,
  },
  // Fronteira dos demais provedores, via OpenRouter (bateria piloto).
  'deepseek-pro': {
    id: 'deepseek-pro',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'deepseek/deepseek-v4-pro-0813', // snapshot datado (fixado em ago/2026; o alias sem data deriva)
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['deepseek', 'fireworks'], allow_fallbacks: false } }, // 1ª parte excluída pela política de privacidade da conta; Fireworks (sem quantização) como rota efetiva
    precos: { entrada: 1.32, saida: 3.96 }, // preço da Fireworks no snapshot -0813 (DeepSeek direto cobraria 0.435/0.87, mas está vetado)
    suportaGrounded: true,
  },
  'grok-46': {
    id: 'grok-46',
    provedor: 'openai-compat',
    modelo: 'x-ai/grok-4.6', // sucessor do grok-4.5 (12/ago/2026), mesmo preço
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['xAI'], allow_fallbacks: false } },
    precos: { entrada: 2, saida: 6 },
    suportaGrounded: true,
  },
  'kimi-k3': {
    id: 'kimi-k3',
    maxTokensPadrao: 8192,
    provedor: 'openai-compat',
    modelo: 'moonshotai/kimi-k3', // sucessor do k2.6 (16/jul/2026); NB: sobe de faixa de preço
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Moonshot AI'], allow_fallbacks: false } },
    precos: { entrada: 3, saida: 15 },
    suportaGrounded: true,
  },
  'qwen-38-max': {
    id: 'qwen-38-max',
    // 32768 (ago/2026): com 4096 (escalando a 8192) 304 das 900 chamadas
    // truncaram e voltaram VAZIAS — a resposta vem depois do raciocínio.
    // Smoke com teto folgado: raciocínio médio 6.330, máximo 15.550, nenhuma
    // truncada. Mesmo motivo do qwen-plus acima.
    maxTokensPadrao: 32768,
    provedor: 'openai-compat',
    modelo: 'qwen/qwen3.8-max', // sucessor do 3.7-max (03/ago/2026)
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Alibaba'], allow_fallbacks: false } },
    precos: { entrada: 2, saida: 6 },
    suportaGrounded: true,
  },
  // Segundo escalão (Fase 2), via OpenRouter.
  'deepseek-flash': {
    id: 'deepseek-flash',
    maxTokensPadrao: 4096, // o snapshot -0731 raciocina antes de responder; 1024 truncava com resposta vazia
    provedor: 'openai-compat',
    modelo: 'deepseek/deepseek-v4-flash-0731', // snapshot datado (fixado em ago/2026); a Fireworks saiu do alias sem data, mas serve o snapshot
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['deepseek', 'fireworks'], allow_fallbacks: false } }, // 1ª parte excluída pela política de privacidade da conta; Fireworks (sem quantização) como rota efetiva
    precos: { entrada: 0.14, saida: 0.28 },
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
  // Entrantes da rodada 2026-08 (decisão: cobrir a Meta e reforçar a faixa
  // ultra-barata; ver conversa/decisões de 15/ago/2026).
  'muse-spark': {
    id: 'muse-spark',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'meta/muse-spark-1.2',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Meta'], allow_fallbacks: false } },
    precos: { entrada: 1.25, saida: 4.25 },
    suportaGrounded: true,
  },
  'qwen-flash': {
    id: 'qwen-flash',
    maxTokensPadrao: 4096, // raciocina antes de responder; 1024 truncava com resposta vazia
    provedor: 'openai-compat',
    modelo: 'qwen/qwen3.7-flash',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Alibaba'], allow_fallbacks: false } },
    precos: { entrada: 0.03, saida: 0.13 },
    suportaGrounded: true,
  },
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
  // Maritaca DIRETO (exceção à política Bedrock+OpenRouter, aprovada pelo
  // time em 15/jul/2026: Sabiá não existe nos agregadores; conta pré-paga em
  // reais). Preços oficiais em BRL convertidos a ~R$5,40/US$ para o custo
  // informativo: sabia-4 R$5/R$20 por MTok; sabiazinho-4 R$1/R$4.
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
  // ROTAS DIRETAS (API de cada empresa) — o ESTUDO DE INTERVENÇÃO roda
  // exclusivamente por elas (DECISOES.md D14.1, 24/ago/2026); a política de
  // rotas de 13/jul/2026 (Bedrock + OpenRouter) segue valendo só para o
  // leaderboard. Sufixo `-direto` = loop de tool-use no cliente (`mcp-loop`);
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
  // PROVISÓRIO (smoke de rota direta para o leaderboard, 16/set/2026): igual ao
  // gpt-sol-direto, mas SEM desligar o raciocínio. A seca não usa tools, então
  // a restrição de /chat/completions não se aplica e o modelo roda na mesma
  // condição de raciocínio da rota OpenRouter. Os gpt-5.x com raciocínio
  // rejeitam `temperature` (400), daí semTemperatura. Não entra no leaderboard.
  'gpt-sol-direto-raciocinio': {
    id: 'gpt-sol-direto-raciocinio',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'gpt-5.6-sol',
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    parametroMaxTokens: 'max_completion_tokens',
    semTemperatura: true,
    precos: { entrada: 4, saida: 20 },
    suportaGrounded: false, // com tools a API exige raciocínio desligado; usar gpt-sol-direto ou gpt-sol-mcp
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
