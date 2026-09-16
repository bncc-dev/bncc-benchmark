/**
 * Adapter Anthropic (Messages API, fetch puro). A rodada grounded usa o MCP
 * connector da API apontando para o MCP remoto público do bncc.dev; as tools
 * são executadas do lado do servidor da Anthropic, então uma única chamada
 * cobre o loop de tool-use.
 *
 * `montarCorpoAnthropic` e `converterRespostaAnthropic` são compartilhados com
 * o adapter de lote (anthropic-batch.ts): mesmo corpo, transporte diferente.
 */

import { ErroProvedor } from './erro.js';
import type { ChamadaModelo, DefModelo, Provedor, RespostaModelo } from './tipos.js';

const URL_MCP_BNCC = 'https://mcp.bncc.dev/mcp';

interface BlocoConteudo {
  type: string;
  text?: string;
}

export interface RespostaApiAnthropic {
  model: string;
  content: BlocoConteudo[];
  /** output_tokens já inclui o pensamento; thinking_tokens é a parcela (Claude 5 pensa por padrão). */
  usage: { input_tokens: number; output_tokens: number; output_tokens_details?: { thinking_tokens?: number } };
  stop_reason: string;
}

/** Corpo e headers de uma chamada Messages; `grounded` liga o connector MCP. */
export function montarCorpoAnthropic(
  def: DefModelo,
  chamada: ChamadaModelo,
): { corpo: Record<string, unknown>; headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  const corpo: Record<string, unknown> = {
    model: def.modelo,
    max_tokens: chamada.maxTokens,
    // Claude 4.6+ rejeita temperature (400): omitir quando semTemperatura.
    ...(def.semTemperatura ? {} : { temperature: 0 }),
    messages: [{ role: 'user', content: chamada.prompt }],
  };
  if (chamada.grounded) {
    headers['anthropic-beta'] = 'mcp-client-2025-11-20';
    corpo.mcp_servers = [{ type: 'url', url: URL_MCP_BNCC, name: 'bncc' }];
    // Obrigatório desde o beta 2025-11-20: sem o toolset a API rejeita a requisição.
    corpo.tools = [{ type: 'mcp_toolset', mcp_server_name: 'bncc' }];
  }
  return { corpo, headers };
}

/** Converte a resposta da Messages API na RespostaModelo normalizada. */
export function converterRespostaAnthropic(
  def: DefModelo,
  dados: RespostaApiAnthropic,
  grounded: boolean,
): RespostaModelo {
  const texto = dados.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n');
  const toolsChamadas = dados.content.filter((b) => b.type === 'mcp_tool_use').length;
  // End_turn/stop_sequence = completa; max_tokens = truncada.
  const finishReason =
    dados.stop_reason === 'end_turn' || dados.stop_reason === 'stop_sequence'
      ? 'fim'
      : dados.stop_reason === 'max_tokens'
        ? 'max_tokens'
        : dados.stop_reason;
  const reasoning = dados.usage.output_tokens_details?.thinking_tokens;
  return {
    texto,
    versaoModelo: dados.model,
    finishReason,
    tokens: {
      entrada: dados.usage.input_tokens,
      saida: dados.usage.output_tokens,
      ...(reasoning !== undefined ? { reasoning } : {}),
    },
    custoUsd:
      (dados.usage.input_tokens * def.precos.entrada + dados.usage.output_tokens * def.precos.saida) /
      1_000_000,
    toolsChamadas,
    mecanismoGrounding: grounded ? `mcp:${URL_MCP_BNCC}` : null,
  };
}

export function criarProvedorAnthropic(def: DefModelo, key: string): Provedor {
  return {
    id: def.id,
    async completar(chamada: ChamadaModelo): Promise<RespostaModelo> {
      const { corpo, headers } = montarCorpoAnthropic(def, chamada);
      const resposta = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: AbortSignal.timeout(300_000), // sem timeout, socket pendurado trava o slot para sempre
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          ...headers,
        },
        body: JSON.stringify(corpo),
      });
      if (!resposta.ok) {
        const detalhe = await resposta.text();
        throw new ErroProvedor(resposta.status, `anthropic ${resposta.status}: ${detalhe.slice(0, 300)}`);
      }
      const dados = (await resposta.json()) as RespostaApiAnthropic;
      return converterRespostaAnthropic(def, dados, chamada.grounded);
    },
  };
}
