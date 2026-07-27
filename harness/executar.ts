/**
 * CLI: executa a bateria contra um ou mais modelos.
 *
 *   pnpm executar --rodada smoke --modelos claude-sonnet,claude-haiku --limite 10
 *   pnpm executar --rodada smoke --modelos claude-sonnet --modo grounded --limite 5
 *
 * Saída: resultados/<rodada>/brutos-<modelo>-<modo>.jsonl
 * Keys em .env (nunca commitado). Execução é sempre local (DECISOES.md D3).
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gravarBrutos } from './lib/brutos.js';
import { CacheDisco } from './lib/cache.js';
import { carregarEnv } from './lib/env.js';
import { executarBateria, selecionarBalanceado } from './lib/execucao.js';
import { commitHarness, registrarExecucao, type EntradaExecucao } from './lib/manifesto.js';
import type { BancoItens, Modo } from './lib/tipos.js';
import { criarProvedor } from './provedores/fabrica.js';
import { MODELOS } from './provedores/registro.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { values: args } = parseArgs({
  allowPositionals: true, // o pnpm repassa o separador "--" como posicional
  options: {
    rodada: { type: 'string', default: 'smoke' },
    modelos: { type: 'string', default: 'claude-haiku' },
    modo: { type: 'string', default: 'seco' }, // seco | grounded
    itens: { type: 'string', default: resolve(RAIZ, 'itens/itens-v1.json') },
    limite: { type: 'string' },
    parafrases: { type: 'string', default: '3' },
    concorrencia: { type: 'string', default: '5' },
    'max-tokens': { type: 'string', default: '1024' },
    'aceitar-antivexame-pendente': { type: 'boolean', default: false },
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

// Gabarito "existe: false" só vale depois da verificação anti-vexame.
// Rodar bateria paga com falsos pendentes arrisca contar acerto como alucinação.
const pendentes = itens.filter((i) => i.verificacao_antivexame?.status === 'pendente');
if (pendentes.length > 0 && !args['aceitar-antivexame-pendente']) {
  throw new Error(
    `${pendentes.length} item(ns) com verificação anti-vexame PENDENTE na seleção (ex.: ${pendentes
      .slice(0, 3)
      .map((i) => `${i.id}/${i.codigo}`)
      .join(', ')}). ` +
      'Conclua a verificação manual dos falsos ou use --aceitar-antivexame-pendente (só para smokes/pilotos).',
  );
}
if (pendentes.length > 0) {
  console.warn(
    `AVISO: rodando com ${pendentes.length} falso(s) de anti-vexame pendente (override explícito).`,
  );
}

const ids = args.modelos!.split(',').map((m) => m.trim());
for (const id of ids) {
  if (!MODELOS[id]) {
    throw new Error(`Modelo desconhecido: ${id}. Registrados: ${Object.keys(MODELOS).join(', ')}`);
  }
}

console.log(
  `Rodada "${args.rodada}" · modo ${modo} · ${itens.length} itens × até ${args.parafrases} paráfrases · modelos: ${ids.join(', ')}`,
);

const entradaManifesto: EntradaExecucao = {
  executado_em: new Date().toISOString(),
  modo,
  harness_commit: commitHarness(RAIZ),
  flags: {
    // Relativo à raiz: caminho absoluto vazaria o home de quem executou a rodada.
    itens: relative(RAIZ, resolve(args.itens!)),
    limite: args.limite ? Number(args.limite) : null,
    parafrases: Number(args.parafrases),
    concorrencia: Number(args.concorrencia),
    max_tokens_flag: Number(args['max-tokens']),
    aceitar_antivexame_pendente: args['aceitar-antivexame-pendente'],
  },
  dataset_versao: banco.dataset_versao,
  itens_versao: banco.versao,
  modelos: [],
};

const falhas: string[] = [];
for (const id of ids) {
  const def = MODELOS[id];
  if (modo === 'grounded' && !def.suportaGrounded) {
    console.warn(`AVISO: ${id} não suporta modo grounded; pulando.`);
    continue;
  }
  const provedor = criarProvedor(def, ambiente);
  const inicio = Date.now();
  let resultado;
  try {
    resultado = await executarBateria({
    banco,
    itens,
    def,
    provedor,
    modo,
    parafrases: Number(args.parafrases),
    cache,
    concorrencia: Number(args.concorrencia),
    maxTokens: Number(args['max-tokens']),
    aoProgresso: (feito, total, doCache) => {
      if (feito % 25 === 0 || feito === total) {
        process.stdout.write(`\r  ${id}: ${feito}/${total}${doCache ? ' (cache)' : ''}      `);
      }
    },
  });
  } catch (erro) {
    // Um modelo instável não derruba a bateria: o que ele completou está no
    // cache; a fila continua e ele é retomado num re-run do mesmo comando.
    process.stdout.write('\n');
    console.error(`FALHA em ${id} (fila continua; re-rode o mesmo comando para retomá-lo): ${(erro as Error).message.slice(0, 200)}`);
    falhas.push(id);
    continue;
  }
  process.stdout.write('\n');

  const dir = resolve(RAIZ, 'resultados', args.rodada!);
  mkdirSync(dir, { recursive: true });
  const arquivo = resolve(dir, `brutos-${id}-${modo}.jsonl`);
  const balanco = gravarBrutos(arquivo, resultado.registros);
  if (balanco.preservados > 0) {
    console.log(
      `  AVISO: seleção parcial; o arquivo mantém ${balanco.preservados} registro(s) de execuções anteriores (total ${balanco.total}).`,
    );
  }

  // Respostas incompletas não entram nas taxas; melhor saber já na execução.
  const incompletas = resultado.registros.filter(
    (r) => r.finish_reason !== undefined && r.finish_reason !== 'fim',
  ).length;
  if (incompletas > 0) {
    console.warn(
      `  AVISO: ${incompletas} resposta(s) truncada(s)/bloqueada(s) (finish_reason != fim); considere --max-tokens maior.`,
    );
  }

  entradaManifesto.modelos.push({
    id,
    def,
    resultado: {
      registros: resultado.registros.length,
      chamadas_novas: resultado.chamadas,
      do_cache: resultado.doCache,
      custo_usd: Number(resultado.custoUsd.toFixed(6)),
      incompletas,
    },
  });

  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
  console.log(
    `  ${arquivo}\n  ${resultado.registros.length} registros gravados · ${resultado.chamadas} chamadas novas · ${resultado.doCache} do cache · US$ ${resultado.custoUsd.toFixed(4)} · ${segundos}s`,
  );
}

if (falhas.length > 0) {
  console.error(`\nModelos com falha nesta invocação: ${falhas.join(', ')} — re-rode o mesmo comando para completá-los.`);
  process.exitCode = 1;
}

if (entradaManifesto.modelos.length > 0) {
  const dirRodada = resolve(RAIZ, 'resultados', args.rodada!);
  registrarExecucao(resolve(dirRodada, 'manifesto.json'), args.rodada!, entradaManifesto);
  console.log(`Manifesto: ${resolve(dirRodada, 'manifesto.json')}`);
}
