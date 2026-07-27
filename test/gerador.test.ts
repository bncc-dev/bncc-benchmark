import { describe, expect, it } from 'vitest';
import { analisar } from '../harness/lib/codigos.js';
import { existeCodigo, obter } from '../harness/lib/gabarito.js';
import { DISTRIBUICAO_D2, gerarBanco } from '../harness/lib/gerador.js';

const banco = gerarBanco(20260712);

describe('invariantes do banco de itens', () => {
  it('nenhum código falso existe no dataset', () => {
    for (const item of banco.itens) {
      if (item.gabarito.tipo === 'existencia' && !item.gabarito.existe) {
        expect(existeCodigo(item.codigo!), item.codigo).toBe(false);
      }
    }
  });

  it('todo código real existe no dataset, com gabarito fiel', () => {
    for (const item of banco.itens) {
      if (item.gabarito.tipo === 'existencia' && item.gabarito.existe) {
        expect(existeCodigo(item.codigo!), item.codigo).toBe(true);
      }
      if (item.gabarito.tipo === 'texto') {
        expect(obter(item.codigo!)?.texto).toBe(item.gabarito.texto);
      }
      if (item.gabarito.tipo === 'codigo') {
        expect(existeCodigo(item.gabarito.codigo)).toBe(true);
        expect(obter(item.gabarito.codigo)?.texto).toBe(item.texto);
      }
      if (item.gabarito.tipo === 'lista') {
        expect(item.gabarito.codigosValidos.length).toBeGreaterThanOrEqual(3);
        for (const c of item.gabarito.codigosValidos) {
          expect(existeCodigo(c), c).toBe(true);
        }
      }
    }
  });

  it('a distribuição bate com a D2', () => {
    const d = banco.distribuicao;
    expect(d['A:real']).toBe(DISTRIBUICAO_D2.A);
    expect(d['B:real']).toBe(DISTRIBUICAO_D2.B_reais);
    expect(d['B:falso-extensao']).toBe(DISTRIBUICAO_D2.B_falso_extensao);
    expect(d['B:falso-profundo']).toBe(DISTRIBUICAO_D2.B_falso_profundo);
    expect(d['B:falso-combinacao']).toBe(DISTRIBUICAO_D2.B_falso_combinacao);
    expect(d['C:real']).toBe(DISTRIBUICAO_D2.C);
    expect(d['D:real']).toBe(DISTRIBUICAO_D2.D);
    expect(d['B:especial']).toBe(2);
    expect(d['A:especial']).toBe(8);
  });

  it('Computação está super-representada (D2: ~20%)', () => {
    const co = banco.itens.filter((i) => i.estrato.modulo === 'computacao-2022').length;
    expect(co / banco.itens.length).toBeGreaterThan(0.15);
  });

  it('todo item tem 2-3 paráfrases e id único', () => {
    const ids = new Set<string>();
    for (const item of banco.itens) {
      expect(item.parafrases.length).toBeGreaterThanOrEqual(2);
      expect(item.parafrases.length).toBeLessThanOrEqual(3);
      expect(ids.has(item.id), item.id).toBe(false);
      ids.add(item.id);
    }
  });

  it('todo falso plausível tem anti-vexame registrado', () => {
    for (const item of banco.itens) {
      if (item.tipo.startsWith('falso-')) {
        expect(item.verificacao_antivexame, item.id).toBeDefined();
      }
    }
  });

  it('falsos de borda e profundos têm gramática válida (plausibilidade)', () => {
    for (const item of banco.itens) {
      if (item.tipo.startsWith('falso-')) {
        expect(analisar(item.codigo!), item.codigo).not.toBeNull();
      }
    }
  });

  it('mesma seed gera o mesmo banco (determinismo)', () => {
    const outra = gerarBanco(20260712);
    expect(outra.itens).toEqual(banco.itens);
    expect(outra.distribuicao).toEqual(banco.distribuicao);
  });

  // A propriedade é genérica ("seeds distintas produzem bancos distintos") e por
  // isso é verificada com seeds arbitrárias. Usar aqui a seed real do held-out
  // publicaria a receita dele: o gerador é determinístico e este arquivo é
  // público. A seed verdadeira vive só em SEED_HELDOUT no .env.
  it('seed diferente gera banco diferente (o held-out não é derivável do público)', () => {
    const outroBanco = gerarBanco(1);
    const codigosPublicos = new Set(banco.itens.map((i) => i.codigo).filter(Boolean));
    const codigosOutros = outroBanco.itens.map((i) => i.codigo).filter(Boolean);
    const repetidos = codigosOutros.filter((c) => codigosPublicos.has(c));
    // Alguma interseção é estatisticamente esperada; identidade total não.
    expect(repetidos.length).toBeLessThan(codigosOutros.length);
    expect(outroBanco.itens).not.toEqual(banco.itens);
    expect(gerarBanco(2).itens).not.toEqual(outroBanco.itens);
  });

  it('inclui os itens especiais do typo (D6)', () => {
    const typo = banco.itens.find((i) => i.codigo === 'EF05CO011');
    const canonico = banco.itens.find((i) => i.codigo === 'EF05CO11' && i.tipo === 'especial');
    expect(typo?.gabarito).toEqual({ tipo: 'existencia', existe: false });
    expect(canonico?.gabarito).toEqual({ tipo: 'existencia', existe: true });
  });
});
