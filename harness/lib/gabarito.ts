/**
 * Gabarito unificado: BNCC-2018 via API tipada do @bncc/dados + Computação
 * 2022 vendorizada de bncc-dados (DECISOES.md D4; proveniência e checksum em
 * dados-vendorizados/PROVENIENCIA.md). Índice único por código, com estrato
 * para amostragem. Quando o @bncc/dados 1.0 publicar Computação, a fonte
 * vendorizada sai e tudo volta a vir do pacote.
 */

import { readFileSync } from 'node:fs';
import { habilidadesEF, habilidadesEM, objetivosEI, versao } from '@bncc/dados';
import { analisar } from './codigos.js';
import type { Estrato } from './tipos.js';

export const CAMINHO_COMPUTACAO = new URL(
  '../../dados-vendorizados/computacao-2022/computacao.json',
  import.meta.url,
);

interface RegistroCO {
  codigo: string;
  texto: string;
}
interface ComputacaoJson {
  objetivos_ei: RegistroCO[];
  habilidades_ef: RegistroCO[];
  habilidades_em: RegistroCO[];
}

export interface Aprendizagem {
  codigo: string;
  texto: string;
  estrato: Estrato;
}

let indiceMemo: Map<string, Aprendizagem> | null = null;

function estratoDe(codigo: string): Estrato {
  const info = analisar(codigo);
  if (!info) throw new Error(`Código do dataset fora das gramáticas conhecidas: ${codigo}`);
  return { etapa: info.etapa, modulo: info.modulo, componente: info.componente };
}

function construir(): Map<string, Aprendizagem> {
  const indice = new Map<string, Aprendizagem>();
  const inserir = (codigo: string, texto: string) => {
    const c = codigo.trim().toUpperCase();
    if (indice.has(c)) throw new Error(`Código duplicado no gabarito: ${c}`);
    indice.set(c, { codigo: c, texto, estrato: estratoDe(c) });
  };

  for (const a of objetivosEI()) inserir(a.codigo, a.texto);
  for (const a of habilidadesEF()) inserir(a.codigo, a.texto);
  for (const a of habilidadesEM()) inserir(a.codigo, a.texto);

  const computacao = JSON.parse(readFileSync(CAMINHO_COMPUTACAO, 'utf8')) as ComputacaoJson;
  for (const grupo of [computacao.objetivos_ei, computacao.habilidades_ef, computacao.habilidades_em]) {
    for (const a of grupo) inserir(a.codigo, a.texto);
  }
  return indice;
}

function indice(): Map<string, Aprendizagem> {
  if (!indiceMemo) indiceMemo = construir();
  return indiceMemo;
}

export function todas(): Aprendizagem[] {
  return [...indice().values()];
}

export function existeCodigo(codigo: string): boolean {
  return indice().has(codigo.trim().toUpperCase());
}

export function obter(codigo: string): Aprendizagem | undefined {
  return indice().get(codigo.trim().toUpperCase());
}

export function todosCodigos(): string[] {
  return [...indice().keys()];
}

export function infoDataset(): { dataset_versao: string; total: number } {
  return { dataset_versao: versao().data_version, total: indice().size };
}
