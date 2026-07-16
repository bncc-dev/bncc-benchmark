/**
 * Adapter Google (Gemini, generateContent). Rodada grounded não implementada
 * aqui (M5: tool-use com a API REST do bncc.dev).
 */

import { ErroProvedor } from './erro.js';
import type { ChamadaModelo, DefModelo, Provedor, RespostaModelo } from './tipos.js';

interface RespostaApi {
  modelVersion?: string;
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  };
}

export function criarProvedorGoogle(def: DefModelo, key: string): Provedor {
  return {
    id: def.id,
    async completar(chamada: ChamadaModelo): Promise<RespostaModelo> {
      if (chamada.grounded) {
        throw new Error(`Rodada grounded não implementada para ${def.id} (M5)`);
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${def.modelo}:generateContent`;
      const resposta = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(300_000), // sem timeout, socket pendurado trava o slot para sempre
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: chamada.prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: chamada.maxTokens },
        }),
      });
      if (!resposta.ok) {
        const detalhe = await resposta.text();
        throw new ErroProvedor(resposta.status, `${def.id} ${resposta.status}: ${detalhe.slice(0, 300)}`);
      }
      const dados = (await resposta.json()) as RespostaApi;
      const candidato = dados.candidates?.[0];
      const texto = (candidato?.content?.parts ?? []).map((p) => p.text ?? '').join('');
      // RB-4: STOP = completa; MAX_TOKENS = truncada; SAFETY etc. = bloqueada.
      // candidates vazio (bloqueio de prompt) nunca vira resposta válida.
      const bruto = candidato?.finishReason;
      const finishReason =
        bruto === 'STOP'
          ? 'fim'
          : bruto === 'MAX_TOKENS'
            ? 'max_tokens'
            : bruto === undefined
              ? 'bloqueado'
              : bruto === 'SAFETY' || bruto === 'PROHIBITED_CONTENT' || bruto === 'BLOCKLIST'
                ? 'bloqueado'
                : bruto;
      const reasoning = dados.usageMetadata.thoughtsTokenCount;
      return {
        texto,
        versaoModelo: dados.modelVersion ?? def.modelo,
        finishReason,
        tokens: {
          entrada: dados.usageMetadata.promptTokenCount,
          saida: dados.usageMetadata.candidatesTokenCount ?? 0,
          ...(reasoning !== undefined ? { reasoning } : {}),
        },
        custoUsd:
          (dados.usageMetadata.promptTokenCount * def.precos.entrada +
            (dados.usageMetadata.candidatesTokenCount ?? 0) * def.precos.saida) /
          1_000_000,
        toolsChamadas: 0,
        mecanismoGrounding: null,
      };
    },
  };
}
