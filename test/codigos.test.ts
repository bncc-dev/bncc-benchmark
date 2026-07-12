import { describe, expect, it } from 'vitest';
import {
  analisar,
  detectarLacunas,
  extrairCodigos,
  prefixosInexistentes,
} from '../harness/lib/codigos.js';
import { todosCodigos } from '../harness/lib/gabarito.js';

describe('analisar', () => {
  it('cobre as 7 gramáticas', () => {
    expect(analisar('EI02TS01')).toMatchObject({
      etapa: 'EI',
      modulo: 'bncc-2018',
      prefixo: 'EI02TS',
      sequencia: 1,
      componente: 'TS',
    });
    expect(analisar('EI03CO04')).toMatchObject({
      etapa: 'EI',
      modulo: 'computacao-2022',
      prefixo: 'EI03CO',
      componente: 'CO',
    });
    expect(analisar('EF67LP08')).toMatchObject({
      etapa: 'EF',
      modulo: 'bncc-2018',
      prefixo: 'EF67LP',
      sequencia: 8,
    });
    expect(analisar('EF05CO11')).toMatchObject({
      etapa: 'EF',
      modulo: 'computacao-2022',
      prefixo: 'EF05CO',
      sequencia: 11,
    });
    expect(analisar('EM13LGG103')).toMatchObject({
      etapa: 'EM',
      modulo: 'bncc-2018',
      prefixo: 'EM13LGG1',
      sequencia: 3,
      componente: 'LGG',
    });
    expect(analisar('EM13LP01')).toMatchObject({ prefixo: 'EM13LP', componente: 'LP' });
    expect(analisar('EM13CO26')).toMatchObject({ modulo: 'computacao-2022', componente: 'CO' });
  });

  it('é case-insensitive e tolera espaços', () => {
    expect(analisar(' ef67lp08 ')?.codigo).toBe('EF67LP08');
  });

  it('rejeita formas inválidas', () => {
    expect(analisar('EF05CO011')).toBeNull(); // typo do documento oficial (3 dígitos)
    expect(analisar('EF10MA01')).toBeNull(); // ano 10 não existe
    expect(analisar('EI04TS01')).toBeNull(); // grupo etário 04 não existe
    expect(analisar('EF67XX08')).toBeNull(); // componente inexistente
    expect(analisar('EM14LGG103')).toBeNull(); // EM é sempre 13
    expect(analisar('banana')).toBeNull();
  });

  it('todo código do dataset casa com alguma gramática', () => {
    for (const c of todosCodigos()) {
      expect(analisar(c), c).not.toBeNull();
    }
  });
});

describe('detectarLacunas', () => {
  it('acha buracos internos e extensões', () => {
    const { internas, extensoes } = detectarLacunas(['EF67LP01', 'EF67LP02', 'EF67LP04']);
    expect(internas).toEqual(['EF67LP03']);
    expect(extensoes).toEqual(['EF67LP05']);
  });

  it('nenhuma lacuna detectada existe no dataset (são falsos de verdade)', () => {
    const codigos = new Set(todosCodigos());
    const { internas, extensoes } = detectarLacunas(codigos);
    for (const falso of [...internas, ...extensoes]) {
      expect(codigos.has(falso), falso).toBe(false);
    }
  });

  it('o dataset real NÃO tem buracos internos: numeração contígua (DECISOES D8)', () => {
    const { internas, extensoes } = detectarLacunas(todosCodigos());
    expect(internas).toEqual([]);
    // As armadilhas reais são as bordas: uma extensão por prefixo existente.
    expect(extensoes.length).toBeGreaterThan(100);
  });
});

describe('prefixosInexistentes', () => {
  it('inclui combinações plausíveis sem código e exclui as existentes', () => {
    const prefixos = prefixosInexistentes(todosCodigos());
    expect(prefixos).not.toContain('EF67LP');
    expect(prefixos).not.toContain('EI02TS');
    // Arte no Fundamental numera por blocos (EF15AR/EF69AR); ano isolado não existe.
    expect(prefixos).toContain('EF01AR');
  });
});

describe('extrairCodigos', () => {
  it('extrai códigos de texto livre, sem duplicar', () => {
    const texto =
      'As habilidades EF67LP08 e EF67LP08 tratam disso; veja também (EM13LGG103) e a ei02ts01.';
    expect(extrairCodigos(texto).map((c) => c.codigo)).toEqual([
      'EF67LP08',
      'EM13LGG103',
      'EI02TS01',
    ]);
  });

  it('captura a forma com typo e marca como forma inválida', () => {
    const achados = extrairCodigos('Conforme EF05CO011, os alunos...');
    expect(achados).toEqual([{ codigo: 'EF05CO011', formaValida: false }]);
  });

  it('captura códigos de Computação como forma válida', () => {
    const achados = extrairCodigos('Use EF05CO11 e EM13CO01.');
    expect(achados.every((c) => c.formaValida)).toBe(true);
  });
});
