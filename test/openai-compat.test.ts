import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErroProvedor } from '../harness/provedores/erro.js';
import { criarProvedorOpenAiCompat } from '../harness/provedores/openai-compat.js';
import type { DefModelo } from '../harness/provedores/tipos.js';

const DEF: DefModelo = {
  id: 'fake-or',
  provedor: 'openai-compat',
  modelo: 'fake/fake-1',
  envKey: 'X',
  baseUrl: 'https://exemplo.invalido/api/v1',
  precos: { entrada: 1, saida: 1 },
  suportaGrounded: false,
};

function mockFetch(status: number, corpo: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(corpo), { status })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('openai-compat: anomalias do OpenRouter', () => {
  const chamada = { prompt: 'oi', grounded: false, maxTokens: 100 };

  it('erro embutido em HTTP 200 vira ErroProvedor transitório (retry age)', async () => {
    mockFetch(200, { error: { code: 502, message: 'Upstream error from provider' } });
    const provedor = criarProvedorOpenAiCompat(DEF, 'key');
    await expect(provedor.completar(chamada)).rejects.toSatisfy(
      (e: unknown) => e instanceof ErroProvedor && e.transitorio,
    );
  });

  it('resposta 200 sem choices vira ErroProvedor 502, nunca TypeError', async () => {
    mockFetch(200, { model: 'fake/fake-1' });
    const provedor = criarProvedorOpenAiCompat(DEF, 'key');
    await expect(provedor.completar(chamada)).rejects.toSatisfy(
      (e: unknown) => e instanceof ErroProvedor && e.status === 502,
    );
  });

  it('resposta normal segue funcionando', async () => {
    mockFetch(200, {
      model: 'fake/fake-1',
      provider: 'FakeProv',
      choices: [{ message: { content: 'olá' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 2 },
    });
    const provedor = criarProvedorOpenAiCompat(DEF, 'key');
    const r = await provedor.completar(chamada);
    expect(r.texto).toBe('olá');
    expect(r.finishReason).toBe('fim');
    expect(r.versaoModelo).toContain('via FakeProv');
  });
});
