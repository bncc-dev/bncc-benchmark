/**
 * Adapter para a Interactions API do Google (Gemini API direta). A rodada
 * grounded usa o connector MCP remoto nativo (`tools: [{type: "mcp_server"}]`,
 * só Streamable HTTP): o Google conecta ao mcp.bncc.dev e resolve o loop de
 * tool-use do lado dele (mecanismo `mcp:`; ver DECISOES.md D9/D14).
 *
 * Levantamento de 24/ago/2026: a resposta vem em `steps[]` (model_output,
 * mcp_server_tool_call, mcp_server_tool_result, thought); `usage` separa
 * tokens de entrada, saída, pensamento e uso de tool.
 */

import { URL_MCP } from '../lib/mcp-cliente.js';
import { ErroProvedor } from './erro.js';
import type { ChamadaModelo, DefModelo, Provedor, RespostaModelo } from './tipos.js';

interface Passo {
  type: string;
  name?: string;
  content?: Array<{ type: string; text?: string }>;
}

interface RespostaApi {
  model?: string;
  status?: string;
  steps?: Passo[];
  usage?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
    total_thought_tokens?: number;
    total_tool_use_tokens?: number;
  };
  error?: { message?: string; code?: number } | null;
}

const URL_API = 'https://generativelanguage.googleapis.com/v1beta/interactions';

export function criarProvedorGoogleInteractions(def: DefModelo, key: string): Provedor {
  return {
    id: def.id,
    async completar(chamada: ChamadaModelo): Promise<RespostaModelo> {
      const corpo: Record<string, unknown> = {
        model: def.modelo,
        input: chamada.prompt,
        generation_config: { temperature: 0, max_output_tokens: chamada.maxTokens },
        ...def.corpoExtra,
      };
      if (chamada.grounded) {
        corpo.tools = [{ type: 'mcp_server', name: 'bncc', url: URL_MCP }];
      }

      const resposta = await fetch(URL_API, {
        method: 'POST',
        signal: AbortSignal.timeout(300_000),
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(corpo),
      });
      if (!resposta.ok) {
        const detalhe = await resposta.text();
        throw new ErroProvedor(resposta.status, `${def.id} ${resposta.status}: ${detalhe.slice(0, 300)}`);
      }
      const dados = (await resposta.json()) as RespostaApi;
      if (dados.error) {
        throw new ErroProvedor(dados.error.code ?? 502, `${def.id} erro embutido: ${JSON.stringify(dados.error).slice(0, 300)}`);
      }

      const passos = dados.steps ?? [];
      const texto = passos
        .filter((p) => p.type === 'model_output')
        .flatMap((p) => p.content ?? [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('\n');
      const toolsChamadas = passos.filter((p) => p.type === 'mcp_server_tool_call').length;

      // completed = completa; incomplete = truncada (doc: "e.g. hitting max_tokens").
      const finishReason =
        dados.status === 'completed' ? 'fim' : dados.status === 'incomplete' ? 'max_tokens' : (dados.status ?? 'bloqueado');

      // Resultados de tool entram no contexto do modelo: contam como entrada
      // (mesma convenção do mcp-loop, onde voltam como mensagens de tool).
      const entrada = (dados.usage?.total_input_tokens ?? 0) + (dados.usage?.total_tool_use_tokens ?? 0);
      const saida = dados.usage?.total_output_tokens ?? 0;
      const reasoning = dados.usage?.total_thought_tokens;

      return {
        texto,
        versaoModelo: dados.model ?? def.modelo,
        finishReason,
        tokens: { entrada, saida, ...(reasoning !== undefined ? { reasoning } : {}) },
        custoUsd: (entrada * def.precos.entrada + saida * def.precos.saida) / 1_000_000,
        toolsChamadas,
        mecanismoGrounding: chamada.grounded ? `mcp:${URL_MCP}` : null,
      };
    },
  };
}
