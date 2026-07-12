/**
 * Adapter Anthropic (Messages API, fetch puro). A rodada grounded usa o MCP
 * connector da API apontando para o MCP remoto público do bncc.dev; as tools
 * são executadas do lado do servidor da Anthropic, então uma única chamada
 * cobre o loop de tool-use.
 */

import { ErroProvedor } from './erro.js';
import type { ChamadaModelo, DefModelo, Provedor, RespostaModelo } from './tipos.js';

const URL_MCP_BNCC = 'https://mcp.bncc.dev/mcp';

interface BlocoConteudo {
  type: string;
  text?: string;
}

interface RespostaApi {
  model: string;
  content: BlocoConteudo[];
  usage: { input_tokens: number; output_tokens: number };
  stop_reason: string;
}

export function criarProvedorAnthropic(def: DefModelo, key: string): Provedor {
  return {
    id: def.id,
    async completar(chamada: ChamadaModelo): Promise<RespostaModelo> {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      };
      const corpo: Record<string, unknown> = {
        model: def.modelo,
        max_tokens: chamada.maxTokens,
        temperature: 0,
        messages: [{ role: 'user', content: chamada.prompt }],
      };
      if (chamada.grounded) {
        headers['anthropic-beta'] = 'mcp-client-2025-04-04';
        corpo.mcp_servers = [{ type: 'url', url: URL_MCP_BNCC, name: 'bncc' }];
      }

      const resposta = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(corpo),
      });
      if (!resposta.ok) {
        const detalhe = await resposta.text();
        throw new ErroProvedor(resposta.status, `anthropic ${resposta.status}: ${detalhe.slice(0, 300)}`);
      }
      const dados = (await resposta.json()) as RespostaApi;

      const texto = dados.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('\n');
      const toolsChamadas = dados.content.filter((b) => b.type === 'mcp_tool_use').length;

      return {
        texto,
        versaoModelo: dados.model,
        tokens: { entrada: dados.usage.input_tokens, saida: dados.usage.output_tokens },
        custoUsd:
          (dados.usage.input_tokens * def.precos.entrada +
            dados.usage.output_tokens * def.precos.saida) /
          1_000_000,
        toolsChamadas,
        mecanismoGrounding: chamada.grounded ? `mcp:${URL_MCP_BNCC}` : null,
      };
    },
  };
}
