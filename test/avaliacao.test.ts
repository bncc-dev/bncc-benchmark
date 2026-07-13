import { describe, expect, it } from 'vitest';
import { agregadosEquivalentes, agregar } from '../harness/lib/agregacao.js';
import { detectarAbstencao, julgar } from '../harness/lib/avaliacao.js';
import { obter } from '../harness/lib/gabarito.js';
import { gerarBanco } from '../harness/lib/gerador.js';
import type { Item, Julgamento, RegistroBruto } from '../harness/lib/tipos.js';

const banco = gerarBanco(20260712);

function registroCom(item: Item, resposta: string): RegistroBruto {
  return {
    item_id: item.id,
    modelo: 'fake',
    versao_modelo: 'fake-1',
    parafrase: 0,
    modo: 'seco',
    mecanismo_grounding: null,
    prompt: item.parafrases[0],
    resposta,
    timestamp: '2026-07-12T12:00:00.000Z',
    custo_usd: 0.0001,
    tokens: { entrada: 100, saida: 20 },
    dataset_versao: banco.dataset_versao,
    itens_versao: banco.versao,
  };
}

const itemBReal = banco.itens.find((i) => i.tarefa === 'B' && i.tipo === 'real')!;
const itemBFalso = banco.itens.find((i) => i.tarefa === 'B' && i.tipo === 'falso-extensao')!;
const itemA = banco.itens.find((i) => i.tarefa === 'A' && i.tipo === 'real')!;
const itemC = banco.itens.find((i) => i.tarefa === 'C')!;
const itemD = banco.itens.find((i) => i.tarefa === 'D')!;

describe('tarefa B', () => {
  it('sim para código real é correto; sim para falso é incorreto', () => {
    expect(julgar(itemBReal, registroCom(itemBReal, 'Sim.')).veredito).toBe('correto');
    expect(julgar(itemBFalso, registroCom(itemBFalso, 'Sim, existe.')).veredito).toBe('incorreto');
    expect(julgar(itemBFalso, registroCom(itemBFalso, 'Não.')).veredito).toBe('correto');
  });

  it('abstenção tem precedência sobre o "não" das frases de incerteza', () => {
    expect(
      julgar(itemBReal, registroCom(itemBReal, 'Não tenho como verificar isso com segurança.'))
        .veredito,
    ).toBe('abstencao');
    // Negação seguida de recomendação de conferência ainda é abstenção (hedging).
    expect(
      julgar(itemBFalso, registroCom(itemBFalso, 'Não. Mas recomendo consultar o documento oficial.'))
        .veredito,
    ).toBe('abstencao');
    expect(julgar(itemBReal, registroCom(itemBReal, 'Talvez exista.')).veredito).toBe('abstencao');
  });
});

describe('tarefa D', () => {
  it('código certo, código errado e abstenção', () => {
    const certo = (itemD.gabarito as { tipo: 'codigo'; codigo: string }).codigo;
    expect(julgar(itemD, registroCom(itemD, `O código é ${certo}.`)).veredito).toBe('correto');
    expect(julgar(itemD, registroCom(itemD, 'É a habilidade EF67LP08.')).veredito).toBe(
      certo === 'EF67LP08' ? 'correto' : 'incorreto',
    );
    expect(julgar(itemD, registroCom(itemD, 'Não sei dizer o código de cabeça.')).veredito).toBe(
      'abstencao',
    );
  });
});

describe('tarefa A', () => {
  it('texto canônico (mesmo sem acentos) é fiel_exato', () => {
    const canonico = (itemA.gabarito as { tipo: 'texto'; texto: string }).texto;
    const semAcentos = canonico.normalize('NFD').replace(/[̀-ͯ]/g, '');
    expect(julgar(itemA, registroCom(itemA, `Claro! O texto é: "${semAcentos}"`)).veredito).toBe(
      'fiel_exato',
    );
  });

  it('texto integral de outra habilidade é texto_de_outra', () => {
    const outra = obter(itemA.codigo === 'EF67LP08' ? 'EF67LP07' : 'EF67LP08')!;
    expect(julgar(itemA, registroCom(itemA, `O texto oficial é: "${outra.texto}"`)).veredito).toBe(
      'texto_de_outra',
    );
  });

  it('resposta não trivial vai ao juiz; abstenção é abstenção', () => {
    expect(
      julgar(itemA, registroCom(itemA, 'Essa habilidade trata de leitura de gráficos em jornais.'))
        .veredito,
    ).toBe('pendente_juiz');
    expect(
      julgar(itemA, registroCom(itemA, 'Não tenho certeza; recomendo consultar o documento oficial.'))
        .veredito,
    ).toBe('abstencao');
  });
});

describe('tarefa C', () => {
  it('separa códigos existentes de inventados, com texto associado', () => {
    const valido = (itemC.gabarito as { tipo: 'lista'; codigosValidos: string[] }).codigosValidos[0];
    const textoValido = obter(valido)!.texto;
    const resposta = `Seguem as habilidades:\n1. ${valido}: ${textoValido}\n2. EF99MA99: Resolver problemas imaginários com números fantasmas.`;
    const j = julgar(itemC, registroCom(itemC, resposta));
    expect(j.veredito).toBe('avaliado');
    expect(j.codigos_citados).toHaveLength(2);
    const [citadoValido, citadoFalso] = j.codigos_citados!;
    expect(citadoValido).toMatchObject({ codigo: valido, existe: true, texto: 'ok' });
    expect(citadoFalso).toMatchObject({ codigo: 'EF99MA99', existe: false });
  });

  it('sem códigos e sem abstenção vira sem_codigos', () => {
    expect(julgar(itemC, registroCom(itemC, 'Há muitas habilidades interessantes.')).veredito).toBe(
      'sem_codigos',
    );
  });

  it('captura o typo EF05CO011 como forma inválida citada', () => {
    const j = julgar(itemC, registroCom(itemC, 'Recomendo a EF05CO011 para esse tema.'));
    expect(j.codigos_citados![0]).toMatchObject({
      codigo: 'EF05CO011',
      formaValida: false,
      existe: false,
    });
  });
});

describe('abstenção', () => {
  it('detecta frases comuns de incerteza', () => {
    expect(detectarAbstencao('Não tenho certeza sobre esse código.')).toBe(true);
    expect(detectarAbstencao('Sugiro consultar o documento oficial da BNCC.')).toBe(true);
    expect(detectarAbstencao('O texto é este aqui, com certeza.')).toBe(false);
  });
});

describe('agregação e verificação', () => {
  function julgadosSinteticos(): Julgamento[] {
    return [
      julgar(itemBReal, registroCom(itemBReal, 'Sim.')),
      julgar(itemBFalso, registroCom(itemBFalso, 'Sim, existe.')),
      julgar(itemD, registroCom(itemD, 'Não sei.')),
    ];
  }

  it('conta vereditos, estratos e alucinações', () => {
    const agregados = agregar(julgadosSinteticos(), 'teste', {
      dataset_versao: banco.dataset_versao,
      itens_versao: banco.versao,
    });
    const fake = agregados.por_modelo.fake.modo.seco;
    expect(fake.total_julgamentos).toBe(3);
    expect(fake.tarefas.B['veredito:correto']).toBe(1);
    expect(fake.tarefas.B['veredito:incorreto']).toBe(1);
    expect(fake.tarefas.D['veredito:abstencao']).toBe(1);
    // O falso aceito é alucinação no estrato do item falso.
    const estratoFalso = fake.estratos[itemBFalso.estrato.modulo];
    expect(estratoFalso.alucinacoes).toBeGreaterThanOrEqual(1);
  });

  it('agregadosEquivalentes ignora timestamp e pega adulteração', () => {
    const meta = { dataset_versao: banco.dataset_versao, itens_versao: banco.versao };
    const a = agregar(julgadosSinteticos(), 'teste', meta);
    const b = { ...agregar(julgadosSinteticos(), 'teste', meta), gerado_em: 'outro-momento' };
    expect(agregadosEquivalentes(a, b)).toBe(true);

    const adulterado = JSON.parse(JSON.stringify(a)) as typeof a;
    adulterado.por_modelo.fake.modo.seco.tarefas.B['veredito:incorreto'] = 0;
    expect(agregadosEquivalentes(a, adulterado)).toBe(false);
  });
});
