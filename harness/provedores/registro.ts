/**
 * Registro dos modelos-alvo. Os dois "claude-*" bastam para o smoke (uma key).
 * Os demais são os alvos do M5: nomes de modelo e preços DEVEM ser conferidos
 * na data da rodada (o campo precos é informativo; a fonte de custo real são
 * os tokens registrados nos brutos).
 */

import type { DefModelo } from './tipos.js';

export const MODELOS: Record<string, DefModelo> = {
  // Bedrock (Converse API, bearer token AWS_BEARER_TOKEN_BEDROCK; região via
  // AWS_REGION, default us-east-1). IDs de modelo idênticos aos usados em
  // projetos irmãos da equipe; conferir/pinar no M5.
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
    suportaGrounded: false, // porte do loop MCP pendente (M5)
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
    suportaGrounded: false,
  },
  'opus-4.8': {
    id: 'opus-4.8',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'anthropic/claude-opus-4.8',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    precos: { entrada: 5, saida: 25 },
    suportaGrounded: false,
  },
  'fable-5': {
    id: 'fable-5',
    maxTokensPadrao: 8192,
    provedor: 'openai-compat',
    modelo: 'anthropic/claude-fable-5',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    precos: { entrada: 10, saida: 50 },
    suportaGrounded: false,
  },
  'gpt-luna': {
    id: 'gpt-luna',
    provedor: 'openai-compat',
    modelo: 'openai/gpt-5.6-luna',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['OpenAI'], allow_fallbacks: false } },
    precos: { entrada: 1, saida: 6 },
    suportaGrounded: false,
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
    suportaGrounded: false,
  },
  'gemini-flash': {
    id: 'gemini-flash',
    maxTokensPadrao: 8192,
    provedor: 'openai-compat',
    modelo: 'google/gemini-3.5-flash',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Google'], allow_fallbacks: false } },
    precos: { entrada: 1.5, saida: 9 },
    suportaGrounded: false,
  },
  // Fronteira dos demais provedores, via OpenRouter (bateria piloto).
  'deepseek-pro': {
    id: 'deepseek-pro',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'deepseek/deepseek-v4-pro',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['deepseek', 'fireworks'], allow_fallbacks: false } }, // 1ª parte excluída pela política de privacidade da conta; Fireworks (sem quantização) como rota efetiva
    precos: { entrada: 0.43, saida: 0.87 },
    suportaGrounded: false,
  },
  grok: {
    id: 'grok',
    provedor: 'openai-compat',
    modelo: 'x-ai/grok-4.5',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['xAI'], allow_fallbacks: false } },
    precos: { entrada: 2, saida: 6 },
    suportaGrounded: false,
  },
  kimi: {
    id: 'kimi',
    maxTokensPadrao: 8192,
    provedor: 'openai-compat',
    modelo: 'moonshotai/kimi-k2.6',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Moonshot AI'], allow_fallbacks: false } },
    precos: { entrada: 0.66, saida: 3.41 },
    suportaGrounded: false,
  },
  'qwen-max': {
    id: 'qwen-max',
    maxTokensPadrao: 4096,
    provedor: 'openai-compat',
    modelo: 'qwen/qwen3.7-max',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Alibaba'], allow_fallbacks: false } },
    precos: { entrada: 1.25, saida: 3.75 },
    suportaGrounded: false,
  },
  // Segundo escalão (Fase 2), via OpenRouter.
  'deepseek-flash': {
    id: 'deepseek-flash',
    provedor: 'openai-compat',
    modelo: 'deepseek/deepseek-v4-flash',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['deepseek', 'fireworks'], allow_fallbacks: false } }, // 1ª parte excluída pela política de privacidade da conta; Fireworks (sem quantização) como rota efetiva
    precos: { entrada: 0.08, saida: 0.15 },
    suportaGrounded: false,
  },
  'qwen-plus': {
    id: 'qwen-plus',
    provedor: 'openai-compat',
    modelo: 'qwen/qwen3.7-plus',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    corpoExtra: { provider: { order: ['Alibaba'], allow_fallbacks: false } },
    precos: { entrada: 0.32, saida: 1.28 },
    suportaGrounded: false,
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
    suportaGrounded: false,
  },
  maritaca: {
    id: 'maritaca',
    provedor: 'openai-compat',
    modelo: 'sabia-3', // conferir no M5
    envKey: 'MARITACA_API_KEY',
    baseUrl: 'https://chat.maritaca.ai/api',
    precos: { entrada: 0.95, saida: 1.9 }, // conferir no M5
    suportaGrounded: false,
  },
  deepseek: {
    id: 'deepseek',
    provedor: 'openai-compat',
    modelo: 'deepseek-chat', // conferir no M5
    envKey: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com',
    precos: { entrada: 0.27, saida: 1.1 }, // conferir no M5
    suportaGrounded: false,
  },
};
