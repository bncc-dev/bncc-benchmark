import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  commitHarness,
  registrarAvaliacao,
  registrarExecucao,
  type EntradaExecucao,
  type Manifesto,
} from '../harness/lib/manifesto.js';
import { MODELOS } from '../harness/provedores/registro.js';

const dir = mkdtempSync(join(tmpdir(), 'bncc-manifesto-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function entrada(momento: string): EntradaExecucao {
  return {
    executado_em: momento,
    modo: 'seco',
    harness_commit: 'abc1234',
    flags: { limite: 3, parafrases: 3 },
    dataset_versao: 'dados-2026.07',
    itens_versao: 'v1',
    modelos: [
      {
        id: 'gpt-sol',
        def: MODELOS['gpt-sol'],
        resultado: { registros: 9, chamadas_novas: 9, do_cache: 0, custo_usd: 0.1, incompletas: 0 },
      },
    ],
  };
}

describe('manifesto da rodada', () => {
  it('append preserva entradas anteriores e guarda a def completa (com pins)', () => {
    const caminho = join(dir, 'manifesto.json');
    registrarExecucao(caminho, 'teste', entrada('2026-07-15T10:00:00Z'));
    registrarExecucao(caminho, 'teste', entrada('2026-07-15T11:00:00Z'));
    registrarAvaliacao(caminho, 'teste', {
      avaliado_em: '2026-07-15T12:00:00Z',
      harness_commit: 'abc1234',
      avaliador_versao: '2',
      rubrica_versao: 'rubrica-v1',
      juiz: { id: 'haiku-bedrock', modelo: 'us.anthropic.claude-haiku-4-5-20251001-v1:0' },
      julgados: 27,
      pendentes_a: 2,
      pendentes_c: 5,
      juiz_chamadas: 7,
      juiz_custo_usd: 0.003,
    });

    const m = JSON.parse(readFileSync(caminho, 'utf8')) as Manifesto;
    expect(m.rodada).toBe('teste');
    expect(m.execucoes).toHaveLength(2);
    expect(m.avaliacoes).toHaveLength(1);
    // Auditoria dos pins: a def registrada carrega o corpoExtra do momento.
    expect(m.execucoes[0].modelos[0].def.corpoExtra).toEqual({
      provider: { order: ['OpenAI'], allow_fallbacks: false },
    });
    expect(m.execucoes[0].executado_em).toBe('2026-07-15T10:00:00Z');
    expect(m.execucoes[1].executado_em).toBe('2026-07-15T11:00:00Z');
  });

  it('commitHarness devolve hash no repo e fallback fora dele', () => {
    expect(commitHarness()).toMatch(/^[0-9a-f]{7,}$/);
    expect(commitHarness(tmpdir())).toBe('desconhecido');
  });
});
