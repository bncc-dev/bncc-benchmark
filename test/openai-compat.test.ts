import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErroProvedor } from '../harness/provedores/erro.js';
import { contarUso, criarProvedorOpenAiCompat } from '../harness/provedores/openai-compat.js';
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

describe('openai-compat: contagem de raciocínio (convenção: saída = total cobrado)', () => {
  it('na-saida: completion_tokens já inclui o raciocínio (OpenAI, Moonshot, OpenRouter)', () => {
    const uso = contarUso(
      { prompt_tokens: 10, completion_tokens: 100, completion_tokens_details: { reasoning_tokens: 80 } },
      'na-saida',
    );
    expect(uso).toEqual({ entrada: 10, saida: 100, reasoning: 80 });
  });

  it('fora-da-saida: reasoning_tokens vem à parte e soma à saída (xAI)', () => {
    const uso = contarUso(
      { prompt_tokens: 651, completion_tokens: 72, total_tokens: 1434, completion_tokens_details: { reasoning_tokens: 711 } },
      'fora-da-saida',
    );
    expect(uso).toEqual({ entrada: 651, saida: 783, reasoning: 711 });
  });

  it('nao-informado: raciocínio é a diferença para total_tokens (Gemini compatível)', () => {
    const uso = contarUso({ prompt_tokens: 18, completion_tokens: 219, total_tokens: 1050 }, 'nao-informado');
    expect(uso).toEqual({ entrada: 18, saida: 1032, reasoning: 813 });
  });

  it('nao-informado sem total_tokens não inventa raciocínio', () => {
    expect(contarUso({ prompt_tokens: 5, completion_tokens: 7 }, 'nao-informado')).toEqual({ entrada: 5, saida: 7 });
  });
});
