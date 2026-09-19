import { describe, expect, it } from 'vitest';
import { extrairVereditoJuiz, promptJuiz, RUBRICA_VERSAO } from '../harness/prompts/juiz.js';

describe('rubrica do juiz (rubrica-v2: abstenção)', () => {
  it('a rubrica está versionada como v2', () => {
    expect(RUBRICA_VERSAO).toBe('rubrica-v2');
  });

  it('o prompt oferece abstenção como opção e explica o critério', () => {
    const p = promptJuiz('texto oficial', 'trecho');
    expect(p).toContain('abstencao');
    expect(p).toContain('NÃO apresentou');
  });

  it('extrai os quatro vereditos, inclusive abstenção com acento', () => {
    expect(extrairVereditoJuiz('sim')).toBe('sim');
    expect(extrairVereditoJuiz('Parcial.')).toBe('parcial');
    expect(extrairVereditoJuiz('não')).toBe('nao');
    expect(extrairVereditoJuiz('abstenção')).toBe('abstencao');
    expect(extrairVereditoJuiz('Abstencao')).toBe('abstencao');
    expect(extrairVereditoJuiz('talvez')).toBeNull();
  });
});
