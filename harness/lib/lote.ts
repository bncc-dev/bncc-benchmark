/**
 * Estado persistido de uma execução em lote (Batch API), por modelo e modo:
 * `resultados/<rodada>/lotes-<modelo>-<modo>.json`. Guarda só ponteiros
 * (ids remotos, tempos, situação por pedido); as respostas vivem no cache,
 * com a mesma chave do caminho síncrono. Commitável: sem respostas, sem keys.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { EstadoLoteRemoto, LoteRemoto } from '../provedores/tipos.js';
import type { Modo } from './tipos.js';

export type ApiBatch = 'openai' | 'anthropic' | 'google';

export interface FlagsLote {
  itens: string;
  itens_versao: string;
  limite: number | null;
  parafrases: number;
  max_tokens_flag: number;
}

export interface LoteSubmetido {
  /** 1 = orçamento base; 2 = escalada (dobro) para as linhas cortadas do lote 1. */
  geracao: 1 | 2;
  max_tokens: number;
  remoto: LoteRemoto;
  submetido_em: string;
  ultimo_estado?: { em: string; bruto: string; contagens?: EstadoLoteRemoto['contagens'] };
  coletado_em?: string;
  /** Lote inteiro falhou (validação, expiração); os pedidos dele viram erro. */
  erro?: string;
}

export type SituacaoPedido = 'submetido' | 'ok' | 'escalar' | 'erro';

export interface PedidoLote {
  item_id: string;
  parafrase: number;
  chave: string;
  /** Índice em `lotes` do lote mais recente que contém o pedido. */
  lote: number;
  situacao: SituacaoPedido;
  erro?: string;
}

export interface EstadoLote {
  versao: 1;
  modelo: string;
  modo: Modo;
  api: ApiBatch;
  /** Snapshot para recusar coleta com config diferente da submissão. */
  flags: FlagsLote;
  /**
   * Marca gravada ANTES do POST de submissão e apagada depois. Se estiver
   * presente na retomada, o processo caiu no meio: pode existir um lote pago
   * sem registro local, e o harness se recusa a submeter de novo.
   */
  submissao_em_curso?: { geracao: 1 | 2; em: string };
  lotes: LoteSubmetido[];
  /** Por customId (`<item_id>-p<parafrase>`). */
  pedidos: Record<string, PedidoLote>;
}

export function customIdDe(itemId: string, parafrase: number): string {
  return `${itemId}-p${parafrase}`;
}

export function caminhoLote(dirRodada: string, modelo: string, modo: Modo): string {
  return join(dirRodada, `lotes-${modelo}-${modo}.json`);
}

export function lerLote(caminho: string): EstadoLote | null {
  if (!existsSync(caminho)) return null;
  const estado = JSON.parse(readFileSync(caminho, 'utf8')) as EstadoLote;
  if (estado.versao !== 1) throw new Error(`Estado de lote em versão desconhecida (${estado.versao}): ${caminho}`);
  return estado;
}

/** Escrita atômica (tmp + rename), como o manifesto. */
export function gravarLote(caminho: string, estado: EstadoLote): void {
  mkdirSync(dirname(caminho), { recursive: true });
  const temporario = `${caminho}.tmp`;
  writeFileSync(temporario, JSON.stringify(estado, null, 1), 'utf8');
  renameSync(temporario, caminho);
}

/** Recusa retomar um lote submetido com outra configuração (D13.2: max_tokens é identidade). */
export function validarFlags(estado: EstadoLote, flags: FlagsLote): void {
  const chaves = Object.keys(flags) as Array<keyof FlagsLote>;
  const divergentes = chaves.filter((k) => estado.flags[k] !== flags[k]);
  if (divergentes.length > 0) {
    const detalhe = divergentes.map((k) => `${k}: lote=${String(estado.flags[k])} agora=${String(flags[k])}`).join('; ');
    throw new Error(
      `Lote de ${estado.modelo} (${estado.modo}) foi submetido com outra configuração (${detalhe}). ` +
        'Conclua a coleta com a configuração original ou use outra rodada.',
    );
  }
}
