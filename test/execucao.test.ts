import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { CacheDisco } from '../harness/lib/cache.js';
import { executarBateria, selecionarBalanceado } from '../harness/lib/execucao.js';
import { gerarBanco } from '../harness/lib/gerador.js';
import { ErroProvedor } from '../harness/provedores/erro.js';
import type { DefModelo, Provedor } from '../harness/provedores/tipos.js';

const banco = gerarBanco(20260712);
const dirTemporario = mkdtempSync(join(tmpdir(), 'bncc-benchmark-teste-'));
afterAll(() => rmSync(dirTemporario, { recursive: true, force: true }));

const DEF: DefModelo = {
  id: 'fake',
  provedor: 'anthropic',
  modelo: 'fake-1',
  envKey: 'FAKE_KEY',
  precos: { entrada: 1, saida: 5 },
  suportaGrounded: true,
};

function provedorFake(contador: { chamadas: number }): Provedor {
  return {
    id: 'fake',
    async completar({ prompt }) {
      contador.chamadas++;
      return {
        texto: `resposta para: ${prompt.slice(0, 40)}`,
        versaoModelo: 'fake-1',
        finishReason: 'fim',
        tokens: { entrada: 100, saida: 20 },
        custoUsd: 0.0002,
        toolsChamadas: 0,
        mecanismoGrounding: null,
      };
    },
  };
}

describe('executarBateria', () => {
  it('produz registros no schema, com carimbo de dataset e itens', async () => {
    const itens = selecionarBalanceado(banco.itens, 4);
    const contador = { chamadas: 0 };
    const resultado = await executarBateria({
      banco,
      itens,
      def: DEF,
      provedor: provedorFake(contador),
      modo: 'seco',
      parafrases: 2,
      cache: new CacheDisco(join(dirTemporario, 'c1')),
    });

    expect(resultado.registros.length).toBe(8); // 4 itens × 2 paráfrases
    expect(contador.chamadas).toBe(8);
    for (const r of resultado.registros) {
      expect(r.dataset_versao).toBe(banco.dataset_versao);
      expect(r.itens_versao).toBe('v1-rc');
      expect(r.modo).toBe('seco');
      expect(r.mecanismo_grounding).toBeNull();
      expect(r.prompt.length).toBeGreaterThan(10);
      expect(r.custo_usd).toBeGreaterThan(0);
    }
  });

  it('segunda execução idêntica sai 100% do cache (checkpoint)', async () => {
    const itens = selecionarBalanceado(banco.itens, 4);
    const cache = new CacheDisco(join(dirTemporario, 'c2'));
    const contador = { chamadas: 0 };
    const base = { banco, itens, def: DEF, modo: 'seco' as const, parafrases: 2, cache };

    const primeira = await executarBateria({ ...base, provedor: provedorFake(contador) });
    expect(primeira.chamadas).toBe(8);
    expect(primeira.doCache).toBe(0);

    const segunda = await executarBateria({ ...base, provedor: provedorFake(contador) });
    expect(segunda.chamadas).toBe(0);
    expect(segunda.doCache).toBe(8);
    expect(segunda.custoUsd).toBe(0);
    expect(contador.chamadas).toBe(8); // nenhuma chamada nova
    expect(segunda.registros).toEqual(primeira.registros);
  });

  it('RB-3: maxTokens diferente NÃO reutiliza o cache', async () => {
    const itens = selecionarBalanceado(banco.itens, 2);
    const cache = new CacheDisco(join(dirTemporario, 'c-rb3'));
    const contador = { chamadas: 0 };
    const base = { banco, itens, def: DEF, modo: 'seco' as const, parafrases: 1, cache };

    await executarBateria({ ...base, provedor: provedorFake(contador), maxTokens: 256 });
    const segunda = await executarBateria({
      ...base,
      provedor: provedorFake(contador),
      maxTokens: 1024,
    });
    expect(segunda.doCache).toBe(0); // chave inclui maxTokens
    expect(contador.chamadas).toBe(4);

    const terceira = await executarBateria({
      ...base,
      provedor: provedorFake(contador),
      maxTokens: 1024,
    });
    expect(terceira.doCache).toBe(2); // mesma config volta a acertar o cache
  });

  it('escalada: resposta cortada por max_tokens ganha retry com o dobro do orçamento', async () => {
    const itens = selecionarBalanceado(banco.itens, 1);
    const orcamentosVistos: number[] = [];
    const cortadorUmaVez: Provedor = {
      id: 'fake',
      async completar({ maxTokens }) {
        orcamentosVistos.push(maxTokens);
        const cortada = orcamentosVistos.length === 1;
        return {
          texto: cortada ? 'resposta pela met' : 'resposta completa',
          versaoModelo: 'fake-1',
          finishReason: cortada ? 'max_tokens' : 'fim',
          tokens: { entrada: 100, saida: 20 },
          custoUsd: 0.0002,
          toolsChamadas: 0,
          mecanismoGrounding: null,
        };
      },
    };
    const resultado = await executarBateria({
      banco,
      itens,
      def: { ...DEF, maxTokensPadrao: 2048 },
      provedor: cortadorUmaVez,
      modo: 'seco',
      parafrases: 1,
      cache: new CacheDisco(join(dirTemporario, 'c-escalada')),
      maxTokens: 1024,
    });
    expect(orcamentosVistos).toEqual([2048, 4096]); // padrão do modelo vence a config; corte dobra
    expect(resultado.registros[0].finish_reason).toBe('fim');
    expect(resultado.registros[0].resposta).toBe('resposta completa');
    // Auditoria: o bruto registra o orçamento efetivo da tentativa gravada.
    expect(resultado.registros[0].max_tokens).toBe(4096);
  });

  it('sem escalada, o bruto registra o orçamento base', async () => {
    const itens = selecionarBalanceado(banco.itens, 1);
    const resultado = await executarBateria({
      banco,
      itens,
      def: { ...DEF, maxTokensPadrao: 2048 },
      provedor: provedorFake({ chamadas: 0 }),
      modo: 'seco',
      parafrases: 1,
      cache: new CacheDisco(join(dirTemporario, 'c-orc-base')),
      maxTokens: 1024,
    });
    expect(resultado.registros[0].max_tokens).toBe(2048);
  });

  it('erro de rede cru (ECONNRESET/terminated) também ganha retry', async () => {
    const itens = selecionarBalanceado(banco.itens, 1);
    let tentativas = 0;
    const redeInstavel: Provedor = {
      id: 'fake',
      async completar(chamada) {
        tentativas++;
        if (tentativas === 1) {
          throw new TypeError('terminated', { cause: { code: 'ECONNRESET' } });
        }
        if (tentativas === 2) {
          throw new TypeError('fetch failed');
        }
        return provedorFake({ chamadas: 0 }).completar(chamada);
      },
    };
    const resultado = await executarBateria({
      banco,
      itens,
      def: DEF,
      provedor: redeInstavel,
      modo: 'seco',
      parafrases: 1,
      cache: new CacheDisco(join(dirTemporario, 'c-rede')),
      esperaBaseMs: 1,
    });
    expect(tentativas).toBe(3);
    expect(resultado.registros).toHaveLength(1);
  });

  it('faz retry em erro transitório e desiste em erro permanente', async () => {
    const itens = selecionarBalanceado(banco.itens, 1);
    let tentativas = 0;
    const intermitente: Provedor = {
      id: 'fake',
      async completar(chamada) {
        tentativas++;
        if (tentativas < 3) throw new ErroProvedor(429, 'rate limit');
        return provedorFake({ chamadas: 0 }).completar(chamada);
      },
    };
    const resultado = await executarBateria({
      banco,
      itens,
      def: DEF,
      provedor: intermitente,
      modo: 'seco',
      parafrases: 1,
      cache: new CacheDisco(join(dirTemporario, 'c3')),
      esperaBaseMs: 1,
    });
    expect(tentativas).toBe(3);
    expect(resultado.registros.length).toBe(1);

    const permanente: Provedor = {
      id: 'fake',
      async completar() {
        throw new ErroProvedor(401, 'key inválida');
      },
    };
    await expect(
      executarBateria({
        banco,
        itens,
        def: DEF,
        provedor: permanente,
        modo: 'seco',
        parafrases: 1,
        cache: new CacheDisco(join(dirTemporario, 'c4')),
        esperaBaseMs: 1,
      }),
    ).rejects.toThrow('key inválida');
  });
});

describe('selecionarBalanceado', () => {
  it('cobre as tarefas por igual no limite', () => {
    const dez = selecionarBalanceado(banco.itens, 10);
    const tarefas = new Set(dez.map((i) => i.tarefa));
    expect(dez.length).toBe(10);
    expect(tarefas.size).toBe(4); // A, B, C e D presentes
  });
});
