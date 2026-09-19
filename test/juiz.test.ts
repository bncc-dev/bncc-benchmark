import { describe, expect, it } from 'vitest';
import { extrairVereditoJuiz, promptJuiz, RUBRICA_VERSAO } from '../harness/prompts/juiz.js';

describe('rubrica do juiz (rubrica-v3: abstenção e negação)', () => {
  it('a rubrica está versionada como v3', () => {
    expect(RUBRICA_VERSAO).toBe('rubrica-v3');
  });

  it('o prompt oferece abstenção como opção e explica o critério', () => {
    const p = promptJuiz('texto oficial', 'trecho');
    expect(p).toContain('abstencao');
    expect(p).toContain('negacao');
    expect(p).toContain('Decida nesta ordem');
  });

  it('extrai os cinco vereditos, inclusive os acentuados', () => {
    expect(extrairVereditoJuiz('sim')).toBe('sim');
    expect(extrairVereditoJuiz('Parcial.')).toBe('parcial');
    expect(extrairVereditoJuiz('não')).toBe('nao');
    expect(extrairVereditoJuiz('abstenção')).toBe('abstencao');
    expect(extrairVereditoJuiz('Abstencao')).toBe('abstencao');
    expect(extrairVereditoJuiz('negação')).toBe('negacao');
    expect(extrairVereditoJuiz('Negacao.')).toBe('negacao');
    expect(extrairVereditoJuiz('talvez')).toBeNull();
  });
});

describe('guarda da abstenção: texto candidato', () => {
  it('acha o texto atribuído com ressalva (aspas, blockquote, dois-pontos, código na frente)', async () => {
    const { extrairTextoCandidato } = await import('../harness/lib/avaliacao.js');
    expect(
      extrairTextoCandidato('Não tenho certeza. Pelo que recordo, o enunciado é:\n\n> "Comparar os argumentos utilizados em diferentes textos que abordam um mesmo tema."'),
    ).toMatch(/^Comparar os argumentos/);
    expect(
      extrairTextoCandidato('Não garanto, mas seria "Planejar e produzir, com a orientação do professor, pequenos textos poéticos e listas."'),
    ).toMatch(/^Planejar e produzir/);
    expect(
      extrairTextoCandidato('O enunciado oficial é:\n> **EM13LP08:** Analisar diferentes práticas e produtos culturais de nicho, promovendo o respeito.'),
    ).toMatch(/^Analisar diferentes práticas/);
  });

  it('texto oferecido para OUTRO código não é candidato do código pedido', async () => {
    const { extrairTextoCandidato } = await import('../harness/lib/avaliacao.js');
    const r =
      'O código EM13CO08 não existe. Se você procurava pela habilidade **EM13LP08**, o texto oficial é: "Analisar, de forma crítica, os elementos que compõem a comunicação e a expressão em diferentes situações."';
    expect(extrairTextoCandidato(r, 'EM13CO08')).toBeNull();
    expect(extrairTextoCandidato(r)).toMatch(/^Analisar, de forma crítica/); // sem código pedido, não filtra
    const proprio =
      'Esse código é do Complemento de Computação.\n\n> **EF03CO04 - Utilizar artefatos computacionais para criar conteúdos digitais, de forma individual e colaborativa.**';
    expect(extrairTextoCandidato(proprio, 'EF03CO04')).toMatch(/^Utilizar artefatos/);
  });

  it('recusa honesta com contexto não tem candidato', async () => {
    const { extrairTextoCandidato } = await import('../harness/lib/avaliacao.js');
    expect(
      extrairTextoCandidato(
        'Não consigo confirmar com segurança o enunciado literal da **EM13CO08** sem consultar a fonte. Essa habilidade consta da seção do Ensino Médio do documento "Computação — Complemento à BNCC". Se você enviar o PDF, posso transcrever.',
      ),
    ).toBeNull();
    expect(
      extrairTextoCandidato('Não tenho acesso ao texto exato. Recomendo consultar:\n1. O site oficial do MEC: www.mec.gov.br\n2. A plataforma oficial da BNCC: basenacionalcomum.mec.gov.br'),
    ).toBeNull();
  });
});
