/**
 * Análise do estudo de intervenção "acesso à fonte" (DECISOES.md D14; plano
 * de análise em docs/estudo-fonte/pre-registro.md). Não toca o leaderboard.
 *
 * Por modelo: taxa de alucinação por tarefa em cada condição (seco, contexto,
 * grounded); delta pareado condição−seco com IC 95% por bootstrap por cluster
 * de item (semente fixa → reprodutível); limite superior pela regra do três
 * quando há zero eventos; bloco `fonte` (nao_chamou, rejeição negativa,
 * alucinação residual, chamou e errou).
 */

import { criarRng } from './aleatorio.js';
import { alucinacoes } from './agregacao.js';
import type { Julgamento, Modo, Tarefa } from './tipos.js';

export interface Taxa {
  /** Denominador: julgamentos válidos (A, B falsos, D) ou códigos citados (C). */
  n: number;
  eventos: number;
  taxa: number | null;
  /** Regra do três: limite superior de 95% quando eventos = 0. */
  limite_superior_95_se_zero?: number;
}

export interface Delta {
  condicao: Modo;
  /** Pares (item, paráfrase) presentes nas duas condições. */
  pares: number;
  delta: number | null;
  ic95: [number, number] | null;
  /** McNemar: discordâncias b (só seco errou) e c (só condição errou). */
  discordantes: { so_seco: number; so_condicao: number };
}

export interface ResumoModelo {
  condicoes: Partial<Record<Modo, Record<Tarefa | 'todas', Taxa>>>;
  deltas: Partial<Record<Modo, Record<Tarefa | 'todas', Delta>>>;
  fonte: Partial<Record<Modo, Record<string, number>>>;
  respostas_invalidas: Partial<Record<Modo, number>>;
}

export interface ResumoEstudo {
  rodada: string;
  gerado_em: string;
  parametros: { seed: number; reamostras: number };
  por_modelo: Record<string, ResumoModelo>;
}

const TAREFAS: Tarefa[] = ['A', 'B', 'C', 'D'];

/** Julgamento entra no denominador? B só conta falsos (T4); inválidos ficam fora. */
function elegivel(j: Julgamento): boolean {
  if (j.veredito === 'resposta_invalida' || j.veredito === 'pendente_juiz' || j.veredito === 'indeterminado') return false;
  if (j.tarefa === 'B') return j.tipo.startsWith('falso');
  return true;
}

/** Numerador e denominador de um julgamento (C conta por código citado). */
function contribuicao(j: Julgamento): { n: number; eventos: number } {
  if (j.tarefa === 'C') {
    const n = j.codigos_citados?.length ?? 0;
    return { n, eventos: alucinacoes(j) };
  }
  return { n: 1, eventos: alucinacoes(j) };
}

function taxaDe(js: Julgamento[]): Taxa {
  let n = 0;
  let eventos = 0;
  for (const j of js) {
    const c = contribuicao(j);
    n += c.n;
    eventos += c.eventos;
  }
  const taxa: Taxa = { n, eventos, taxa: n > 0 ? eventos / n : null };
  if (n > 0 && eventos === 0) taxa.limite_superior_95_se_zero = 3 / n;
  return taxa;
}

const chavePar = (j: Julgamento) => `${j.item_id}|${j.parafrase}`;

/**
 * Delta pareado (condição − seco) com IC por bootstrap por item. A reamostra
 * sorteia ITENS com reposição e recalcula as duas taxas sobre os pares
 * sorteados; o IC é o percentil 2,5–97,5 dos deltas reamostrados.
 */
function deltaPareado(
  seco: Julgamento[],
  condicao: Julgamento[],
  modo: Modo,
  rng: () => number,
  reamostras: number,
): Delta {
  const porParSeco = new Map(seco.map((j) => [chavePar(j), j]));
  const pares: Array<{ item: string; seco: Julgamento; cond: Julgamento }> = [];
  for (const j of condicao) {
    const s = porParSeco.get(chavePar(j));
    if (s) pares.push({ item: j.item_id, seco: s, cond: j });
  }
  const vazio: Delta = { condicao: modo, pares: pares.length, delta: null, ic95: null, discordantes: { so_seco: 0, so_condicao: 0 } };
  if (pares.length === 0) return vazio;

  const taxaDePares = (ps: typeof pares) => {
    const ts = taxaDe(ps.map((p) => p.seco));
    const tc = taxaDe(ps.map((p) => p.cond));
    return ts.taxa === null || tc.taxa === null ? null : tc.taxa - ts.taxa;
  };
  const delta = taxaDePares(pares);
  if (delta === null) return vazio;

  let so_seco = 0;
  let so_condicao = 0;
  for (const p of pares) {
    const es = alucinacoes(p.seco) > 0;
    const ec = alucinacoes(p.cond) > 0;
    if (es && !ec) so_seco++;
    if (!es && ec) so_condicao++;
  }

  // Clusters = itens (as paráfrases de um item vão juntas).
  const porItem = new Map<string, typeof pares>();
  for (const p of pares) (porItem.get(p.item) ?? porItem.set(p.item, []).get(p.item)!).push(p);
  const itens = [...porItem.values()];
  const amostras: number[] = [];
  for (let r = 0; r < reamostras; r++) {
    const sorteio: typeof pares = [];
    for (let i = 0; i < itens.length; i++) sorteio.push(...itens[Math.floor(rng() * itens.length)]);
    const d = taxaDePares(sorteio);
    if (d !== null) amostras.push(d);
  }
  amostras.sort((a, b) => a - b);
  const q = (p: number) => amostras[Math.min(amostras.length - 1, Math.max(0, Math.floor(p * amostras.length)))];
  return {
    condicao: modo,
    pares: pares.length,
    delta,
    ic95: amostras.length > 0 ? [q(0.025), q(0.975)] : null,
    discordantes: { so_seco, so_condicao },
  };
}

export function resumirEstudo(
  julgados: Julgamento[],
  rodada: string,
  opcoes: { seed?: number; reamostras?: number } = {},
): ResumoEstudo {
  const seed = opcoes.seed ?? 20260824;
  const reamostras = opcoes.reamostras ?? 1000;
  const porModelo = new Map<string, Julgamento[]>();
  for (const j of julgados) (porModelo.get(j.modelo) ?? porModelo.set(j.modelo, []).get(j.modelo)!).push(j);

  const por_modelo: Record<string, ResumoModelo> = {};
  for (const [modelo, js] of [...porModelo.entries()].sort()) {
    const rng = criarRng(seed);
    const resumo: ResumoModelo = { condicoes: {}, deltas: {}, fonte: {}, respostas_invalidas: {} };
    const porModo = new Map<Modo, Julgamento[]>();
    for (const j of js) (porModo.get(j.modo) ?? porModo.set(j.modo, []).get(j.modo)!).push(j);

    for (const [modo, jm] of porModo) {
      resumo.respostas_invalidas[modo] = jm.filter((j) => j.veredito === 'resposta_invalida').length;
      const validos = jm.filter(elegivel);
      const porTarefa = {} as Record<Tarefa | 'todas', Taxa>;
      for (const t of TAREFAS) porTarefa[t] = taxaDe(validos.filter((j) => j.tarefa === t));
      porTarefa.todas = taxaDe(validos);
      resumo.condicoes[modo] = porTarefa;

      if (modo !== 'seco') {
        const fonte: Record<string, number> = { total: 0, chamou_e_errou: 0, ...(modo === 'grounded' ? { nao_chamou: 0 } : {}) };
        for (const j of jm) {
          if (j.tools_chamadas === undefined) continue;
          fonte.total++;
          if (modo === 'grounded' && j.tools_chamadas === 0) fonte.nao_chamou++;
          if (j.tools_chamadas > 0 && alucinacoes(j) > 0) fonte.chamou_e_errou++;
        }
        const bFalsos = validos.filter((j) => j.tarefa === 'B');
        fonte.b_falsos_total = bFalsos.length;
        fonte.rejeicao_negativa = bFalsos.filter((j) => j.veredito === 'incorreto').length;
        const c = taxaDe(validos.filter((j) => j.tarefa === 'C'));
        fonte.c_codigos_citados = c.n;
        fonte.alucinacao_residual = c.eventos;
        resumo.fonte[modo] = fonte;
      }
    }

    const seco = (porModo.get('seco') ?? []).filter(elegivel);
    for (const [modo, jm] of porModo) {
      if (modo === 'seco' || seco.length === 0) continue;
      const cond = jm.filter(elegivel);
      const deltas = {} as Record<Tarefa | 'todas', Delta>;
      for (const t of TAREFAS) {
        deltas[t] = deltaPareado(seco.filter((j) => j.tarefa === t), cond.filter((j) => j.tarefa === t), modo, rng, reamostras);
      }
      deltas.todas = deltaPareado(seco, cond, modo, rng, reamostras);
      resumo.deltas[modo] = deltas;
    }
    por_modelo[modelo] = resumo;
  }

  return { rodada, gerado_em: new Date().toISOString(), parametros: { seed, reamostras }, por_modelo };
}
