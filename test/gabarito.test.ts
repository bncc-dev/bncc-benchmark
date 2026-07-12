import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CAMINHO_COMPUTACAO,
  existeCodigo,
  infoDataset,
  obter,
  todas,
} from '../harness/lib/gabarito.js';

describe('gabarito unificado', () => {
  it('tem 1.721 aprendizagens (1.580 BNCC-2018 + 141 Computação)', () => {
    const itens = todas();
    expect(itens.length).toBe(1721);
    expect(itens.filter((a) => a.estrato.modulo === 'bncc-2018').length).toBe(1580);
    expect(itens.filter((a) => a.estrato.modulo === 'computacao-2022').length).toBe(141);
  });

  it('Computação: 11 EI + 104 EF + 26 EM', () => {
    const co = todas().filter((a) => a.estrato.modulo === 'computacao-2022');
    expect(co.filter((a) => a.estrato.etapa === 'EI').length).toBe(11);
    expect(co.filter((a) => a.estrato.etapa === 'EF').length).toBe(104);
    expect(co.filter((a) => a.estrato.etapa === 'EM').length).toBe(26);
  });

  it('existeCodigo cobre BNCC-2018 e Computação, case-insensitive', () => {
    expect(existeCodigo('EF67LP08')).toBe(true);
    expect(existeCodigo('ef67lp08')).toBe(true);
    expect(existeCodigo('EI02TS01')).toBe(true);
    expect(existeCodigo('EM13LGG103')).toBe(true);
    expect(existeCodigo('EF05CO11')).toBe(true); // Computação, forma canônica
    expect(existeCodigo('EF05CO011')).toBe(false); // typo do documento oficial
    expect(existeCodigo('EF99ZZ99')).toBe(false);
  });

  it('obter devolve texto não vazio e estrato coerente', () => {
    const a = obter('EF05CO11');
    expect(a?.texto.length).toBeGreaterThan(20);
    expect(a?.estrato).toEqual({ etapa: 'EF', modulo: 'computacao-2022', componente: 'CO' });
  });

  it('o arquivo vendorizado de Computação bate com a proveniência registrada', () => {
    const sha = createHash('sha256').update(readFileSync(CAMINHO_COMPUTACAO)).digest('hex');
    expect(sha).toBe('7863d5a4bc21236e285e3f7d30f0f06182c50573bc61694899cc2f9207b65ad3');
  });

  it('carimba a versão do dataset', () => {
    const info = infoDataset();
    expect(info.dataset_versao).toMatch(/^dados-\d{4}\.\d{2}/);
    expect(info.total).toBe(1721);
  });
});
