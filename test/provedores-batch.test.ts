import { afterEach, describe, expect, it, vi } from 'vitest';
import { criarProvedorBatchAnthropic } from '../harness/provedores/anthropic-batch.js';
import { criarProvedorBatch } from '../harness/provedores/fabrica.js';
import { criarProvedorBatchGoogle } from '../harness/provedores/google-batch.js';
import { criarProvedorBatchOpenAi } from '../harness/provedores/openai-batch.js';
import type { DefModelo, PedidoBatch } from '../harness/provedores/tipos.js';

interface Chamada {
  url: string;
  metodo: string;
  headers: Record<string, string>;
  corpo?: unknown;
  form?: FormData;
}

/** Mock de fetch por sequência de respostas; registra url/corpo de cada chamada. */
function mockFetch(respostas: Array<{ status?: number; corpo: unknown; texto?: string }>) {
  const chamadas: Chamada[] = [];
  let i = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const headers = Object.fromEntries(Object.entries((init?.headers as Record<string, string>) ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
      const c: Chamada = { url, metodo: init?.method ?? 'GET', headers };
      if (init?.body instanceof FormData) c.form = init.body;
      else if (typeof init?.body === 'string') c.corpo = JSON.parse(init.body);
      chamadas.push(c);
      const r = respostas[i++];
      if (!r) throw new Error(`fetch inesperado: ${url}`);
      return new Response(r.texto ?? JSON.stringify(r.corpo), { status: r.status ?? 200 });
    }),
  );
  return chamadas;
}

afterEach(() => vi.unstubAllGlobals());

const PEDIDOS: PedidoBatch[] = [
  { customId: 'a-001-p0', chamada: { prompt: 'p1', grounded: false, maxTokens: 4096 } },
  { customId: 'b-002-p0', chamada: { prompt: 'p2', grounded: false, maxTokens: 4096 } },
];

describe('anthropic-batch', () => {
  const def: DefModelo = { id: 'opus', provedor: 'anthropic', modelo: 'claude-opus-5', envKey: 'K', semTemperatura: true, precos: { entrada: 5, saida: 25 }, batch: { api: 'anthropic' }, suportaGrounded: true };

  it('submete requests com o mesmo corpo do síncrono (sem temperature, sem MCP)', async () => {
    const chamadas = mockFetch([{ corpo: { id: 'msgbatch_1', processing_status: 'in_progress' } }]);
    const lote = await criarProvedorBatchAnthropic(def, 'k').submeter(PEDIDOS, 'r/opus/g1');
    expect(lote.id).toBe('msgbatch_1');
    expect(chamadas[0].url).toBe('https://api.anthropic.com/v1/messages/batches');
    expect(chamadas[0].headers['x-api-key']).toBe('k');
    const corpo = chamadas[0].corpo as { requests: Array<{ custom_id: string; params: Record<string, unknown> }> };
    expect(corpo.requests.map((r) => r.custom_id)).toEqual(['a-001-p0', 'b-002-p0']);
    expect(corpo.requests[0].params).toEqual({ model: 'claude-opus-5', max_tokens: 4096, messages: [{ role: 'user', content: 'p1' }] });
  });

  it('estado mapeia in_progress/ended e captura results_url', async () => {
    mockFetch([
      { corpo: { id: 'x', processing_status: 'in_progress', request_counts: { processing: 2, succeeded: 0, errored: 0, canceled: 0, expired: 0 } } },
      { corpo: { id: 'x', processing_status: 'ended', results_url: 'https://r', request_counts: { processing: 0, succeeded: 1, errored: 1, canceled: 0, expired: 0 } } },
    ]);
    const p = criarProvedorBatchAnthropic(def, 'k');
    expect(await p.estado({ id: 'x' })).toMatchObject({ fase: 'processando', contagens: { total: 2, concluidos: 0, falhos: 0 } });
    expect(await p.estado({ id: 'x' })).toMatchObject({ fase: 'concluido', extras: { results_url: 'https://r' }, contagens: { falhos: 1 } });
  });

  it('coleta parseia o JSONL: succeeded vira resposta com thinking e custo × 0,5; errored vira erro', async () => {
    const linhas = [
      JSON.stringify({ custom_id: 'a-001-p0', result: { type: 'succeeded', message: { model: 'claude-opus-5', content: [{ type: 'thinking' }, { type: 'text', text: 'olá' }], stop_reason: 'end_turn', usage: { input_tokens: 100, output_tokens: 1000, output_tokens_details: { thinking_tokens: 800 } } } } }),
      JSON.stringify({ custom_id: 'b-002-p0', result: { type: 'errored', error: { type: 'invalid_request' } } }),
    ].join('\n');
    mockFetch([{ corpo: null, texto: linhas }]);
    const r = await criarProvedorBatchAnthropic(def, 'k').coletar({ id: 'x', extras: { results_url: 'https://r' } });
    expect(r[0]).toMatchObject({ customId: 'a-001-p0', resposta: { texto: 'olá', finishReason: 'fim', tokens: { entrada: 100, saida: 1000, reasoning: 800 } } });
    // lista: (100×5 + 1000×25)/1e6 = 0.0255; batch: 0.01275
    expect((r[0] as { resposta: { custoUsd: number } }).resposta.custoUsd).toBeCloseTo(0.01275, 6);
    expect(r[1]).toMatchObject({ customId: 'b-002-p0' });
    expect((r[1] as { erro: string }).erro).toContain('errored');
  });
});

describe('google-batch', () => {
  const def: DefModelo = { id: 'gem', provedor: 'google', modelo: 'gemini-3.1-pro-preview', envKey: 'K', precos: { entrada: 2, saida: 12 }, batch: { api: 'google' }, suportaGrounded: false };

  it('submete pedidos inline com metadata.key e generationConfig', async () => {
    const chamadas = mockFetch([{ corpo: { name: 'batches/abc' } }]);
    const lote = await criarProvedorBatchGoogle(def, 'k').submeter(PEDIDOS, 'r/gem/g1');
    expect(lote.id).toBe('batches/abc');
    expect(chamadas[0].url).toContain('/models/gemini-3.1-pro-preview:batchGenerateContent');
    expect(chamadas[0].headers['x-goog-api-key']).toBe('k');
    const corpo = chamadas[0].corpo as { batch: { display_name: string; input_config: { requests: { requests: Array<{ request: Record<string, unknown>; metadata: { key: string } }> } } } };
    expect(corpo.batch.display_name).toBe('r/gem/g1');
    expect(corpo.batch.input_config.requests.requests[1]).toEqual({
      request: { contents: [{ parts: [{ text: 'p2' }] }], generationConfig: { temperature: 0, maxOutputTokens: 4096 } },
      metadata: { key: 'b-002-p0' },
    });
  });

  it('estado mapeia RUNNING/SUCCEEDED/FAILED', async () => {
    mockFetch([
      { corpo: { name: 'b', metadata: { state: 'BATCH_STATE_RUNNING' } } },
      { corpo: { name: 'b', done: true, metadata: { state: 'BATCH_STATE_SUCCEEDED', batchStats: { requestCount: '2', successfulRequestCount: '2' } } } },
      { corpo: { name: 'b', done: true, metadata: { state: 'BATCH_STATE_FAILED' }, error: { message: 'quota' } } },
    ]);
    const p = criarProvedorBatchGoogle(def, 'k');
    expect((await p.estado({ id: 'b' })).fase).toBe('processando');
    expect(await p.estado({ id: 'b' })).toMatchObject({ fase: 'concluido', contagens: { total: 2, concluidos: 2 } });
    expect(await p.estado({ id: 'b' })).toMatchObject({ fase: 'falhou', erro: 'quota' });
  });

  it('coleta soma thoughtsTokenCount à saída, mapeia MAX_TOKENS e recusa responsesFile', async () => {
    mockFetch([
      {
        corpo: {
          name: 'b',
          done: true,
          response: {
            inlinedResponses: {
              inlinedResponses: [
                { metadata: { key: 'a-001-p0' }, response: { modelVersion: 'gemini-3.1-pro-preview', candidates: [{ content: { parts: [{ text: 'oi' }] }, finishReason: 'MAX_TOKENS' }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 50, thoughtsTokenCount: 700 } } },
                { metadata: { key: 'b-002-p0' }, error: { code: 13, message: 'interno' } },
              ],
            },
          },
        },
      },
      { corpo: { name: 'b', done: true, response: { responsesFile: 'files/x' } } },
    ]);
    const p = criarProvedorBatchGoogle(def, 'k');
    const r = await p.coletar({ id: 'b' });
    expect(r[0]).toMatchObject({ customId: 'a-001-p0', resposta: { finishReason: 'max_tokens', tokens: { entrada: 10, saida: 750, reasoning: 700 } } });
    // lista: (10×2 + 750×12)/1e6 = 0.00902; batch: 0.00451
    expect((r[0] as { resposta: { custoUsd: number } }).resposta.custoUsd).toBeCloseTo(0.00451, 6);
    expect((r[1] as { erro: string }).erro).toContain('interno');
    await expect(p.coletar({ id: 'b' })).rejects.toThrow(/responsesFile/);
  });
});

describe('openai-batch', () => {
  const def: DefModelo = { id: 'luna', provedor: 'openai-compat', modelo: 'gpt-5.6-luna', envKey: 'K', baseUrl: 'https://api.openai.com/v1', parametroMaxTokens: 'max_completion_tokens', semTemperatura: true, precos: { entrada: 0.2, saida: 1.2 }, batch: { api: 'openai' }, suportaGrounded: false };

  it('submete em duas chamadas: upload do JSONL (purpose=batch) e criação do lote', async () => {
    const chamadas = mockFetch([{ corpo: { id: 'file-1' } }, { corpo: { id: 'batch-1', status: 'validating' } }]);
    const lote = await criarProvedorBatchOpenAi(def, 'k').submeter(PEDIDOS, 'r/luna/g1');
    expect(lote).toEqual({ id: 'batch-1', extras: { input_file_id: 'file-1' } });
    expect(chamadas[0].url).toBe('https://api.openai.com/v1/files');
    expect(chamadas[0].form?.get('purpose')).toBe('batch');
    const jsonl = await (chamadas[0].form?.get('file') as Blob).text();
    const linha = JSON.parse(jsonl.split('\n')[0]);
    expect(linha).toEqual({ custom_id: 'a-001-p0', method: 'POST', url: '/v1/chat/completions', body: { model: 'gpt-5.6-luna', max_completion_tokens: 4096, messages: [{ role: 'user', content: 'p1' }] } });
    expect(chamadas[1].url).toBe('https://api.openai.com/v1/batches');
    expect(chamadas[1].corpo).toMatchObject({ input_file_id: 'file-1', endpoint: '/v1/chat/completions', completion_window: '24h' });
  });

  it('estado captura output_file_id/error_file_id e mapeia failed com os erros', async () => {
    mockFetch([
      { corpo: { id: 'b', status: 'in_progress', request_counts: { total: 2, completed: 1, failed: 0 } } },
      { corpo: { id: 'b', status: 'completed', output_file_id: 'out', error_file_id: 'err', request_counts: { total: 2, completed: 1, failed: 1 } } },
      { corpo: { id: 'b', status: 'failed', errors: { data: [{ line: 3, message: 'invalid model' }] } } },
    ]);
    const p = criarProvedorBatchOpenAi(def, 'k');
    expect(await p.estado({ id: 'b' })).toMatchObject({ fase: 'processando', contagens: { total: 2, concluidos: 1 } });
    expect(await p.estado({ id: 'b' })).toMatchObject({ fase: 'concluido', extras: { output_file_id: 'out', error_file_id: 'err' } });
    expect(await p.estado({ id: 'b' })).toMatchObject({ fase: 'falhou', erro: '3: invalid model' });
  });

  it('coleta lê saída e erros; length vira max_tokens; status != 200 vira erro', async () => {
    const saida = [
      JSON.stringify({ custom_id: 'a-001-p0', response: { status_code: 200, body: { model: 'gpt-5.6-luna', choices: [{ message: { content: 'x' }, finish_reason: 'length' }], usage: { prompt_tokens: 10, completion_tokens: 100, completion_tokens_details: { reasoning_tokens: 60 } } } } }),
      JSON.stringify({ custom_id: 'c-003-p0', response: { status_code: 429, body: { error: { message: 'rate' } } } }),
    ].join('\n');
    const erros = JSON.stringify({ custom_id: 'b-002-p0', error: { message: 'expired' } });
    mockFetch([{ corpo: null, texto: saida }, { corpo: null, texto: erros }]);
    const r = await criarProvedorBatchOpenAi(def, 'k').coletar({ id: 'b', extras: { output_file_id: 'out', error_file_id: 'err' } });
    expect(r[0]).toMatchObject({ customId: 'a-001-p0', resposta: { finishReason: 'max_tokens', tokens: { entrada: 10, saida: 100, reasoning: 60 } } });
    // lista: (10×0.2 + 100×1.2)/1e6 = 0.000122; batch: 0.000061
    expect((r[0] as { resposta: { custoUsd: number } }).resposta.custoUsd).toBeCloseTo(0.000061, 9);
    expect((r[1] as { erro: string }).erro).toContain('rate');
    expect(r[2]).toMatchObject({ customId: 'b-002-p0' });
    expect((r[2] as { erro: string }).erro).toContain('expired');
  });
});

describe('criarProvedorBatch', () => {
  const amb = { K: 'k' };
  it('recusa def sem batch e api incoerente com o provedor', () => {
    expect(() => criarProvedorBatch({ id: 'x', provedor: 'anthropic', modelo: 'm', envKey: 'K', precos: { entrada: 1, saida: 1 }, suportaGrounded: false }, amb)).toThrow(/Batch API/);
    expect(() =>
      criarProvedorBatch({ id: 'x', provedor: 'openai-compat', modelo: 'm', envKey: 'K', baseUrl: 'https://openrouter.ai/api/v1', precos: { entrada: 1, saida: 1 }, batch: { api: 'openai' }, suportaGrounded: false }, amb),
    ).toThrow(/incoerente/);
    expect(() =>
      criarProvedorBatch({ id: 'x', provedor: 'bedrock', modelo: 'm', envKey: 'K', precos: { entrada: 1, saida: 1 }, batch: { api: 'anthropic' }, suportaGrounded: false }, amb),
    ).toThrow(/incoerente/);
  });
  it('aceita as três combinações válidas', () => {
    expect(criarProvedorBatch({ id: 'a', provedor: 'anthropic', modelo: 'm', envKey: 'K', precos: { entrada: 1, saida: 1 }, batch: { api: 'anthropic' }, suportaGrounded: false }, amb).id).toBe('a');
    expect(criarProvedorBatch({ id: 'g', provedor: 'google', modelo: 'm', envKey: 'K', precos: { entrada: 1, saida: 1 }, batch: { api: 'google' }, suportaGrounded: false }, amb).id).toBe('g');
    expect(criarProvedorBatch({ id: 'o', provedor: 'openai-compat', modelo: 'm', envKey: 'K', baseUrl: 'https://api.openai.com/v1', precos: { entrada: 1, saida: 1 }, batch: { api: 'openai' }, suportaGrounded: false }, amb).id).toBe('o');
  });
});
