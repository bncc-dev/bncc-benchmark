import { criarProvedorAnthropic } from './anthropic.js';
import { criarProvedorBedrock } from './bedrock.js';
import { criarProvedorGoogle } from './google.js';
import { criarProvedorOpenAiCompat } from './openai-compat.js';
import type { DefModelo, Provedor } from './tipos.js';

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
  }
}
