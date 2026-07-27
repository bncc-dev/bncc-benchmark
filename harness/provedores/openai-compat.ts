/**
 * Adapter para APIs compatíveis com OpenAI (OpenAI, Maritaca, DeepSeek,
 * agregadores). A rodada grounded usa um loop de tool-use explícito com o
 * mini-cliente MCP (lib/mcp-cliente.ts), espelho do loop do bedrock.ts no
 * formato tools/tool_calls da API OpenAI.
 */

import { chamarToolMcp, listarToolsMcp, URL_MCP } from '../lib/mcp-cliente.js';
import { ErroProvedor } from './erro.js';
import type { ChamadaModelo, DefModelo, Provedor, RespostaModelo } from './tipos.js';

const MAX_VOLTAS_TOOLS = 8;

interface ToolCallApi {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}

interface MensagemApi {
  role: 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCallApi[];
  tool_call_id?: string;
}

interface RespostaApi {
  model: string;
  provider?: string; // OpenRouter informa qual endpoint serviu
  choices?: Array<{ message: MensagemApi; finish_reason?: string }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
  /** OpenRouter pode devolver HTTP 200 com erro no corpo (falha do upstream). */
  error?: { code?: number | string; message?: string };
}

export function criarProvedorOpenAiCompat(def: DefModelo, key: string): Provedor {
  if (!def.baseUrl) throw new Error(`Modelo ${def.id} sem baseUrl`);

  async function completions(
    mensagens: MensagemApi[],
    maxTokens: number,
    comTools: boolean,
  ): Promise<RespostaApi> {
    const corpo: Record<string, unknown> = {
      model: def.modelo,
      temperature: 0,
      max_tokens: maxTokens,
      messages: mensagens,
      ...def.corpoExtra,
    };
    if (comTools) {
      const tools = await listarToolsMcp();
      corpo.tools = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description ?? t.name,
          parameters: t.inputSchema,
        },
      }));
    }
    const resposta = await fetch(`${def.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(300_000), // sem timeout, socket pendurado trava o slot para sempre
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(corpo),
    });
    if (!resposta.ok) {
      const detalhe = await resposta.text();
      throw new ErroProvedor(resposta.status, `${def.id} ${resposta.status}: ${detalhe.slice(0, 300)}`);
    }
    const dados = (await resposta.json()) as RespostaApi;

    // OpenRouter: erro embutido em HTTP 200 (upstream instável) deve virar
    // ErroProvedor para o retry agir, nunca um TypeError que mata a rodada.
    if (dados.error) {
      const codigo = typeof dados.error.code === 'number' ? dados.error.code : 502;
      throw new ErroProvedor(
        codigo,
        `${def.id} erro no corpo (HTTP 200): ${String(dados.error.message).slice(0, 200)}`,
      );
    }
    if (!dados.choices?.length || !dados.usage) {
      throw new ErroProvedor(502, `${def.id} resposta sem choices/usage (anomalia do upstream)`);
    }
    return dados;
  }

  return {
    id: def.id,
    async completar(chamada: ChamadaModelo): Promise<RespostaModelo> {
      const mensagens: MensagemApi[] = [{ role: 'user', content: chamada.prompt }];
      let entrada = 0;
      let saida = 0;
      let reasoning: number | undefined;
      let toolsChamadas = 0;
      let dados!: RespostaApi;

      for (let volta = 0; ; volta++) {
        dados = await completions(mensagens, chamada.maxTokens, chamada.grounded);
        entrada += dados.usage!.prompt_tokens;
        saida += dados.usage!.completion_tokens;
        const r = dados.usage!.completion_tokens_details?.reasoning_tokens;
        if (r !== undefined) reasoning = (reasoning ?? 0) + r;

        const msg = dados.choices![0].message;
        const pedidos = msg.tool_calls ?? [];
        if (!chamada.grounded || pedidos.length === 0 || volta >= MAX_VOLTAS_TOOLS) break;

        mensagens.push({ role: 'assistant', content: msg.content ?? null, tool_calls: pedidos });
        for (const pedido of pedidos) {
          toolsChamadas++;
          let textoResultado: string;
          try {
            const argumentos = pedido.function.arguments ? JSON.parse(pedido.function.arguments) : {};
            textoResultado = await chamarToolMcp(pedido.function.name, argumentos);
          } catch (erro) {
            textoResultado = `Erro na tool: ${(erro as Error).message}`;
          }
          mensagens.push({ role: 'tool', content: textoResultado, tool_call_id: pedido.id });
        }
      }

      // Stop = completa; length = truncada; content_filter = bloqueada.
      const bruto = dados.choices![0]?.finish_reason;
      const finishReason =
        bruto === 'stop'
          ? 'fim'
          : bruto === 'length'
            ? 'max_tokens'
            : bruto === 'content_filter'
              ? 'bloqueado'
              : bruto === 'tool_calls'
                ? 'max_tokens' // estourou MAX_VOLTAS ainda pedindo tools: trata como cortada, nunca válida
                : (bruto ?? 'bloqueado'); // sem choice = bloqueio/anomalia, nunca resposta válida

      return {
        texto: dados.choices![0]?.message.content ?? '',
        versaoModelo: dados.provider ? `${dados.model} (via ${dados.provider})` : dados.model,
        finishReason,
        tokens: {
          entrada,
          saida,
          ...(reasoning !== undefined ? { reasoning } : {}),
        },
        custoUsd: (entrada * def.precos.entrada + saida * def.precos.saida) / 1_000_000,
        toolsChamadas,
        mecanismoGrounding: chamada.grounded ? `mcp-loop:${URL_MCP}` : null,
      };
    },
  };
}
