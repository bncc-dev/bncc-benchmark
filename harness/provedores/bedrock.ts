/**
 * Adapter AWS Bedrock (Converse API com API key/bearer token; fetch puro,
 * sem SigV4 nem SDK). A rodada grounded usa um loop de tool-use explícito com
 * o mini-cliente MCP (lib/mcp-cliente.ts), já que o Bedrock não tem o MCP
 * connector da API direta da Anthropic. O mesmo loop serve de base para os
 * provedores OpenAI/Google no M5.
 */

import { chamarToolMcp, listarToolsMcp, URL_MCP } from '../lib/mcp-cliente.js';
import { ErroProvedor } from './erro.js';
import type { ChamadaModelo, DefModelo, Provedor, RespostaModelo } from './tipos.js';

const MAX_VOLTAS_TOOLS = 8;

interface BlocoConverse {
  text?: string;
  toolUse?: { toolUseId: string; name: string; input: unknown };
  toolResult?: { toolUseId: string; content: Array<{ text: string }>; status: string };
}

interface MensagemConverse {
  role: 'user' | 'assistant';
  content: BlocoConverse[];
}

interface RespostaConverse {
  output: { message: MensagemConverse };
  stopReason: string;
  usage: { inputTokens: number; outputTokens: number };
}

export function criarProvedorBedrock(def: DefModelo, token: string): Provedor {
  const regiao = process.env.AWS_REGION ?? 'us-east-1';
  const url = `https://bedrock-runtime.${regiao}.amazonaws.com/model/${encodeURIComponent(def.modelo)}/converse`;

  async function converse(
    mensagens: MensagemConverse[],
    maxTokens: number,
    comTools: boolean,
  ): Promise<RespostaConverse> {
    const corpo: Record<string, unknown> = {
      messages: mensagens,
      inferenceConfig: { temperature: 0, maxTokens },
    };
    if (comTools) {
      const tools = await listarToolsMcp();
      corpo.toolConfig = {
        tools: tools.map((t) => ({
          toolSpec: {
            name: t.name,
            description: t.description ?? t.name,
            inputSchema: { json: t.inputSchema },
          },
        })),
      };
    }
    const resposta = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(corpo),
    });
    if (!resposta.ok) {
      const detalhe = await resposta.text();
      throw new ErroProvedor(resposta.status, `${def.id} ${resposta.status}: ${detalhe.slice(0, 300)}`);
    }
    return (await resposta.json()) as RespostaConverse;
  }

  return {
    id: def.id,
    async completar(chamada: ChamadaModelo): Promise<RespostaModelo> {
      const mensagens: MensagemConverse[] = [
        { role: 'user', content: [{ text: chamada.prompt }] },
      ];
      let entrada = 0;
      let saida = 0;
      let toolsChamadas = 0;
      let ultima: RespostaConverse;

      for (let volta = 0; ; volta++) {
        ultima = await converse(mensagens, chamada.maxTokens, chamada.grounded);
        entrada += ultima.usage.inputTokens;
        saida += ultima.usage.outputTokens;

        const pedidosDeTool = ultima.output.message.content.filter((b) => b.toolUse);
        if (!chamada.grounded || pedidosDeTool.length === 0 || volta >= MAX_VOLTAS_TOOLS) break;

        mensagens.push(ultima.output.message);
        const resultados: BlocoConverse[] = [];
        for (const bloco of pedidosDeTool) {
          const { toolUseId, name, input } = bloco.toolUse!;
          toolsChamadas++;
          let textoResultado: string;
          let status = 'success';
          try {
            textoResultado = await chamarToolMcp(name, input);
          } catch (erro) {
            textoResultado = `Erro na tool: ${(erro as Error).message}`;
            status = 'error';
          }
          resultados.push({
            toolResult: { toolUseId, content: [{ text: textoResultado }], status },
          });
        }
        mensagens.push({ role: 'user', content: resultados });
      }

      const texto = ultima.output.message.content
        .filter((b) => b.text)
        .map((b) => b.text)
        .join('\n');

      return {
        texto,
        versaoModelo: def.modelo,
        tokens: { entrada, saida },
        custoUsd: (entrada * def.precos.entrada + saida * def.precos.saida) / 1_000_000,
        toolsChamadas,
        mecanismoGrounding: chamada.grounded ? `mcp-loop:${URL_MCP}` : null,
      };
    },
  };
}
