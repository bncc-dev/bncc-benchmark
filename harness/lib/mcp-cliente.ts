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

let TENTATIVAS_TRANSPORTE = 6;
let ESPERA_BASE_MS = 500;
/** Só para testes: encurta o backoff. */
export function configurarRetryMcp(o: { tentativas?: number; esperaBaseMs?: number }): void {
  if (o.tentativas !== undefined) TENTATIVAS_TRANSPORTE = o.tentativas;
  if (o.esperaBaseMs !== undefined) ESPERA_BASE_MS = o.esperaBaseMs;
}

// O worker do mcp.bncc.dev limita 60 requisições/min por IP (wrangler.toml).
// Pacing no cliente: no máximo LIMITE_POR_MINUTO chamadas por janela móvel de
// 60 s, compartilhado por todo o processo (modelos rápidos batiam no 429).
const LIMITE_POR_MINUTO = 55;
const janela: number[] = [];
let filaPacing: Promise<void> = Promise.resolve();
async function aguardarVaga(): Promise<void> {
  const minhaVez = filaPacing.then(async () => {
    for (;;) {
      const agora = Date.now();
      while (janela.length > 0 && agora - janela[0] >= 60_000) janela.shift();
      if (janela.length < LIMITE_POR_MINUTO) {
        janela.push(agora);
        return;
      }
      await new Promise((r) => setTimeout(r, janela[0] + 60_000 - agora + 5));
    }
  });
  filaPacing = minhaVez.catch(() => undefined);
  return minhaVez;
}

/**
 * Requisição JSON-RPC com retry para 429/5xx/rede (backoff exponencial,
 * honrando Retry-After). O worker do mcp.bncc.dev limita a taxa por origem;
 * clientes rápidos (modelos sem raciocínio, concorrência 2-3) batem nele.
 */
async function jsonRpc(method: string, params?: unknown): Promise<unknown> {
  let resposta!: Response;
  for (let t = 0; ; t++) {
    await aguardarVaga();
    try {
      resposta = await fetch(URL_MCP, {
        method: 'POST',
        signal: AbortSignal.timeout(60_000),
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
    } catch (erro) {
      if (t === TENTATIVAS_TRANSPORTE - 1) throw erro;
      await new Promise((r) => setTimeout(r, ESPERA_BASE_MS * 2 ** t));
      continue;
    }
    if (resposta.ok) break;
    const transitorio = resposta.status === 429 || resposta.status >= 500;
    if (!transitorio || t === TENTATIVAS_TRANSPORTE - 1) {
      throw new Error(`MCP ${method}: HTTP ${resposta.status}`);
    }
    const retryAfter = Number(resposta.headers.get('retry-after'));
    const espera = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : ESPERA_BASE_MS * 2 ** t;
    await new Promise((r) => setTimeout(r, espera));
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
  if (corpo.error) throw new ErroProtocoloMcp(`MCP ${method}: ${corpo.error.message}`);
  return corpo.result;
}

/** Erro JSON-RPC devolvido pelo servidor (ex.: -32602 argumentos inválidos): é resposta ao chamador, não falha de transporte. */
export class ErroProtocoloMcp extends Error {}

let toolsMemo: ToolMcp[] | null = null;

export async function listarToolsMcp(): Promise<ToolMcp[]> {
  if (!toolsMemo) {
    const resultado = (await jsonRpc('tools/list')) as { tools: ToolMcp[] };
    toolsMemo = resultado.tools;
  }
  return toolsMemo;
}

/**
 * Executa a tool. `isError` é resposta LEGÍTIMA da ferramenta (ex.: bncc_lookup
 * de código inexistente: "código válido na forma, mas não existe"): vai ao
 * modelo como texto e não conta como falha. Só erros de transporte/protocolo
 * (HTTP, timeout, JSON-RPC error) lançam — e esses, sim, invalidam a resposta.
 */
export async function executarToolMcp(nome: string, argumentos: unknown): Promise<{ texto: string; isError: boolean }> {
  let resultado: { content: Array<{ type: string; text?: string }>; isError?: boolean };
  try {
    resultado = (await jsonRpc('tools/call', { name: nome, arguments: argumentos })) as typeof resultado;
  } catch (erro) {
    // Argumentos inválidos etc.: o modelo errou a chamada; ele recebe a mensagem
    // e pode corrigir. Não é artefato de execução.
    if (erro instanceof ErroProtocoloMcp) return { texto: erro.message, isError: true };
    throw erro;
  }
  const texto = resultado.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('\n');
  return { texto, isError: resultado.isError === true };
}

/** Executa a tool e devolve o texto; lança também quando a tool sinaliza isError. */
export async function chamarToolMcp(nome: string, argumentos: unknown): Promise<string> {
  const { texto, isError } = await executarToolMcp(nome, argumentos);
  if (isError) throw new Error(`Tool ${nome} devolveu erro: ${texto.slice(0, 200)}`);
  return texto;
}

export { URL_MCP };

export interface VersaoDadosMcp {
  data_version: string;
  commit?: string;
}

/**
 * Versão dos dados servida pelo MCP (tool `bncc_estatisticas`). Entra no
 * manifesto e na chave de cache da rodada grounded (D14, regra 3): o servidor
 * muda por baixo da mesma URL, e a chave não capturava isso (commit a408a3d).
 */
export async function versaoDadosMcp(): Promise<VersaoDadosMcp> {
  const texto = await chamarToolMcp('bncc_estatisticas', {});
  const dados = JSON.parse(texto) as { versao?: { data_version?: string; commit?: string } };
  if (!dados.versao?.data_version) throw new Error('bncc_estatisticas sem versao.data_version');
  return { data_version: dados.versao.data_version, ...(dados.versao.commit ? { commit: dados.versao.commit } : {}) };
}

/**
 * Impressão digital das tools servidas (nomes, descrições e schemas). Uma
 * correção no servidor pode mudar o comportamento de uma tool sem mudar a
 * versão dos dados (caso do bncc_buscar em 25/ago/2026); a chave de cache da
 * rodada grounded inclui este hash para nunca reaproveitar respostas obtidas
 * contra outra versão das ferramentas.
 */
export async function hashToolsMcp(): Promise<string> {
  const { createHash } = await import('node:crypto');
  const tools = await listarToolsMcp();
  const estavel = JSON.stringify(
    [...tools].sort((a, b) => a.name.localeCompare(b.name)).map((t) => [t.name, t.description ?? '', t.inputSchema]),
  );
  return createHash('sha256').update(estavel).digest('hex').slice(0, 12);
}
