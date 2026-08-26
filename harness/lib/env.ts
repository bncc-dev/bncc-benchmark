/** Carrega .env da raiz do repo (sem dependência externa). Valores do .env
 * têm precedência sobre process.env; variáveis só na shell continuam visíveis. */

import { existsSync, readFileSync } from 'node:fs';

export function carregarEnv(caminho = '.env'): Record<string, string | undefined> {
  const ambiente: Record<string, string | undefined> = { ...process.env };
  if (!existsSync(caminho)) return ambiente;
  for (const linha of readFileSync(caminho, 'utf8').split('\n')) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const igual = limpa.indexOf('=');
    if (igual < 1) continue;
    const nome = limpa.slice(0, igual).trim();
    const valor = limpa.slice(igual + 1).trim().replace(/^["']|["']$/g, '');
    // O .env vence variáveis de shell (D14.1): keys antigas exportadas no perfil
    // do usuário sobrepunham as do projeto e quebraram o primeiro smoke direto.
    ambiente[nome] = valor;
  }
  return ambiente;
}
