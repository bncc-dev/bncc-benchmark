/**
 * CLI: executa a bateria contra um ou mais modelos.
 *
 *   pnpm executar -- --rodada smoke --modelos claude-sonnet,claude-haiku --limite 10
 *   pnpm executar -- --rodada smoke --modelos claude-sonnet --modo grounded --limite 5
 *
 * Saída: resultados/<rodada>/brutos-<modelo>-<modo>.jsonl
 * Keys em .env (nunca commitado). Execução é sempre local (DECISOES.md D3).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { CacheDisco } from './lib/cache.js';
import { carregarEnv } from './lib/env.js';
import { executarBateria, selecionarBalanceado } from './lib/execucao.js';
import type { BancoItens, Modo } from './lib/tipos.js';
import { criarProvedor } from './provedores/fabrica.js';
import { MODELOS } from './provedores/registro.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { values: args } = parseArgs({
  options: {
    rodada: { type: 'string', default: 'smoke' },
    modelos: { type: 'string', default: 'claude-haiku' },
    modo: { type: 'string', default: 'seco' }, // seco | grounded
    itens: { type: 'string', default: resolve(RAIZ, 'itens/itens-v1-rc.json') },
    limite: { type: 'string' },
    parafrases: { type: 'string', default: '3' },
    concorrencia: { type: 'string', default: '5' },
  },
});

const modo = args.modo as Modo;
if (modo !== 'seco' && modo !== 'grounded') {
  throw new Error(`--modo deve ser "seco" ou "grounded", recebi "${args.modo}"`);
}

const banco = JSON.parse(readFileSync(args.itens!, 'utf8')) as BancoItens;
const limite = args.limite ? Number(args.limite) : banco.itens.length;
const itens = selecionarBalanceado(banco.itens, limite);
const ambiente = carregarEnv(resolve(RAIZ, '.env'));
const cache = new CacheDisco(resolve(RAIZ, 'cache'));

const ids = args.modelos!.split(',').map((m) => m.trim());
for (const id of ids) {
  if (!MODELOS[id]) {
    throw new Error(`Modelo desconhecido: ${id}. Registrados: ${Object.keys(MODELOS).join(', ')}`);
  }
}

console.log(
  `Rodada "${args.rodada}" · modo ${modo} · ${itens.length} itens × até ${args.parafrases} paráfrases · modelos: ${ids.join(', ')}`,
);

for (const id of ids) {
  const def = MODELOS[id];
  if (modo === 'grounded' && !def.suportaGrounded) {
    console.warn(`AVISO: ${id} não suporta grounded ainda (M5); pulando.`);
    continue;
  }
  const provedor = criarProvedor(def, ambiente);
  const inicio = Date.now();
  const resultado = await executarBateria({
    banco,
    itens,
    def,
    provedor,
    modo,
    parafrases: Number(args.parafrases),
    cache,
    concorrencia: Number(args.concorrencia),
    aoProgresso: (feito, total, doCache) => {
      if (feito % 25 === 0 || feito === total) {
        process.stdout.write(`\r  ${id}: ${feito}/${total}${doCache ? ' (cache)' : ''}      `);
      }
    },
  });
  process.stdout.write('\n');

  const dir = resolve(RAIZ, 'resultados', args.rodada!);
  mkdirSync(dir, { recursive: true });
  const arquivo = resolve(dir, `brutos-${id}-${modo}.jsonl`);
  writeFileSync(arquivo, resultado.registros.map((r) => JSON.stringify(r)).join('\n') + '\n');

  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
  console.log(
    `  ${arquivo}\n  ${resultado.registros.length} registros · ${resultado.chamadas} chamadas novas · ${resultado.doCache} do cache · US$ ${resultado.custoUsd.toFixed(4)} · ${segundos}s`,
  );
}
