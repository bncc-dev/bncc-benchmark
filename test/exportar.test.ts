import { describe, expect, it } from 'vitest';
import { calcularMetricas, montarExport, recorteA } from '../harness/lib/exportar.js';
import type { BancoItens, Item, Julgamento, RegistroBruto } from '../harness/lib/tipos.js';

function julgamento(parcial: Partial<Julgamento>): Julgamento {
  return {
    item_id: 'x-001',
    modelo: 'm1',
    parafrase: 0,
    modo: 'seco',
    tarefa: 'A',
    tipo: 'real',
    estrato: { etapa: 'EF', modulo: 'bncc-2018' },
    avaliador_versao: '2',
    veredito: 'correto',
    ...parcial,
  };
}

describe('calcularMetricas', () => {
  it('nota composta é a média das cinco dimensões', () => {
    const js: Julgamento[] = [
      julgamento({ tarefa: 'B', tipo: 'real', veredito: 'correto' }), // B reais 100%
      julgamento({ tarefa: 'B', tipo: 'falso-extensao', antivexame_categoria: 'limpo', veredito: 'correto' }), // invenção pura 0%
      julgamento({ tarefa: 'A', veredito: 'fiel_exato' }), // A fiel 100%
      julgamento({ tarefa: 'D', veredito: 'incorreto' }), // D 0%
      julgamento({
        tarefa: 'C',
        veredito: 'avaliado',
        codigos_citados: [
          { codigo: 'EF01MA01', formaValida: true, existe: true, texto: 'ok' },
          { codigo: 'EF01MA99', formaValida: true, existe: false },
        ],
      }), // C texto ok 50%
    ];
    const m = calcularMetricas(js, 1.5);
    expect(m.nota).toBeCloseTo(((1 + 1 + 1 + 0 + 0.5) / 5) * 100, 5);
    expect(m.invencao_pura).toBe(0);
    expect(m.c_inventados).toBe(0.5);
    expect(m.custo_usd).toBe(1.5);
  });

  it('separa invenção pura (limpo) de confusão-derivado (derivado + cinzenta-federal), e resposta_invalida fica fora das taxas', () => {
    const js: Julgamento[] = [
      julgamento({ tarefa: 'B', tipo: 'falso-extensao', antivexame_categoria: 'limpo', veredito: 'incorreto' }),
      julgamento({ tarefa: 'B', tipo: 'falso-profundo', antivexame_categoria: 'derivado', veredito: 'incorreto' }),
      julgamento({ tarefa: 'B', tipo: 'falso-profundo', antivexame_categoria: 'cinzenta-federal', veredito: 'correto' }),
      julgamento({ tarefa: 'A', veredito: 'resposta_invalida' }),
      julgamento({ tarefa: 'A', veredito: 'fiel_exato' }),
    ];
    const m = calcularMetricas(js, 0);
    expect(m.invencao_pura).toBe(1);
    expect(m.confusao_derivado).toBe(0.5);
    expect(m.a_fiel).toBe(1); // a inválida não entra no denominador
    expect(m.cortados).toBe(1);
  });
});

describe('montarExport', () => {
  const item: Item = {
    id: 'b-001',
    tarefa: 'B',
    tipo: 'falso-extensao',
    codigo: 'EF01MA99',
    gabarito: { tipo: 'existencia', existe: false },
    estrato: { etapa: 'EF', modulo: 'bncc-2018' },
    parafrases: ['O código EF01MA99 existe na BNCC?'],
  };
  const banco: BancoItens = {
    versao: 'v1',
    seed: 1,
    dataset_versao: 'dados-2026.07',
    gerado_em: '2026-07-15',
    distribuicao: {},
    itens: [item],
  };
  const bruto: RegistroBruto = {
    item_id: 'b-001',
    modelo: 'm1',
    versao_modelo: 'm1-v',
    parafrase: 0,
    modo: 'seco',
    mecanismo_grounding: null,
    prompt: item.parafrases[0],
    resposta: 'Sim, existe.',
    timestamp: '2026-07-16T00:00:00Z',
    custo_usd: 0.01,
    tokens: { entrada: 10, saida: 2 },
    dataset_versao: 'dados-2026.07',
    itens_versao: 'v1',
  };

  it('ordena por nota, ranqueia, ignora modelos fora do elenco e cura exemplo de invenção com a resposta real', () => {
    const js = [
      julgamento({ item_id: 'b-001', modelo: 'm1', tarefa: 'B', tipo: 'falso-extensao', antivexame_categoria: 'limpo', veredito: 'incorreto' }),
      julgamento({ item_id: 'b-001', modelo: 'fora-do-elenco', tarefa: 'B', tipo: 'falso-extensao', antivexame_categoria: 'limpo', veredito: 'correto' }),
    ];
    const exp = montarExport({
      rodada: 'r',
      versao: 'v9.9.9',
      banco,
      itens: new Map([[item.id, item]]),
      julgados: js,
      brutos: new Map([['m1', [bruto]]]),
      apresentacao: { m1: { nome: 'Modelo Um', empresa: 'ACME', tier: 'econômico' } },
    });
    expect(exp.modelos).toHaveLength(1);
    expect(exp.modelos[0].posicao).toBe(1);
    expect(exp.modelos[0].nome).toBe('Modelo Um');
    expect(exp.modelos[0].exemplos[0]).toMatchObject({ rotulo: 'invencao', resposta: 'Sim, existe.' });
    expect(exp.meta.total_respostas).toBe(1);
    expect(exp.meta.custo_total_usd).toBe(0.01);
    expect(exp.amostras.length).toBeGreaterThan(0);
  });

  it('negação de código real na A fica fora de fidelidade, alucinação e abstenção', () => {
    const base = { item_id: 'a-001', modelo: 'm1', tarefa: 'A' as const, tipo: 'real' as const };
    const m = calcularMetricas(
      [
        julgamento({ ...base, parafrase: 0, veredito: 'negacao' }),
        julgamento({ ...base, parafrase: 1, veredito: 'abstencao' }),
        julgamento({ ...base, parafrase: 2, veredito: 'inventado' }),
        julgamento({ ...base, item_id: 'a-002', parafrase: 0, veredito: 'fiel_exato' }),
      ],
      0,
    );
    expect(m.a_negacao).toBeCloseTo(0.25);
    expect(m.a_abstencao).toBeCloseTo(0.25);
    expect(m.a_aluc).toBeCloseTo(0.25);
    expect(m.a_fiel).toBeCloseTo(0.25);
  });

  it('recorteA reporta alucinação, fidelidade, negação e abstenção com o mesmo denominador', () => {
    const base = { modelo: 'm1', tarefa: 'A' as const, tipo: 'real' as const, parafrase: 0 };
    const js = [
      julgamento({ ...base, item_id: 'a-1', veredito: 'inventado' }),
      julgamento({ ...base, item_id: 'a-2', veredito: 'negacao' }),
      julgamento({ ...base, item_id: 'a-3', veredito: 'abstencao' }),
      julgamento({ ...base, item_id: 'a-4', veredito: 'fiel_exato' }),
      julgamento({ ...base, item_id: 'a-5', veredito: 'parcial' }),
      julgamento({ ...base, item_id: 'a-6', veredito: 'resposta_invalida' }), // fora do denominador
    ];
    const [linha] = recorteA(js, () => 'Computação 2022');
    expect(linha).toMatchObject({ rotulo: 'Computação 2022' });
    expect(linha.taxa).toBeCloseTo(0.2);
    expect(linha.negacao).toBeCloseTo(0.2);
    expect(linha.abstencao).toBeCloseTo(0.2);
    expect(linha.fiel).toBeCloseTo(0.2);
  });

  it('rotas separa o transporte batch do síncrono para a mesma versão servida', () => {
    const js = [julgamento({ item_id: 'b-001', modelo: 'm1', tarefa: 'B', tipo: 'real', veredito: 'correto' })];
    const exp = montarExport({
      rodada: 'r',
      versao: 'v9.9.9',
      banco,
      itens: new Map([[item.id, item]]),
      julgados: js,
      brutos: new Map([['m1', [bruto, { ...bruto, parafrase: 1, execucao: 'batch', lote_id: 'L1' }]]]),
      apresentacao: { m1: { nome: 'Modelo Um', empresa: 'ACME', tier: 'econômico' } },
    });
    expect(exp.modelos[0].rotas).toEqual({ 'm1-v': 1, 'm1-v (batch)': 1 });
  });
});
