/**
 * Adapters de connector MCP nativo (openai-responses, google-interactions),
 * connector Anthropic e mini-cliente MCP, com fetch mockado. Formatos de
 * resposta copiados das sondas reais de 24/ago/2026.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chamarToolMcp, configurarRetryMcp, listarToolsMcp, versaoDadosMcp } from '../harness/lib/mcp-cliente.js';
configurarRetryMcp({ tentativas: 3, esperaBaseMs: 1 });
import { criarProvedorAnthropic } from '../harness/provedores/anthropic.js';
import { criarProvedorGoogleInteractions } from '../harness/provedores/google-interactions.js';
import { criarProvedorOpenAiResponses } from '../harness/provedores/openai-responses.js';
import type { DefModelo } from '../harness/provedores/tipos.js';

type Chamada = { url: string; corpo: Record<string, unknown>; headers: Record<string, string> };

function mockFetch(respostas: Array<{ status?: number; corpo: unknown; contentType?: string }>): Chamada[] {
  const chamadas: Chamada[] = [];
  let i = 0;
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    chamadas.push({ url, corpo: JSON.parse(String(init.body)), headers: init.headers as Record<string, string> });
    const r = respostas[Math.min(i++, respostas.length - 1)];
    const texto = typeof r.corpo === 'string' ? r.corpo : JSON.stringify(r.corpo);
    return new Response(texto, {
      status: r.status ?? 200,
      headers: { 'content-type': r.contentType ?? 'application/json' },
    });
  });
  return chamadas;
}

afterEach(() => vi.unstubAllGlobals());

const base = { envKey: 'K', precos: { entrada: 1, saida: 2 }, suportaGrounded: true };

describe('openai-responses', () => {
  const def: DefModelo = { ...base, id: 'r', provedor: 'openai-responses', modelo: 'gpt-x', baseUrl: 'https://api.test/v1', semTemperatura: true, opcoesResponses: { requireApproval: true } };

  it('grounded: envia tool mcp com require_approval e conta mcp_call', async () => {
    const chamadas = mockFetch([
      {
        corpo: {
          model: 'gpt-x-2026',
          status: 'completed',
          output: [
            { type: 'reasoning' },
            { type: 'mcp_list_tools', server_label: 'bncc', tools: [] },
            { type: 'mcp_call', name: 'bncc_lookup', arguments: '{"codigo":"EF03LP05"}', output: '{}', error: null },
            { type: 'message', content: [{ type: 'output_text', text: 'sim' }] },
          ],
          usage: { input_tokens: 100, output_tokens: 10, output_tokens_details: { reasoning_tokens: 7 } },
        },
      },
    ]);
    const r = await criarProvedorOpenAiResponses(def, 'k').completar({ prompt: 'p', grounded: true, maxTokens: 50 });
    expect(chamadas[0].url).toBe('https://api.test/v1/responses');
    expect(chamadas[0].corpo.tools).toEqual([{ type: 'mcp', server_label: 'bncc', server_url: 'https://mcp.bncc.dev/mcp', require_approval: 'never' }]);
    expect(chamadas[0].corpo.temperature).toBeUndefined();
    expect(chamadas[0].corpo.max_output_tokens).toBe(50);
    expect(r).toMatchObject({ texto: 'sim', versaoModelo: 'gpt-x-2026', finishReason: 'fim', toolsChamadas: 1, tokens: { entrada: 100, saida: 10, reasoning: 7 } });
    expect(r.mecanismoGrounding).toBe('mcp:https://mcp.bncc.dev/mcp');
    expect(r.custoUsd).toBeCloseTo((100 * 1 + 10 * 2) / 1e6);
  });

  it('seco: sem tools, com temperature quando permitida; truncamento vira max_tokens', async () => {
    const chamadas = mockFetch([
      { corpo: { model: 'g', status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [{ type: 'message', content: [{ type: 'output_text', text: 'parcial' }] }], usage: { input_tokens: 1, output_tokens: 1 } } },
    ]);
    const r = await criarProvedorOpenAiResponses({ ...def, semTemperatura: false, opcoesResponses: {} }, 'k').completar({ prompt: 'p', grounded: false, maxTokens: 5 });
    expect(chamadas[0].corpo.tools).toBeUndefined();
    expect(chamadas[0].corpo.temperature).toBe(0);
    expect(r.finishReason).toBe('max_tokens');
    expect(r.mecanismoGrounding).toBeNull();
  });

  it('erro HTTP e erro embutido viram ErroProvedor', async () => {
    mockFetch([{ status: 429, corpo: { error: { message: 'rate' } } }]);
    await expect(criarProvedorOpenAiResponses(def, 'k').completar({ prompt: 'p', grounded: false, maxTokens: 5 })).rejects.toThrow(/429/);
    mockFetch([{ corpo: { error: { message: 'upstream', code: 502 } } }]);
    await expect(criarProvedorOpenAiResponses(def, 'k').completar({ prompt: 'p', grounded: false, maxTokens: 5 })).rejects.toThrow(/erro embutido/);
  });
});

describe('google-interactions', () => {
  const def: DefModelo = { ...base, id: 'g', provedor: 'google-interactions', modelo: 'gemini-3.7-flash' };

  it('grounded: tool mcp_server, texto do model_output, tool_use_tokens somados à entrada', async () => {
    const chamadas = mockFetch([
      {
        corpo: {
          model: 'gemini-3.7-flash',
          status: 'completed',
          steps: [
            { type: 'mcp_server_tool_call', name: 'bncc:bncc_lookup', server_name: 'bncc', arguments: { codigo: 'EF03LP05' } },
            { type: 'mcp_server_tool_result', name: 'bncc:bncc_lookup', result: {} },
            { type: 'thought' },
            { type: 'model_output', content: [{ type: 'text', text: 'Sim' }] },
          ],
          usage: { total_input_tokens: 73, total_output_tokens: 22, total_tool_use_tokens: 2041, total_thought_tokens: 71 },
        },
      },
    ]);
    const r = await criarProvedorGoogleInteractions(def, 'k').completar({ prompt: 'p', grounded: true, maxTokens: 100 });
    expect(chamadas[0].headers['x-goog-api-key']).toBe('k');
    expect(chamadas[0].corpo.tools).toEqual([{ type: 'mcp_server', name: 'bncc', url: 'https://mcp.bncc.dev/mcp' }]);
    expect(chamadas[0].corpo.generation_config).toEqual({ temperature: 0, max_output_tokens: 100 });
    expect(r).toMatchObject({ texto: 'Sim', finishReason: 'fim', toolsChamadas: 1, tokens: { entrada: 2114, saida: 22, reasoning: 71 } });
  });

  it('status incomplete vira max_tokens', async () => {
    mockFetch([{ corpo: { status: 'incomplete', steps: [], usage: {} } }]);
    const r = await criarProvedorGoogleInteractions(def, 'k').completar({ prompt: 'p', grounded: false, maxTokens: 1 });
    expect(r.finishReason).toBe('max_tokens');
    expect(r.texto).toBe('');
  });
});

describe('anthropic (connector MCP)', () => {
  const def: DefModelo = { ...base, id: 'a', provedor: 'anthropic', modelo: 'claude-x', semTemperatura: true };

  it('grounded: beta atual, mcp_servers + mcp_toolset, sem temperature, conta mcp_tool_use', async () => {
    const chamadas = mockFetch([
      {
        corpo: {
          model: 'claude-x-1',
          stop_reason: 'end_turn',
          content: [
            { type: 'mcp_tool_use', name: 'bncc_lookup', input: { codigo: 'EF03LP05' }, server_name: 'bncc' },
            { type: 'mcp_tool_result', tool_use_id: 't', is_error: false, content: [{ type: 'text', text: '{}' }] },
            { type: 'text', text: 'Sim.' },
          ],
          usage: { input_tokens: 6230, output_tokens: 70 },
        },
      },
    ]);
    const r = await criarProvedorAnthropic(def, 'k').completar({ prompt: 'p', grounded: true, maxTokens: 100 });
    expect(chamadas[0].headers['anthropic-beta']).toBe('mcp-client-2025-11-20');
    expect(chamadas[0].corpo.mcp_servers).toEqual([{ type: 'url', url: 'https://mcp.bncc.dev/mcp', name: 'bncc' }]);
    expect(chamadas[0].corpo.tools).toEqual([{ type: 'mcp_toolset', mcp_server_name: 'bncc' }]);
    expect(chamadas[0].corpo.temperature).toBeUndefined();
    expect(r).toMatchObject({ texto: 'Sim.', toolsChamadas: 1, finishReason: 'fim', versaoModelo: 'claude-x-1' });
  });

  it('modelo que aceita temperature a recebe', async () => {
    const chamadas = mockFetch([{ corpo: { model: 'h', stop_reason: 'end_turn', content: [], usage: { input_tokens: 1, output_tokens: 1 } } }]);
    await criarProvedorAnthropic({ ...def, semTemperatura: false }, 'k').completar({ prompt: 'p', grounded: false, maxTokens: 1 });
    expect(chamadas[0].corpo.temperature).toBe(0);
    expect(chamadas[0].corpo.mcp_servers).toBeUndefined();
  });
});

describe('mcp-cliente', () => {
  const sse = (obj: unknown) => `event: message\ndata: ${JSON.stringify(obj)}\n\n`;

  it('tools/call concatena texto, respeita SSE e isError; versaoDadosMcp lê bncc_estatisticas', async () => {
    const chamadas = mockFetch([
      { corpo: sse({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] } }), contentType: 'text/event-stream' },
      { corpo: { jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'falhou' }], isError: true } } },
      { corpo: { jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: JSON.stringify({ total: 1721, versao: { data_version: 'dados-2026.07.1', commit: 'abc' } }) }] } } },
    ]);
    expect(await chamarToolMcp('bncc_lookup', { codigo: 'x' })).toBe('a\nb');
    expect(chamadas[0].corpo).toMatchObject({ method: 'tools/call', params: { name: 'bncc_lookup', arguments: { codigo: 'x' } } });
    await expect(chamarToolMcp('bncc_lookup', {})).rejects.toThrow(/devolveu erro/);
    expect(await versaoDadosMcp()).toEqual({ data_version: 'dados-2026.07.1', commit: 'abc' });
  });

  it('tools/list é memoizado', async () => {
    const chamadas = mockFetch([{ corpo: { jsonrpc: '2.0', id: 1, result: { tools: [{ name: 't1', inputSchema: {} }] } } }]);
    const a = await listarToolsMcp();
    const b = await listarToolsMcp();
    expect(a).toBe(b);
    expect(chamadas.filter((c) => c.corpo.method === 'tools/list').length).toBeLessThanOrEqual(1);
  });
});

describe('executarToolMcp: isError e erro JSON-RPC voltam ao modelo; transporte lança', async () => {
  const { executarToolMcp } = await import('../harness/lib/mcp-cliente.js');
  it('isError da tool é resposta legítima', async () => {
    mockFetch([{ corpo: { jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: '{"erro":"EF01HI09: não existe"}' }], isError: true } } }]);
    expect(await executarToolMcp('bncc_lookup', { codigo: 'EF01HI09' })).toEqual({ texto: '{"erro":"EF01HI09: não existe"}', isError: true });
  });
  it('erro JSON-RPC (argumentos inválidos) vira texto com isError', async () => {
    mockFetch([{ corpo: { jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'Input validation error' } } }]);
    const r = await executarToolMcp('bncc_buscar', { texto: 1 });
    expect(r.isError).toBe(true);
    expect(r.texto).toMatch(/validation/);
  });
  it('HTTP 5xx lança (transporte)', async () => {
    mockFetch([{ status: 503, corpo: 'indisponível' }]);
    await expect(executarToolMcp('bncc_lookup', { codigo: 'x' })).rejects.toThrow(/HTTP 503/);
  });
});

describe('mcp-cliente: retry em 429/5xx', async () => {
  const { executarToolMcp } = await import('../harness/lib/mcp-cliente.js');
  it('429 seguido de 200 devolve o resultado (sem contar como transporte)', async () => {
    const chamadas = mockFetch([
      { status: 429, corpo: 'rate limited' },
      { status: 503, corpo: 'indisponível' },
      { corpo: { jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'ok' }] } } },
    ]);
    const r = await executarToolMcp('bncc_lookup', { codigo: 'EF67LP08' });
    expect(r).toEqual({ texto: 'ok', isError: false });
    expect(chamadas.length).toBe(3);
  }, 20_000);
  it('4xx não transitório lança de imediato', async () => {
    const chamadas = mockFetch([{ status: 404, corpo: 'nada' }]);
    await expect(executarToolMcp('bncc_lookup', { codigo: 'x' })).rejects.toThrow(/HTTP 404/);
    expect(chamadas.length).toBe(1);
  });
});
