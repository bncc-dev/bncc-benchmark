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
    precos: { entrada: 1, saida: 6 },
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
  'gemini-flash': {
    id: 'gemini-flash',
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
  grok: {
    id: 'grok',
    provedor: 'openai-compat',
    modelo: 'x-ai/grok-4.6', // sucessor do grok-4.5 (12/ago/2026), mesmo preço
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['xAI'], allow_fallbacks: false } },
    precos: { entrada: 2, saida: 6 },
    suportaGrounded: true,
  },
  kimi: {
    id: 'kimi',
    maxTokensPadrao: 8192,
    provedor: 'openai-compat',
    modelo: 'moonshotai/kimi-k3', // sucessor do k2.6 (16/jul/2026); NB: sobe de faixa de preço
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Moonshot AI'], allow_fallbacks: false } },
    precos: { entrada: 3, saida: 15 },
    suportaGrounded: true,
  },
  'qwen-max': {
    id: 'qwen-max',
    maxTokensPadrao: 4096,
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
};
