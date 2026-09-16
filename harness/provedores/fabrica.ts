import { criarProvedorAnthropic } from './anthropic.js';
import { criarProvedorBedrock } from './bedrock.js';
import { criarProvedorGoogle } from './google.js';
import { criarProvedorGoogleInteractions } from './google-interactions.js';
import { criarProvedorOpenAiCompat } from './openai-compat.js';
import { criarProvedorOpenAiResponses } from './openai-responses.js';
import { criarProvedorBatchAnthropic } from './anthropic-batch.js';
import { criarProvedorBatchGoogle } from './google-batch.js';
import { criarProvedorBatchOpenAi } from './openai-batch.js';
import type { DefModelo, Provedor, ProvedorBatch } from './tipos.js';

/**
 * Transporte em lote. Exige `def.batch` e coerência entre a Batch API e o
 * adapter síncrono, para que o corpo enviado seja o mesmo: OpenRouter, Bedrock
 * e Maritaca não têm Batch API e são recusados com erro explicativo.
 */
export function criarProvedorBatch(def: DefModelo, ambiente: Record<string, string | undefined>): ProvedorBatch {
  if (!def.batch) throw new Error(`${def.id} não tem Batch API configurada (campo batch no registro)`);
  const key = ambiente[def.envKey];
  if (!key) throw new Error(`Key ausente: defina ${def.envKey} no .env para usar ${def.id}`);
  const { api } = def.batch;
  if (api === 'anthropic' && def.provedor === 'anthropic') return criarProvedorBatchAnthropic(def, key);
  if (api === 'google' && def.provedor === 'google') return criarProvedorBatchGoogle(def, key);
  if (api === 'openai' && def.provedor === 'openai-compat' && def.baseUrl === 'https://api.openai.com/v1') {
    return criarProvedorBatchOpenAi(def, key);
  }
  throw new Error(
    `${def.id}: batch.api '${api}' incoerente com provedor '${def.provedor}'${def.baseUrl ? ` (${def.baseUrl})` : ''}; ` +
      'a Batch API só vale pela rota direta da própria empresa',
  );
}

export function criarProvedor(def: DefModelo, ambiente: Record<string, string | undefined>): Provedor {
  const key = ambiente[def.envKey];
  if (!key) throw new Error(`Key ausente: defina ${def.envKey} no .env para usar ${def.id}`);
  switch (def.provedor) {
    case 'anthropic':
      return criarProvedorAnthropic(def, key);
    case 'bedrock':
      return criarProvedorBedrock(def, key);
    case 'openai-compat':
      return criarProvedorOpenAiCompat(def, key);
    case 'google':
      return criarProvedorGoogle(def, key);
    case 'openai-responses':
      return criarProvedorOpenAiResponses(def, key);
    case 'google-interactions':
      return criarProvedorGoogleInteractions(def, key);
  }
}
