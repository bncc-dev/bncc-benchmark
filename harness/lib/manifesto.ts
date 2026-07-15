/**
 * Manifesto da rodada: snapshot auditável da configuração de cada execução e
 * avaliação, gravado em resultados/<rodada>/manifesto.json.
 *
 * Semântica de APPEND (espírito do RB-10): entradas nunca são removidas nem
 * sobrescritas; cada invocação do executar/avaliar acrescenta a sua. Escrita
 * atômica (tmp + rename). O manifesto é log aditivo e NÃO participa do check
 * de consistência do agregar --verificar (que cobre julgados×agregados);
 * não "consertar" isso depois.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import type { DefModelo } from '../provedores/tipos.js';

export interface ResultadoModeloManifesto {
  registros: number;
  chamadas_novas: number;
  do_cache: number;
  custo_usd: number;
  incompletas: number;
}

export interface EntradaExecucao {
  executado_em: string;
  modo: string;
  harness_commit: string;
  flags: Record<string, unknown>;
  dataset_versao: string;
  itens_versao: string;
  modelos: Array<{ id: string; def: DefModelo; resultado: ResultadoModeloManifesto }>;
}

export interface EntradaAvaliacao {
  avaliado_em: string;
  harness_commit: string;
  avaliador_versao: string;
  rubrica_versao: string;
  juiz: { id: string; modelo: string } | null;
  julgados: number;
  pendentes_a: number;
  pendentes_c: number;
  juiz_chamadas: number;
  juiz_custo_usd: number;
}

export interface Manifesto {
  rodada: string;
  execucoes: EntradaExecucao[];
  avaliacoes: EntradaAvaliacao[];
}

export function commitHarness(cwd?: string): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'desconhecido';
  }
}

function carregar(caminho: string, rodada: string): Manifesto {
  if (!existsSync(caminho)) return { rodada, execucoes: [], avaliacoes: [] };
  return JSON.parse(readFileSync(caminho, 'utf8')) as Manifesto;
}

function gravar(caminho: string, manifesto: Manifesto): void {
  const temporario = `${caminho}.tmp`;
  writeFileSync(temporario, JSON.stringify(manifesto, null, 1), 'utf8');
  renameSync(temporario, caminho);
}

export function registrarExecucao(caminho: string, rodada: string, entrada: EntradaExecucao): void {
  const manifesto = carregar(caminho, rodada);
  manifesto.execucoes.push(entrada);
  gravar(caminho, manifesto);
}

export function registrarAvaliacao(
  caminho: string,
  rodada: string,
  entrada: EntradaAvaliacao,
): void {
  const manifesto = carregar(caminho, rodada);
  manifesto.avaliacoes.push(entrada);
  gravar(caminho, manifesto);
}
