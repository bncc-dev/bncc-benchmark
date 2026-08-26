/**
 * Adapter para a Responses API (OpenAI e compatíveis, ex.: xAI). A rodada
 * grounded usa o connector MCP remoto nativo (`tools: [{type: "mcp", ...}]`):
 * a empresa conecta ao mcp.bncc.dev do lado dela e resolve o loop de
 * tool-use dentro de uma única requisição (mecanismo `mcp:`, distinto do
 * `mcp-loop:` do openai-compat.ts — ver DECISOES.md D9/D14).
 *
 * Levantamento de 24/ago/2026: OpenAI exige `require_approval: "never"` para
 * não pausar pedindo aprovação; xAI não aceita o campo. Os gpt-5.x rejeitam
 * `temperature` nesta API (omitida quando `semTemperatura`).
 */

import { URL_MCP } from '../lib/mcp-cliente.js';
import { ErroProvedor } from './erro.js';
import type { ChamadaModelo, DefModelo, Provedor, RespostaModelo } from './tipos.js';

interface ItemSaida {
  type: string;
  name?: string;
  error?: string | null;
  content?: Array<{ type: string; text?: string }>;
}

interface RespostaApi {
  model: string;
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output?: ItemSaida[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    output_tokens_details?: { reasoning_tokens?: number };
  };
  error?: { message?: string; code?: string | number } | null;
}

export function criarProvedorOpenAiResponses(def: DefModelo, key: string): Provedor {
  if (!def.baseUrl) throw new Error(`Modelo ${def.id} sem baseUrl`);
  const opcoes = def.opcoesResponses ?? {};

  return {
    id: def.id,
    async completar(chamada: ChamadaModelo): Promise<RespostaModelo> {
      const corpo: Record<string, unknown> = {
        model: def.modelo,
        input: chamada.prompt,
        max_output_tokens: chamada.maxTokens,
        ...(def.semTemperatura ? {} : { temperature: 0 }),
        ...def.corpoExtra,
      };
      if (chamada.grounded) {
        corpo.tools = [
          {
            type: 'mcp',
            server_label: 'bncc',
            server_url: URL_MCP,
            ...(opcoes.requireApproval ? { require_approval: 'never' } : {}),
          },
        ];
      }

      const resposta = await fetch(`${def.baseUrl}/responses`, {
        method: 'POST',
        signal: AbortSignal.timeout(300_000),
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify(corpo),
      });
      if (!resposta.ok) {
        const detalhe = await resposta.text();
        throw new ErroProvedor(resposta.status, `${def.id} ${resposta.status}: ${detalhe.slice(0, 300)}`);
      }
      const dados = (await resposta.json()) as RespostaApi;
      if (dados.error) {
        const codigo = typeof dados.error.code === 'number' ? dados.error.code : 502;
        throw new ErroProvedor(codigo, `${def.id} erro embutido: ${JSON.stringify(dados.error).slice(0, 300)}`);
      }

      const saida = dados.output ?? [];
      const texto = saida
        .filter((o) => o.type === 'message')
        .flatMap((o) => o.content ?? [])
        .filter((c) => c.type === 'output_text')
        .map((c) => c.text ?? '')
        .join('\n');
      const toolsChamadas = saida.filter((o) => o.type === 'mcp_call').length;

      // completed = completa; incomplete/max_output_tokens = truncada.
      const finishReason =
        dados.status === 'completed'
          ? 'fim'
          : dados.status === 'incomplete'
            ? dados.incomplete_details?.reason === 'max_output_tokens'
              ? 'max_tokens'
              : (dados.incomplete_details?.reason ?? 'incomplete')
            : (dados.status ?? 'bloqueado');

      const entrada = dados.usage?.input_tokens ?? 0;
      const saidaTokens = dados.usage?.output_tokens ?? 0;
      const reasoning = dados.usage?.output_tokens_details?.reasoning_tokens;

      return {
        texto,
        versaoModelo: dados.model ?? def.modelo,
        finishReason,
        tokens: { entrada, saida: saidaTokens, ...(reasoning !== undefined ? { reasoning } : {}) },
        custoUsd: (entrada * def.precos.entrada + saidaTokens * def.precos.saida) / 1_000_000,
        toolsChamadas,
        mecanismoGrounding: chamada.grounded ? `mcp:${URL_MCP}` : null,
      };
    },
  };
}
