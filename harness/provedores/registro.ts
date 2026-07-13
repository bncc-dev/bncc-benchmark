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
  gpt: {
    id: 'gpt',
    provedor: 'openai-compat',
    modelo: 'gpt-5.2', // conferir no M5
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    precos: { entrada: 1.25, saida: 10 }, // conferir no M5
    suportaGrounded: false, // M5: tool-use na API REST
  },
  gemini: {
    id: 'gemini',
    provedor: 'google',
    modelo: 'gemini-2.5-pro', // conferir no M5
    envKey: 'GEMINI_API_KEY',
    precos: { entrada: 1.25, saida: 10 }, // conferir no M5
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
