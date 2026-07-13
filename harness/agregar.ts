/**
 * CLI: agrega julgados de uma rodada; com --verificar, recalcula e compara
 * com o agregados.json commitado (o check do CI, DECISOES.md D3).
 *
 *   pnpm agregar -- --rodada smoke
 *   pnpm agregar -- --rodada smoke --verificar
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { agregar, agregadosEquivalentes } from './lib/agregacao.js';
import type { Agregados, BancoItens, Julgamento } from './lib/tipos.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { values: args } = parseArgs({
  allowPositionals: true, // o pnpm repassa o separador "--" como posicional
  options: {
    rodada: { type: 'string', default: 'smoke' },
    itens: { type: 'string', default: resolve(RAIZ, 'itens/itens-v1-rc.json') },
    verificar: { type: 'boolean', default: false },
  },
});

const dirRodada = resolve(RAIZ, 'resultados', args.rodada!);
const caminhoJulgados = resolve(dirRodada, 'julgados.jsonl');
const caminhoAgregados = resolve(dirRodada, 'agregados.json');

const julgados: Julgamento[] = readFileSync(caminhoJulgados, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((linha) => JSON.parse(linha) as Julgamento);

const banco = JSON.parse(readFileSync(args.itens!, 'utf8')) as BancoItens;
const novo = agregar(julgados, args.rodada!, {
  dataset_versao: banco.dataset_versao,
  itens_versao: banco.versao,
});

if (args.verificar) {
  if (!existsSync(caminhoAgregados)) {
    console.error(`FALHA: ${caminhoAgregados} não existe para verificar.`);
    process.exit(1);
  }
  const commitado = JSON.parse(readFileSync(caminhoAgregados, 'utf8')) as Agregados;
  if (!agregadosEquivalentes(novo, commitado)) {
    console.error('FALHA: agregados.json não bate com o recalculado a partir dos julgados.');
    console.error('Rode "pnpm agregar" e commite o resultado junto com os brutos.');
    process.exit(1);
  }
  console.log(`OK: agregados da rodada "${args.rodada}" batem com os brutos.`);
} else {
  writeFileSync(caminhoAgregados, JSON.stringify(novo, null, 1));
  console.log(`Agregados: ${caminhoAgregados}`);
  for (const [modelo, agregado] of Object.entries(novo.por_modelo)) {
    for (const [modo, dados] of Object.entries(agregado.modo)) {
      console.log(`  ${modelo} (${modo}): ${dados.total_julgamentos} julgamentos`);
    }
  }
}
