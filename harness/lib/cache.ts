/**
 * Cache em disco por chave de conteúdo. É também o checkpoint das execuções:
 * uma rodada interrompida retoma de onde parou, só as chamadas faltantes
 * custam (DECISOES.md D3).
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function chaveCache(partes: Record<string, unknown>): string {
  const estavel = JSON.stringify(partes, Object.keys(partes).sort());
  return createHash('sha256').update(estavel).digest('hex');
}

export class CacheDisco {
  constructor(private dir: string = 'cache') {}

  private caminho(chave: string): string {
    return join(this.dir, `${chave}.json`);
  }

  obter<T>(chave: string): T | null {
    const arquivo = this.caminho(chave);
    if (!existsSync(arquivo)) return null;
    return JSON.parse(readFileSync(arquivo, 'utf8')) as T;
  }

  gravar(chave: string, valor: unknown): void {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.caminho(chave), JSON.stringify(valor, null, 1), 'utf8');
  }
}
