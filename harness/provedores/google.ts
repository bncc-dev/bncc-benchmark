/**
 * Adapter Google (Gemini, generateContent). Rodada grounded não implementada
 * aqui (M5: tool-use com a API REST do bncc.dev).
 */

import { ErroProvedor } from './erro.js';
import type { ChamadaModelo, DefModelo, Provedor, RespostaModelo } from './tipos.js';

interface RespostaApi {
  modelVersion?: string;
  candidates: Array<{ content: { parts: Array<{ text?: string }> } }>;
  usageMetadata: { promptTokenCount: number; candidatesTokenCount: number };
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
      const texto = (dados.candidates[0]?.content.parts ?? [])
        .map((p) => p.text ?? '')
        .join('');
      return {
        texto,
        versaoModelo: dados.modelVersion ?? def.modelo,
        tokens: {
          entrada: dados.usageMetadata.promptTokenCount,
          saida: dados.usageMetadata.candidatesTokenCount,
        },
        custoUsd:
          (dados.usageMetadata.promptTokenCount * def.precos.entrada +
            dados.usageMetadata.candidatesTokenCount * def.precos.saida) /
          1_000_000,
        toolsChamadas: 0,
        mecanismoGrounding: null,
      };
    },
  };
}
