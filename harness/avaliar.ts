/**
 * CLI: julga os brutos de uma rodada e aplica o juiz LLM nos casos não
 * triviais.
 *
 *   pnpm avaliar --rodada smoke                      # juiz default (claude-haiku)
 *   pnpm avaliar --rodada smoke --juiz nenhum        # só verificadores programáticos
 *
 * Saída: resultados/<rodada>/julgados.jsonl
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { julgar, trechoDoCodigo } from './lib/avaliacao.js';
import { CacheDisco, chaveCache } from './lib/cache.js';
import { criarLimitador } from './lib/concorrencia.js';
import { carregarEnv } from './lib/env.js';
import { comRetry } from './lib/execucao.js';
import { obter } from './lib/gabarito.js';
import type { BancoItens, Julgamento, RegistroBruto } from './lib/tipos.js';
import { extrairVereditoJuiz, promptJuiz } from './prompts/juiz.js';
import { criarProvedor } from './provedores/fabrica.js';
import { MODELOS } from './provedores/registro.js';
import type { Provedor } from './provedores/tipos.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { values: args } = parseArgs({
  allowPositionals: true, // o pnpm repassa o separador "--" como posicional
  options: {
    rodada: { type: 'string', default: 'smoke' },
    itens: { type: 'string', default: resolve(RAIZ, 'itens/itens-v1-rc.json') },
    juiz: { type: 'string', default: 'claude-haiku' },
  },
});

const banco = JSON.parse(readFileSync(args.itens!, 'utf8')) as BancoItens;
const porId = new Map(banco.itens.map((i) => [i.id, i]));

const dirRodada = resolve(RAIZ, 'resultados', args.rodada!);
const arquivosBrutos = readdirSync(dirRodada).filter(
  (a) => a.startsWith('brutos-') && a.endsWith('.jsonl'),
);
if (arquivosBrutos.length === 0) {
  throw new Error(`Nenhum brutos-*.jsonl em ${dirRodada}`);
}

const registros: RegistroBruto[] = arquivosBrutos.flatMap((a) =>
  readFileSync(resolve(dirRodada, a), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((linha) => JSON.parse(linha) as RegistroBruto),
);

console.log(`${registros.length} registros de ${arquivosBrutos.length} arquivo(s)`);

const julgados: Julgamento[] = [];
const porChave = new Map<string, RegistroBruto>();
for (const registro of registros) {
  const item = porId.get(registro.item_id);
  if (!item) throw new Error(`Item desconhecido nos brutos: ${registro.item_id}`);
  const julgamento = julgar(item, registro);
  julgados.push(julgamento);
  porChave.set(`${julgamento.modelo}|${julgamento.item_id}|${julgamento.parafrase}|${julgamento.modo}`, registro);
}

// Juiz LLM nos pendentes.
const pendentesA = julgados.filter((j) => j.veredito === 'pendente_juiz');
const pendentesC = julgados.flatMap((j) =>
  (j.codigos_citados ?? [])
    .filter((c) => c.texto === 'pendente_juiz')
    .map((c) => ({ julgamento: j, citado: c })),
);
console.log(`Pendentes de juiz: ${pendentesA.length} (tarefa A) + ${pendentesC.length} (códigos da C)`);

if (args.juiz !== 'nenhum' && pendentesA.length + pendentesC.length > 0) {
  const defJuiz = MODELOS[args.juiz!];
  if (!defJuiz) throw new Error(`Juiz desconhecido: ${args.juiz}`);
  const provedorJuiz: Provedor = criarProvedor(defJuiz, carregarEnv(resolve(RAIZ, '.env')));
  const cache = new CacheDisco(resolve(RAIZ, 'cache'));
  const limitador = criarLimitador(5);

  const julgarComJuiz = async (canonico: string, trecho: string): Promise<'sim' | 'nao' | 'parcial'> => {
    const chave = chaveCache({ juiz: defJuiz.id, modeloApi: defJuiz.modelo, canonico, trecho });
    const emCache = cache.obter<{ veredito: 'sim' | 'nao' | 'parcial' }>(chave);
    if (emCache) return emCache.veredito;
    const resposta = await comRetry(
      () => provedorJuiz.completar({ prompt: promptJuiz(canonico, trecho), grounded: false, maxTokens: 10 }),
      3,
      1000,
    );
    const veredito = extrairVereditoJuiz(resposta.texto) ?? 'nao';
    cache.gravar(chave, { veredito });
    return veredito;
  };

  await Promise.all([
    ...pendentesA.map((j) =>
      limitador(async () => {
        const item = porId.get(j.item_id)!;
        const registro = porChave.get(`${j.modelo}|${j.item_id}|${j.parafrase}|${j.modo}`)!;
        if (item.gabarito.tipo !== 'texto') return;
        const veredito = await julgarComJuiz(item.gabarito.texto, registro.resposta);
        j.juiz = { veredito, modelo: defJuiz.id };
        j.veredito = veredito === 'sim' ? 'fiel_parafrase' : veredito === 'parcial' ? 'parcial' : 'inventado';
      }),
    ),
    ...pendentesC.map(({ julgamento, citado }) =>
      limitador(async () => {
        const registro = porChave.get(
          `${julgamento.modelo}|${julgamento.item_id}|${julgamento.parafrase}|${julgamento.modo}`,
        )!;
        const canonico = obter(citado.codigo)?.texto;
        if (!canonico) return;
        const citados = julgamento.codigos_citados!;
        const posicao = citados.indexOf(citado);
        const proximo = posicao + 1 < citados.length ? citados[posicao + 1].codigo : undefined;
        const trecho = trechoDoCodigo(registro.resposta, citado.codigo, proximo);
        const veredito = await julgarComJuiz(canonico, trecho);
        citado.texto = veredito === 'sim' ? 'ok' : 'divergente';
      }),
    ),
  ]);
  console.log(`Juiz aplicado (${defJuiz.id}).`);
} else if (pendentesA.length + pendentesC.length > 0) {
  console.log('Juiz desativado (--juiz nenhum); pendências permanecem marcadas.');
}

julgados.sort(
  (a, b) =>
    a.modelo.localeCompare(b.modelo) ||
    a.modo.localeCompare(b.modo) ||
    a.item_id.localeCompare(b.item_id) ||
    a.parafrase - b.parafrase,
);

const saida = resolve(dirRodada, 'julgados.jsonl');
writeFileSync(saida, julgados.map((j) => JSON.stringify(j)).join('\n') + '\n');
console.log(`Julgados: ${saida} (${julgados.length})`);
