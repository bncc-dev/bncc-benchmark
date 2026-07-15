import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BancoItens } from '../harness/lib/tipos.js';

const banco = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../itens/itens-v1.json'), 'utf8'),
) as BancoItens;

describe('itens-v1 congelado (adjudicação D10 aplicada)', () => {
  const falsos = banco.itens.filter((i) => i.tipo.startsWith('falso-'));

  it('versão v1, 300 itens, 60 falsos', () => {
    expect(banco.versao).toBe('v1');
    expect(banco.itens.length).toBe(300);
    expect(falsos.length).toBe(60);
  });

  it('nenhum falso pendente; todos com categoria, fontes e assinatura', () => {
    for (const item of falsos) {
      const v = item.verificacao_antivexame!;
      expect(v.status, item.id).toBe('ok');
      expect(['limpo', 'derivado', 'cinzenta-federal']).toContain(v.categoria);
      expect(v.por).toBeTruthy();
      expect(v.verificado_em).toBeTruthy();
      if (v.categoria !== 'limpo') expect(v.fontes!.length, item.id).toBeGreaterThan(0);
    }
  });

  it('placar da triagem de 15/jul: 24 limpos, 32 derivados, 4 cinzenta-federal', () => {
    const contagem: Record<string, number> = {};
    for (const item of falsos) {
      const c = item.verificacao_antivexame!.categoria!;
      contagem[c] = (contagem[c] ?? 0) + 1;
    }
    expect(contagem).toEqual({ limpo: 24, derivado: 32, 'cinzenta-federal': 4 });
  });

  it('os 4 federais têm a nota D10 de zona cinzenta', () => {
    const federais = falsos.filter(
      (i) => i.verificacao_antivexame!.categoria === 'cinzenta-federal',
    );
    expect(federais.map((i) => i.codigo).sort()).toEqual([
      'EF01LP30',
      'EF06CO11',
      'EF07CO12',
      'EM13MAT408',
    ]);
    for (const item of federais) {
      expect(item.nota).toContain('zona cinzenta federal');
    }
  });
});
