/**
 * Gabarito unificado: BNCC-2018 via API tipada do @bncc/dados + Computação
 * 2022 vendorizada de bncc-dados (DECISOES.md D4; proveniência e checksum em
 * dados-vendorizados/PROVENIENCIA.md). Índice único por código, com estrato
 * para amostragem. Quando o @bncc/dados 1.0 publicar Computação, a fonte
 * vendorizada sai e tudo volta a vir do pacote.
 */

import { readFileSync } from 'node:fs';
import { habilidadesEF, habilidadesEM, normalizarTexto, objetivosEI, versao } from '@bncc/dados';
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

let duplicadosMemo: Map<string, string[]> | null = null;

/**
 * Códigos cujo texto normalizado é idêntico ao do código dado (inclui o
 * próprio). Computação numera o mesmo texto por ano e por bloco (EF06CO04 =
 * EF69CO04 etc.); todos são resposta correta na tarefa D.
 */
export function codigosComMesmoTexto(codigo: string): string[] {
  if (!duplicadosMemo) {
    const porTexto = new Map<string, string[]>();
    for (const a of indice().values()) {
      const chave = normalizarTexto(a.texto);
      const grupo = porTexto.get(chave) ?? [];
      grupo.push(a.codigo);
      porTexto.set(chave, grupo);
    }
    duplicadosMemo = new Map();
    for (const grupo of porTexto.values()) {
      for (const c of grupo) duplicadosMemo.set(c, [...grupo].sort());
    }
  }
  const grupo = duplicadosMemo.get(codigo.trim().toUpperCase());
  if (!grupo) throw new Error(`Código fora do gabarito: ${codigo}`);
  return grupo;
}
