/**
 * CLI: gera o banco de itens público e o held-out privado.
 *
 *   pnpm gerar                        # itens/itens-v1-rc.json + held-out
 *   pnpm gerar -- --seed 123          # seed alternativa (o default é o registrado)
 *   pnpm gerar -- --sem-heldout      # só o banco público
 *
 * O held-out NUNCA é escrito dentro do repositório (DECISOES.md D5).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gerarBanco } from './lib/gerador.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEED_PUBLICA = 20260712;
const DESLOCAMENTO_HELDOUT = SEED_REMOVIDA; // primo arbitrário; seed do held-out = pública + este valor

const { values: args } = parseArgs({
  options: {
    seed: { type: 'string', default: String(SEED_PUBLICA) },
    saida: { type: 'string', default: resolve(RAIZ, 'itens/itens-v1-rc.json') },
    'heldout-dir': { type: 'string', default: resolve(RAIZ, '..', 'bncc-benchmark-heldout') },
    'sem-heldout': { type: 'boolean', default: false },
  },
});

const seed = Number(args.seed);

const banco = gerarBanco(seed);
mkdirSync(dirname(args.saida!), { recursive: true });
writeFileSync(args.saida!, JSON.stringify(banco, null, 1), 'utf8');
console.log(`Banco público: ${args.saida} (${banco.itens.length} itens, seed ${seed})`);
console.log('Distribuição:', JSON.stringify(banco.distribuicao));

if (!args['sem-heldout']) {
  const dirHeldout = resolve(args['heldout-dir']!);
  // Fronteira de diretório de verdade (startsWith falharia: "bncc-benchmark-heldout"
  // começa com a string "bncc-benchmark").
  const relativo = relative(RAIZ, dirHeldout);
  if (relativo === '' || !relativo.startsWith('..')) {
    throw new Error(`held-out não pode ficar dentro do repositório: ${dirHeldout}`);
  }
  const heldout = gerarBanco(seed + DESLOCAMENTO_HELDOUT);
  mkdirSync(dirHeldout, { recursive: true });
  const caminho = resolve(dirHeldout, 'itens-heldout-v1-rc.json');
  writeFileSync(caminho, JSON.stringify(heldout, null, 1), 'utf8');
  console.log(`Held-out (privado, fora do repo): ${caminho} (${heldout.itens.length} itens)`);
}
