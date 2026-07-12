/**
 * Gramáticas dos códigos de aprendizagem, detecção de lacunas e extração de
 * códigos em texto livre.
 *
 * O `decodificar` do @bncc/dados cobre as 4 gramáticas da BNCC-2018 mas não os
 * códigos CO (Computação, 2022) — ver DECISOES.md D4. Aqui mantemos as 7 formas
 * lado a lado porque o benchmark precisa tratar os dois documentos por igual.
 */

import type { Etapa, Modulo } from './tipos.js';

export interface CodigoAnalisado {
  codigo: string;
  etapa: Etapa;
  modulo: Modulo;
  /** Tudo menos a sequência; agrupa códigos da mesma série numerada. */
  prefixo: string;
  sequencia: number;
  /** Sigla de componente (EF), campo (EI), área (EM) ou 'CO'. */
  componente: string;
}

const CAMPOS_EI = ['EO', 'CG', 'TS', 'EF', 'ET'] as const;
const COMPONENTES_EF = ['AR', 'CI', 'EF', 'ER', 'GE', 'HI', 'LI', 'LP', 'MA'] as const;
const AREAS_EM = ['LGG', 'MAT', 'CNT', 'CHS'] as const;
export const ANOS_EF = ['01', '02', '03', '04', '05', '06', '07', '08', '09'] as const;
export const BLOCOS_EF = ['15', '69', '12', '35', '67', '89'] as const;

const RE_EI = /^EI(0[123])(EO|CG|TS|EF|ET)(\d{2})$/;
const RE_EI_CO = /^EI(0[123])CO(\d{2})$/;
const RE_EF = /^EF(15|69|12|35|67|89|0[1-9])(AR|CI|EF|ER|GE|HI|LI|LP|MA)(\d{2})$/;
// Computação no EF numera por ano E por bloco (EF15CO/EF69CO existem no anexo oficial).
const RE_EF_CO = /^EF(15|69|12|35|67|89|0[1-9])CO(\d{2})$/;
const RE_EM_AREA = /^EM13(LGG|MAT|CNT|CHS)(\d)(\d{2})$/;
const RE_EM_LP = /^EM13LP(\d{2})$/;
const RE_EM_CO = /^EM13CO(\d{2})$/;

/** Analisa um código; devolve null se não casa com nenhuma das 7 gramáticas. */
export function analisar(codigoBruto: string): CodigoAnalisado | null {
  const codigo = codigoBruto.trim().toUpperCase();

  let m = codigo.match(RE_EI);
  if (m) {
    return {
      codigo,
      etapa: 'EI',
      modulo: 'bncc-2018',
      prefixo: `EI${m[1]}${m[2]}`,
      sequencia: Number(m[3]),
      componente: m[2],
    };
  }
  m = codigo.match(RE_EI_CO);
  if (m) {
    return {
      codigo,
      etapa: 'EI',
      modulo: 'computacao-2022',
      prefixo: `EI${m[1]}CO`,
      sequencia: Number(m[2]),
      componente: 'CO',
    };
  }
  m = codigo.match(RE_EF);
  if (m) {
    return {
      codigo,
      etapa: 'EF',
      modulo: 'bncc-2018',
      prefixo: `EF${m[1]}${m[2]}`,
      sequencia: Number(m[3]),
      componente: m[2],
    };
  }
  m = codigo.match(RE_EF_CO);
  if (m) {
    return {
      codigo,
      etapa: 'EF',
      modulo: 'computacao-2022',
      prefixo: `EF${m[1]}CO`,
      sequencia: Number(m[2]),
      componente: 'CO',
    };
  }
  m = codigo.match(RE_EM_AREA);
  if (m) {
    return {
      codigo,
      etapa: 'EM',
      modulo: 'bncc-2018',
      prefixo: `EM13${m[1]}${m[2]}`,
      sequencia: Number(m[3]),
      componente: m[1],
    };
  }
  m = codigo.match(RE_EM_LP);
  if (m) {
    return {
      codigo,
      etapa: 'EM',
      modulo: 'bncc-2018',
      prefixo: 'EM13LP',
      sequencia: Number(m[1]),
      componente: 'LP',
    };
  }
  m = codigo.match(RE_EM_CO);
  if (m) {
    return {
      codigo,
      etapa: 'EM',
      modulo: 'computacao-2022',
      prefixo: 'EM13CO',
      sequencia: Number(m[1]),
      componente: 'CO',
    };
  }
  return null;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export interface Lacunas {
  /**
   * Buracos internos de sequências existentes. Achado empírico (DECISOES.md
   * D8): a numeração do dataset é contígua, então isto é vazio para os dados
   * atuais; mantido porque o invariante é verificado em teste e porque
   * versões futuras do dataset podem introduzir buracos (habilidades
   * revogadas).
   */
  internas: string[];
  /** O número imediatamente após o último real de cada sequência (borda). */
  extensoes: string[];
}

function agruparPorPrefixo(codigos: Iterable<string>): Map<string, Set<number>> {
  const porPrefixo = new Map<string, Set<number>>();
  for (const c of codigos) {
    const info = analisar(c);
    if (!info) continue;
    let seqs = porPrefixo.get(info.prefixo);
    if (!seqs) {
      seqs = new Set();
      porPrefixo.set(info.prefixo, seqs);
    }
    seqs.add(info.sequencia);
  }
  return porPrefixo;
}

/**
 * Detecta lacunas na numeração a partir do conjunto de códigos reais.
 * Códigos que não casam com nenhuma gramática são ignorados.
 */
export function detectarLacunas(codigos: Iterable<string>): Lacunas {
  const internas: string[] = [];
  const extensoes: string[] = [];
  for (const [prefixo, seqs] of [...agruparPorPrefixo(codigos).entries()].sort()) {
    const ordenadas = [...seqs].sort((a, b) => a - b);
    const min = ordenadas[0];
    const max = ordenadas[ordenadas.length - 1];
    for (let s = min; s < max; s++) {
      if (!seqs.has(s)) internas.push(`${prefixo}${pad2(s)}`);
    }
    if (max + 1 <= 99) extensoes.push(`${prefixo}${pad2(max + 1)}`);
  }
  return { internas, extensoes };
}

/** Maior sequência de cada prefixo real; insumo dos falsos "profundos". */
export function maximosPorPrefixo(codigos: Iterable<string>): Map<string, number> {
  const maximos = new Map<string, number>();
  for (const [prefixo, seqs] of agruparPorPrefixo(codigos)) {
    maximos.set(prefixo, Math.max(...seqs));
  }
  return maximos;
}

export { pad2 };

/**
 * Prefixos gramaticalmente válidos que não têm nenhum código no dataset
 * (ex.: EF01AR, porque Arte no Fundamental só numera em blocos EF15AR/EF69AR).
 * A partir deles o gerador monta códigos "combinação inexistente".
 */
export function prefixosInexistentes(codigosReais: Iterable<string>): string[] {
  const existentes = new Set<string>();
  for (const c of codigosReais) {
    const info = analisar(c);
    if (info) existentes.add(info.prefixo);
  }

  const candidatos: string[] = [];
  for (const anos of [...ANOS_EF, ...BLOCOS_EF]) {
    for (const comp of COMPONENTES_EF) candidatos.push(`EF${anos}${comp}`);
  }
  for (const grupo of ['01', '02', '03']) {
    for (const campo of CAMPOS_EI) candidatos.push(`EI${grupo}${campo}`);
  }
  // Competências específicas plausíveis por área (1 a 7 cobre todas as reais).
  for (const area of AREAS_EM) {
    for (let ce = 1; ce <= 7; ce++) candidatos.push(`EM13${area}${ce}`);
  }
  return candidatos.filter((p) => !existentes.has(p));
}

/**
 * Extrai candidatos a código de um texto livre (resposta de modelo).
 * A rede é deliberadamente mais larga que as gramáticas estritas (aceita um
 * dígito a mais na sequência) para capturar citações malformadas como
 * EF05CO011; `formaValida` distingue os dois casos.
 */
const RE_EXTRACAO =
  /\b(?:EI0[1-9](?:EO|CG|TS|EF|ET|CO)\d{2,3}|EF\d{2}(?:AR|CI|EF|ER|GE|HI|LI|LP|MA|CO)\d{2,3}|EM\d{2}(?:LGG|MAT|CNT|CHS)\d{2,4}|EM\d{2}(?:LP|CO)\d{2,3})\b/g;

export function extrairCodigos(texto: string): Array<{ codigo: string; formaValida: boolean }> {
  const vistos = new Set<string>();
  const achados: Array<{ codigo: string; formaValida: boolean }> = [];
  for (const m of texto.toUpperCase().matchAll(RE_EXTRACAO)) {
    const codigo = m[0];
    if (vistos.has(codigo)) continue;
    vistos.add(codigo);
    achados.push({ codigo, formaValida: analisar(codigo) !== null });
  }
  return achados;
}
