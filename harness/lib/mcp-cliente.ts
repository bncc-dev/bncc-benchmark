/**
 * Mini-cliente MCP para o servidor remoto do bncc.dev (streamable HTTP,
 * stateless, sem key). Usado pelo loop de tool-use dos provedores que não têm
 * MCP connector nativo. Implementado para Bedrock; OpenAI e Google ainda não.
 */

const URL_MCP = 'https://mcp.bncc.dev/mcp';

export interface ToolMcp {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

interface RespostaJsonRpc {
  result?: unknown;
  error?: { code: number; message: string };
}

async function jsonRpc(method: string, params?: unknown): Promise<unknown> {
  const resposta = await fetch(URL_MCP, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!resposta.ok) {
    throw new Error(`MCP ${method}: HTTP ${resposta.status}`);
  }
  const contentType = resposta.headers.get('content-type') ?? '';
  let corpo: RespostaJsonRpc;
  if (contentType.includes('text/event-stream')) {
    const texto = await resposta.text();
    const linhaData = texto.split('\n').find((l) => l.startsWith('data:'));
    if (!linhaData) throw new Error(`MCP ${method}: SSE sem data`);
    corpo = JSON.parse(linhaData.slice(5)) as RespostaJsonRpc;
  } else {
    corpo = (await resposta.json()) as RespostaJsonRpc;
  }
  if (corpo.error) throw new Error(`MCP ${method}: ${corpo.error.message}`);
  return corpo.result;
}

let toolsMemo: ToolMcp[] | null = null;

export async function listarToolsMcp(): Promise<ToolMcp[]> {
  if (!toolsMemo) {
    const resultado = (await jsonRpc('tools/list')) as { tools: ToolMcp[] };
    toolsMemo = resultado.tools;
  }
  return toolsMemo;
}

/** Executa a tool e devolve o conteúdo textual concatenado. */
export async function chamarToolMcp(nome: string, argumentos: unknown): Promise<string> {
  const resultado = (await jsonRpc('tools/call', { name: nome, arguments: argumentos })) as {
    content: Array<{ type: string; text?: string }>;
    isError?: boolean;
  };
  const texto = resultado.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('\n');
  if (resultado.isError) throw new Error(`Tool ${nome} devolveu erro: ${texto.slice(0, 200)}`);
  return texto;
}

export { URL_MCP };
