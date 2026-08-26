import { describe, expect, it } from 'vitest';
import { resumirEstudo } from '../harness/lib/estudo.js';
import type { Julgamento, Modo, Veredito } from '../harness/lib/tipos.js';

function j(item: string, modo: Modo, veredito: Veredito, extra: Partial<Julgamento> = {}): Julgamento {
  return {
    item_id: item,
    modelo: 'm',
    parafrase: 0,
    modo,
    tarefa: 'D',
    tipo: 'real',
    estrato: { etapa: 'EF', modulo: 'bncc-2018', componente: 'LP' },
    avaliador_versao: '2',
    veredito,
    ...extra,
  };
}

describe('resumirEstudo (D14)', () => {
  it('delta pareado negativo com IC que exclui zero quando a fonte zera os erros', () => {
    const julgados: Julgamento[] = [];
    for (let i = 0; i < 40; i++) {
      julgados.push(j(`d-${i}`, 'seco', i % 2 === 0 ? 'incorreto' : 'correto'));
      julgados.push(j(`d-${i}`, 'grounded', 'correto', { tools_chamadas: 1 }));
    }
    const r = resumirEstudo(julgados, 't', { reamostras: 200 }).por_modelo.m;
    expect(r.condicoes.seco?.D.taxa).toBe(0.5);
    expect(r.condicoes.grounded?.D.taxa).toBe(0);
    expect(r.condicoes.grounded?.D.limite_superior_95_se_zero).toBeCloseTo(3 / 40);
    const d = r.deltas.grounded!.D;
    expect(d.pares).toBe(40);
    expect(d.delta).toBe(-0.5);
    expect(d.ic95![1]).toBeLessThan(0);
    expect(d.discordantes).toEqual({ so_seco: 20, so_condicao: 0 });
    expect(r.fonte.grounded).toMatchObject({ total: 40, nao_chamou: 0, chamou_e_errou: 0 });
  });

  it('só pareia itens presentes nas duas condições; B conta só falsos; inválidos ficam fora', () => {
    const julgados: Julgamento[] = [
      j('b-1', 'seco', 'incorreto', { tarefa: 'B', tipo: 'falso-extensao' }),
      j('b-2', 'seco', 'incorreto', { tarefa: 'B', tipo: 'real' }), // real: fora do denominador
      j('b-1', 'contexto', 'correto', { tarefa: 'B', tipo: 'falso-extensao', tools_chamadas: 0 }),
      j('b-3', 'contexto', 'resposta_invalida', { tarefa: 'B', tipo: 'falso-profundo', tools_chamadas: 0 }),
    ];
    const r = resumirEstudo(julgados, 't', { reamostras: 50 }).por_modelo.m;
    expect(r.condicoes.seco?.B).toMatchObject({ n: 1, eventos: 1 });
    expect(r.condicoes.contexto?.B).toMatchObject({ n: 1, eventos: 0 });
    expect(r.deltas.contexto!.B.pares).toBe(1);
    expect(r.respostas_invalidas.contexto).toBe(1);
    expect(r.fonte.contexto).toMatchObject({ b_falsos_total: 1, rejeicao_negativa: 0 });
    expect(r.fonte.contexto?.nao_chamou).toBeUndefined();
  });

  it('tarefa C conta por código citado e alimenta a alucinação residual', () => {
    const cit = (existe: boolean[]) => existe.map((e, i) => ({ codigo: `EF01LP0${i}`, formaValida: true, existe: e }));
    const julgados: Julgamento[] = [
      j('c-1', 'seco', 'avaliado', { tarefa: 'C', codigos_citados: cit([true, false, false]) }),
      j('c-1', 'grounded', 'avaliado', { tarefa: 'C', tools_chamadas: 2, codigos_citados: cit([true, true, false]) }),
    ];
    const r = resumirEstudo(julgados, 't', { reamostras: 20 }).por_modelo.m;
    expect(r.condicoes.seco?.C).toMatchObject({ n: 3, eventos: 2 });
    expect(r.fonte.grounded).toMatchObject({ c_codigos_citados: 3, alucinacao_residual: 1, chamou_e_errou: 1 });
    expect(r.deltas.grounded!.C.delta).toBeCloseTo(1 / 3 - 2 / 3);
  });

  it('é determinístico para a mesma semente', () => {
    const julgados: Julgamento[] = [];
    for (let i = 0; i < 12; i++) {
      julgados.push(j(`d-${i}`, 'seco', i % 3 === 0 ? 'incorreto' : 'correto'));
      julgados.push(j(`d-${i}`, 'grounded', i % 4 === 0 ? 'incorreto' : 'correto', { tools_chamadas: 1 }));
    }
    const a = resumirEstudo(julgados, 't', { seed: 7, reamostras: 100 }).por_modelo.m.deltas.grounded!.D.ic95;
    const b = resumirEstudo(julgados, 't', { seed: 7, reamostras: 100 }).por_modelo.m.deltas.grounded!.D.ic95;
    expect(a).toEqual(b);
  });
});
