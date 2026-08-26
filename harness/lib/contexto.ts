/**
 * Condição de controle "contexto" do estudo de intervenção (DECISOES.md D14,
 * regra 1): a listagem oficial do ESCOPO do item (etapa + componente +
 * ano/bloco/faixa) é injetada no prompt, sem ferramenta. É o equivalente
 * determinístico do que `bncc_listar` devolveria — o que um RAG comum
 * injetaria — e isola "ter o dado" de "usar o MCP".
 *
 * Regra única para todas as tarefas, para não haver escolha caso a caso:
 * - A, B, D: escopo derivado do código do item (também para códigos falsos,
 *   cuja gramática é válida: o modelo precisa inferir a inexistência a partir
 *   da lista, como faria com a tool — nunca se injeta "código não encontrado").
 * - C: escopo do pedido (`pedido.escopo`, com `ano` quando houver).
 *
 * Determinístico: mesma versão do gabarito → mesmo texto. Ordenado por código.
 */

import { analisar, anosDe } from './codigos.js';
import { infoDataset, todas, type Aprendizagem } from './gabarito.js';
import type { Etapa, Item, Modulo } from './tipos.js';

export const CONTEXTO_VERSAO = 'listagem-escopo-v1';

export interface EscopoContexto {
  etapa: Etapa;
  modulo: Modulo;
  componente: string;
  /** EF: ano (1-9); EI: faixa etária (1-3); ausente = componente inteiro (EM sempre). */
  ano?: number;
}

/** Faixa/ano do prefixo: EI01→1, EF67→[6,7], EF03→[3], EM13→[]. */
function anosDoPrefixo(prefixo: string): number[] {
  const segmento = prefixo.slice(2, 4);
  if (!/^\d{2}$/.test(segmento) || prefixo.startsWith('EM')) return [];
  return anosDe(segmento);
}

export function escopoDoItem(item: Item): EscopoContexto {
  if (item.tarefa === 'C') {
    if (!item.pedido) throw new Error(`Item ${item.id} da tarefa C sem pedido`);
    const e = item.pedido.escopo;
    // No módulo de Computação o componente é sempre CO (pedidos como "Computação
    // no Ensino Médio" vêm sem componente).
    const componente = e.componente ?? (e.modulo === 'computacao-2022' ? 'CO' : undefined);
    if (!componente) throw new Error(`Item ${item.id}: pedido sem componente`);
    return { etapa: e.etapa, modulo: e.modulo, componente, ...(e.ano ? { ano: e.ano } : {}) };
  }
  if (!item.codigo) throw new Error(`Item ${item.id} sem código`);
  const info = analisar(item.codigo);
  if (!info) {
    // Especiais (ex.: o typo EF05CO011, D6) não casam com as gramáticas: o
    // escopo vem do estrato do item e o ano, do segmento após a etapa.
    if (!item.estrato.componente) throw new Error(`Item ${item.id}: código fora das gramáticas e sem componente no estrato`);
    const m = item.codigo.toUpperCase().match(/^E[IF](\d{2})/);
    const anos = m ? anosDe(m[1]) : [];
    return { ...item.estrato, componente: item.estrato.componente, ...(anos.length > 0 ? { ano: anos[0] } : {}) };
  }
  const anos = anosDoPrefixo(info.prefixo);
  // Bloco (EF67, EF15...): o escopo é o primeiro ano do bloco — a listagem por
  // ano já inclui todos os códigos de bloco que cobrem aquele ano.
  return {
    etapa: info.etapa,
    modulo: info.modulo,
    componente: info.componente,
    ...(anos.length > 0 ? { ano: anos[0] } : {}),
  };
}

let porEscopoMemo: Map<string, Aprendizagem[]> | null = null;

function chave(e: EscopoContexto): string {
  return `${e.etapa}|${e.componente}|${e.ano ?? '-'}`;
}

/** Índice etapa|componente|ano → aprendizagens, construído uma vez. */
function indice(): Map<string, Aprendizagem[]> {
  if (porEscopoMemo) return porEscopoMemo;
  const m = new Map<string, Aprendizagem[]>();
  for (const a of todas()) {
    const info = analisar(a.codigo);
    if (!info) continue;
    const anos = anosDoPrefixo(info.prefixo);
    // Sempre indexa também sem ano (componente inteiro): é o escopo dos pedidos
    // da tarefa C que não fixam ano, e o único escopo do EM.
    const base = { etapa: info.etapa, modulo: info.modulo, componente: info.componente };
    const chaves = new Set([chave(base), ...anos.map((ano) => chave({ ...base, ano }))]);
    for (const k of chaves) {
      const grupo = m.get(k) ?? [];
      grupo.push(a);
      m.set(k, grupo);
    }
  }
  for (const grupo of m.values()) grupo.sort((x, y) => x.codigo.localeCompare(y.codigo));
  porEscopoMemo = m;
  return m;
}

export function listarEscopo(e: EscopoContexto): Aprendizagem[] {
  return indice().get(chave(e)) ?? [];
}

function descreverEscopo(e: EscopoContexto): string {
  const modulo = e.modulo === 'computacao-2022' ? 'Computação (complemento de 2022)' : 'BNCC 2018';
  if (e.etapa === 'EI') {
    const faixa = e.ano === 1 ? 'bebês' : e.ano === 2 ? 'crianças bem pequenas' : 'crianças pequenas';
    return `Educação Infantil, ${e.componente === 'CO' ? 'Computação' : `campo ${e.componente}`}, ${faixa} — ${modulo}`;
  }
  if (e.etapa === 'EF') {
    return `Ensino Fundamental, ${e.componente}, ${e.ano}º ano (inclui códigos de bloco que cobrem esse ano) — ${modulo}`;
  }
  return `Ensino Médio, ${e.componente} — ${modulo}`;
}

/**
 * Bloco de contexto a ser prefixado ao prompt. Sem system prompt (a condição
 * "usuário comum" muda aqui por definição; declarado na METODOLOGIA).
 */
export function montarContexto(item: Item): string {
  const escopo = escopoDoItem(item);
  const lista = listarEscopo(escopo);
  if (lista.length === 0) {
    throw new Error(`Item ${item.id}: escopo sem registros (${chave(escopo)})`);
  }
  const { dataset_versao } = infoDataset();
  const linhas = lista.map((a) => `${a.codigo} — ${a.texto}`);
  return [
    `Dados oficiais do bncc.dev (dataset ${dataset_versao}; ${CONTEXTO_VERSAO}).`,
    `Escopo: ${descreverEscopo(escopo)}. ${lista.length} registro(s), lista completa:`,
    ...linhas,
  ].join('\n');
}

/** Prompt final da condição contexto: bloco de dados + pergunta original. */
export function promptComContexto(item: Item, parafrase: string): string {
  return `${montarContexto(item)}\n\nPergunta: ${parafrase}`;
}
