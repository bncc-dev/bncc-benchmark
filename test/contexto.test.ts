import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { escopoDoItem, listarEscopo, montarContexto, promptComContexto } from '../harness/lib/contexto.js';
import type { BancoItens, Item } from '../harness/lib/tipos.js';

const banco = JSON.parse(readFileSync(new URL('../itens/itens-v1.json', import.meta.url), 'utf8')) as BancoItens;
const item = (id: string): Item => {
  const i = banco.itens.find((x) => x.id === id);
  if (!i) throw new Error(`item ${id} não existe no banco`);
  return i;
};

describe('contexto (condição de controle, D14)', () => {
  it('é determinístico e cobre todos os 300 itens do banco v1 sem escopo vazio', () => {
    const tamanhos: number[] = [];
    for (const i of banco.itens) {
      const a = montarContexto(i);
      const b = montarContexto(i);
      expect(a).toBe(b);
      tamanhos.push(a.length);
    }
    const maior = Math.max(...tamanhos);
    const media = tamanhos.reduce((s, t) => s + t, 0) / tamanhos.length;
    // Guarda contra explosão do prompt. Teto real (24/ago/2026): LP do EF no 8º
    // ano, ~120 códigos com os blocos 69 e 89 → ~48k chars (~13k tokens).
    // Média do banco ~8k chars (~2,3k tokens). Mudou? Registrar na D14.
    expect(maior).toBeLessThan(60_000);
    expect(media).toBeLessThan(12_000);
  });

  it('tarefa A: a listagem contém o próprio código e o texto canônico', () => {
    const i = item('a-001'); // EM13LP50
    const ctx = montarContexto(i);
    expect(ctx).toContain('EM13LP50 — ');
    if (i.gabarito.tipo === 'texto') expect(ctx).toContain(i.gabarito.texto);
  });

  it('tarefa B falso: a listagem NÃO contém o código falso nem diz "não encontrado"', () => {
    for (const id of ['b-061', 'b-091', 'b-111']) {
      const i = item(id);
      const ctx = montarContexto(i);
      expect(ctx).not.toContain(`${i.codigo} —`);
      expect(ctx.toLowerCase()).not.toContain('não encontrado');
      expect(listarEscopo(escopoDoItem(i)).length).toBeGreaterThan(0);
    }
  });

  it('tarefa B falso-extensão: a listagem contém o último código real da mesma série', () => {
    const i = item('b-061'); // EM13CNT311 (real termina em 310)
    expect(montarContexto(i)).toContain('EM13CNT310 — ');
  });

  it('tarefa C: escopo vem do pedido e a listagem cobre todos os códigos válidos do gabarito', () => {
    const i = item('c-001');
    const ctx = montarContexto(i);
    if (i.gabarito.tipo === 'lista') {
      for (const c of i.gabarito.codigosValidos) expect(ctx).toContain(`${c} — `);
    }
  });

  it('EF por ano inclui os códigos de bloco que cobrem o ano', () => {
    const i = item('d-001'); // EF08LP11 → ano 8: deve incluir EF89LP* e EF69LP*
    const codigos = listarEscopo(escopoDoItem(i)).map((a) => a.codigo);
    expect(codigos.some((c) => c.startsWith('EF89LP'))).toBe(true);
    expect(codigos.some((c) => c.startsWith('EF69LP'))).toBe(true);
    expect(codigos.some((c) => c.startsWith('EF67LP'))).toBe(false);
  });

  it('Computação (EI e EF) e EM sem ano resolvem escopo', () => {
    expect(escopoDoItem(item('a-002'))).toEqual({ etapa: 'EI', modulo: 'computacao-2022', componente: 'CO', ano: 3 });
    expect(escopoDoItem(item('b-061'))).toEqual({ etapa: 'EM', modulo: 'bncc-2018', componente: 'CNT' });
  });

  it('o prompt final termina com a pergunta original', () => {
    const i = item('a-001');
    const p = promptComContexto(i, i.parafrases[0]);
    expect(p.endsWith(`Pergunta: ${i.parafrases[0]}`)).toBe(true);
    expect(p.startsWith('Dados oficiais do bncc.dev')).toBe(true);
  });
});
