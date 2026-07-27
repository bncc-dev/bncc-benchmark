import { describe, expect, it } from 'vitest';
import { calcularMetricas, montarExport } from '../harness/lib/exportar.js';
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
});
