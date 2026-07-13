/**
 * Adapter para APIs compatíveis com OpenAI (OpenAI, Maritaca, DeepSeek,
 * agregadores). Rodada grounded não implementada aqui (M5: tool-use com a API
 * REST do bncc.dev).
 */

import { ErroProvedor } from './erro.js';
import type { ChamadaModelo, DefModelo, Provedor, RespostaModelo } from './tipos.js';

interface RespostaApi {
  model: string;
  provider?: string; // OpenRouter informa qual endpoint serviu
  choices: Array<{ message: { content: string | null }; finish_reason?: string }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
}

export function criarProvedorOpenAiCompat(def: DefModelo, key: string): Provedor {
  if (!def.baseUrl) throw new Error(`Modelo ${def.id} sem baseUrl`);
  return {
    id: def.id,
    async completar(chamada: ChamadaModelo): Promise<RespostaModelo> {
      if (chamada.grounded) {
        throw new Error(`Rodada grounded não implementada para ${def.id} (M5)`);
      }
      const resposta = await fetch(`${def.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: def.modelo,
          temperature: 0,
          max_tokens: chamada.maxTokens,
          messages: [{ role: 'user', content: chamada.prompt }],
          ...def.corpoExtra,
        }),
      });
      if (!resposta.ok) {
        const detalhe = await resposta.text();
        throw new ErroProvedor(resposta.status, `${def.id} ${resposta.status}: ${detalhe.slice(0, 300)}`);
      }
      const dados = (await resposta.json()) as RespostaApi;
      // RB-4: stop = completa; length = truncada; content_filter = bloqueada.
      const bruto = dados.choices[0]?.finish_reason;
      const finishReason =
        bruto === 'stop'
          ? 'fim'
          : bruto === 'length'
            ? 'max_tokens'
            : bruto === 'content_filter'
              ? 'bloqueado'
              : (bruto ?? 'bloqueado'); // sem choice = bloqueio/anomalia, nunca resposta válida
      const reasoning = dados.usage.completion_tokens_details?.reasoning_tokens;
      return {
        texto: dados.choices[0]?.message.content ?? '',
        versaoModelo: dados.provider ? `${dados.model} (via ${dados.provider})` : dados.model,
        finishReason,
        tokens: {
          entrada: dados.usage.prompt_tokens,
          saida: dados.usage.completion_tokens,
          ...(reasoning !== undefined ? { reasoning } : {}),
        },
        custoUsd:
          (dados.usage.prompt_tokens * def.precos.entrada +
            dados.usage.completion_tokens * def.precos.saida) /
          1_000_000,
        toolsChamadas: 0,
        mecanismoGrounding: null,
      };
    },
  };
}
