import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { gravarBrutos, lerBrutos, mesclarBrutos } from '../harness/lib/brutos.js';
import type { RegistroBruto } from '../harness/lib/tipos.js';

const dir = mkdtempSync(join(tmpdir(), 'bncc-brutos-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function registro(item: string, parafrase: number, resposta = 'x'): RegistroBruto {
  return {
    item_id: item,
    modelo: 'fake',
    versao_modelo: 'fake-1',
    parafrase,
    modo: 'seco',
    mecanismo_grounding: null,
    prompt: 'p',
    resposta,
    timestamp: '2026-07-13T00:00:00.000Z',
    custo_usd: 0,
    tokens: { entrada: 1, saida: 1 },
    dataset_versao: 'dados-2026.07',
    itens_versao: 'v1-rc',
  };
}

describe('RB-10: brutos nunca encolhem', () => {
  it('re-run parcial preserva os registros da bateria completa', () => {
    const arquivo = join(dir, 'brutos-fake-seco.jsonl');
    const bateria = [registro('a-001', 0), registro('a-001', 1), registro('b-001', 0)];
    gravarBrutos(arquivo, bateria);

    const debug = [registro('a-001', 0, 'nova resposta')];
    const balanco = gravarBrutos(arquivo, debug);

    expect(balanco.total).toBe(3);
    expect(balanco.preservados).toBe(2);
    const finais = lerBrutos(arquivo);
    expect(finais).toHaveLength(3);
    expect(finais.find((r) => r.item_id === 'a-001' && r.parafrase === 0)?.resposta).toBe(
      'nova resposta',
    );
    expect(finais.find((r) => r.item_id === 'b-001')).toBeDefined();
  });

  it('mesclarBrutos ordena estável e substitui por chave', () => {
    const m = mesclarBrutos([registro('b-001', 1), registro('a-001', 0)], [registro('a-001', 1)]);
    expect(m.map((r) => `${r.item_id}/${r.parafrase}`)).toEqual(['a-001/0', 'a-001/1', 'b-001/1']);
  });
});
