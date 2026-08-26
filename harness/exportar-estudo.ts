/**
 * CLI: resumo do estudo de intervenção (D14) a partir dos julgados de uma
 * rodada — artefato à parte do leaderboard.
 *
 *   pnpm exportar-estudo --rodada estudo-fonte-2026-09 [--seed 20260824] [--reamostras 1000]
 *
 * Saída: resultados/<rodada>/estudo.json + tabela no terminal.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { resumirEstudo } from './lib/estudo.js';
import type { Julgamento } from './lib/tipos.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { values: args } = parseArgs({
  allowPositionals: true,
  options: {
    rodada: { type: 'string', default: 'smoke' },
    seed: { type: 'string', default: '20260824' },
    reamostras: { type: 'string', default: '1000' },
  },
});

const dir = resolve(RAIZ, 'resultados', args.rodada!);
const julgados: Julgamento[] = readFileSync(resolve(dir, 'julgados.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l) as Julgamento);

const resumo = resumirEstudo(julgados, args.rodada!, {
  seed: Number(args.seed),
  reamostras: Number(args.reamostras),
});
const saida = resolve(dir, 'estudo.json');
writeFileSync(saida, JSON.stringify(resumo, null, 1));
console.log(`Estudo: ${saida}`);

const pct = (x: number | null) => (x === null ? '—' : `${(100 * x).toFixed(1)}%`);
for (const [modelo, r] of Object.entries(resumo.por_modelo)) {
  console.log(`\n${modelo}`);
  for (const [modo, tarefas] of Object.entries(r.condicoes)) {
    const t = tarefas.todas;
    const fonte = r.fonte[modo as keyof typeof r.fonte];
    const extra = fonte
      ? `${fonte.nao_chamou !== undefined ? ` · não chamou ${fonte.nao_chamou}/${fonte.total}` : ''} · rej.neg ${fonte.rejeicao_negativa}/${fonte.b_falsos_total} · residual C ${fonte.alucinacao_residual}/${fonte.c_codigos_citados}`
      : '';
    console.log(`  ${modo.padEnd(9)} alucinação ${pct(t.taxa)} (${t.eventos}/${t.n})${extra}`);
  }
  for (const [modo, d] of Object.entries(r.deltas)) {
    const x = d.todas;
    const ic = x.ic95 ? ` IC95 [${pct(x.ic95[0])}, ${pct(x.ic95[1])}]` : '';
    console.log(`  Δ ${modo}−seco: ${pct(x.delta)}${ic} · ${x.pares} pares · discordantes só-seco ${x.discordantes.so_seco} / só-${modo} ${x.discordantes.so_condicao}`);
  }
}
