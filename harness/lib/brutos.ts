/**
 * Escrita dos artefatos brutos (RB-10): merge por (item_id, parafrase) com o
 * arquivo existente, nunca encolhe, escrita atômica. Um re-run parcial
 * (--limite) jamais pode truncar o registro de uma bateria já paga.
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import type { RegistroBruto } from './tipos.js';

export function lerBrutos(arquivo: string): RegistroBruto[] {
  if (!existsSync(arquivo)) return [];
  return readFileSync(arquivo, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((linha) => JSON.parse(linha) as RegistroBruto);
}

function chaveRegistro(r: RegistroBruto): string {
  return `${r.item_id}|${r.parafrase}`;
}

export function mesclarBrutos(
  existentes: RegistroBruto[],
  novos: RegistroBruto[],
): RegistroBruto[] {
  const porChave = new Map<string, RegistroBruto>();
  for (const r of existentes) porChave.set(chaveRegistro(r), r);
  for (const r of novos) porChave.set(chaveRegistro(r), r);
  return [...porChave.values()].sort(
    (a, b) => a.item_id.localeCompare(b.item_id) || a.parafrase - b.parafrase,
  );
}

/** Grava com merge e rename atômico; devolve o balanço para o console. */
export function gravarBrutos(
  arquivo: string,
  novos: RegistroBruto[],
): { total: number; preservados: number } {
  const existentes = lerBrutos(arquivo);
  const mesclados = mesclarBrutos(existentes, novos);
  const temporario = `${arquivo}.tmp`;
  writeFileSync(temporario, mesclados.map((r) => JSON.stringify(r)).join('\n') + '\n');
  renameSync(temporario, arquivo);
  return { total: mesclados.length, preservados: mesclados.length - novos.length };
}
