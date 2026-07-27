/**
 * CLI: gera o banco de itens público e, sob pedido explícito, o held-out.
 *
 *   pnpm gerar                     # itens/itens-v1-rc.json (o caso comum)
 *   pnpm gerar --seed 123          # seed alternativa (o default é o registrado)
 *   pnpm gerar --com-heldout       # também regera o held-out (só mantenedores)
 *
 * O held-out NUNCA é escrito dentro do repositório (DECISOES.md D5) e sua seed
 * NUNCA é versionada: ela vem de SEED_HELDOUT no .env. Como o gerador é
 * determinístico, a seed no repositório equivaleria ao held-out no repositório.
 *
 * Daí o held-out ser opt-in: quem não é mantenedor não tem a seed, e o caminho
 * padrão precisa funcionar para essa maioria. Esquecer a flag gera só o banco
 * público — inofensivo; o inverso falharia para todo contribuidor externo.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { carregarEnv } from './lib/env.js';
import { gerarBanco } from './lib/gerador.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEED_PUBLICA = 20260712;

const { values: args } = parseArgs({
  allowPositionals: true, // o pnpm repassa o separador "--" como posicional
  options: {
    seed: { type: 'string', default: String(SEED_PUBLICA) },
    saida: { type: 'string', default: resolve(RAIZ, 'itens/itens-v1-rc.json') },
    'heldout-dir': { type: 'string', default: resolve(RAIZ, '..', 'bncc-benchmark-heldout') },
    'com-heldout': { type: 'boolean', default: false },
  },
});

const seed = Number(args.seed);

const banco = gerarBanco(seed);
mkdirSync(dirname(args.saida!), { recursive: true });
writeFileSync(args.saida!, JSON.stringify(banco, null, 1), 'utf8');
console.log(`Banco público: ${args.saida} (${banco.itens.length} itens, seed ${seed})`);
console.log('Distribuição:', JSON.stringify(banco.distribuicao));

if (args['com-heldout']) {
  const dirHeldout = resolve(args['heldout-dir']!);
  // Fronteira de diretório de verdade (startsWith falharia: "bncc-benchmark-heldout"
  // começa com a string "bncc-benchmark").
  const relativo = relative(RAIZ, dirHeldout);
  if (relativo === '' || !relativo.startsWith('..')) {
    throw new Error(`held-out não pode ficar dentro do repositório: ${dirHeldout}`);
  }
  // A seed do held-out vive só no .env (SEED_HELDOUT), fora do repositório: o
  // gerador é determinístico, então publicá-la equivaleria a publicar o próprio
  // held-out. Ver DECISOES.md D5.
  const seedHeldout = Number(carregarEnv(resolve(RAIZ, '.env')).SEED_HELDOUT);
  if (!Number.isFinite(seedHeldout)) {
    throw new Error(
      'SEED_HELDOUT ausente ou inválida no .env — o held-out não pode ser gerado. ' +
        'Ela é privada aos mantenedores (DECISOES.md D5); sem --com-heldout o ' +
        'banco público é gerado normalmente.',
    );
  }
  const heldout = gerarBanco(seedHeldout);
  mkdirSync(dirHeldout, { recursive: true });
  const caminho = resolve(dirHeldout, 'itens-heldout-v1-rc.json');
  writeFileSync(caminho, JSON.stringify(heldout, null, 1), 'utf8');
  console.log(`Held-out (privado, fora do repo): ${caminho} (${heldout.itens.length} itens)`);
}
