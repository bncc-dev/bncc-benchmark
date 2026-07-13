/**
 * CLI: julga os brutos de uma rodada e aplica o juiz LLM nos casos não
 * triviais.
 *
 *   pnpm avaliar --rodada smoke                      # juiz default (haiku-bedrock)
 *   pnpm avaliar --rodada smoke --juiz nenhum        # só verificadores programáticos
 *
 * Saídas: resultados/<rodada>/julgados.jsonl
 *         resultados/<rodada>/juiz.jsonl   (RB-8: trilha auditável do juiz,
 *         uma linha por julgamento com resposta bruta, versão e custo)
 *
 * RB-5: juiz sem veredito parseável ganha 1 retry com mais tokens; persiste →
 * 'indeterminado' (nunca conta como alucinação, nunca é cacheado).
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { julgar } from './lib/avaliacao.js';
import { CacheDisco, chaveCache } from './lib/cache.js';
import { criarLimitador } from './lib/concorrencia.js';
import { carregarEnv } from './lib/env.js';
import { comRetry } from './lib/execucao.js';
import { obter } from './lib/gabarito.js';
import type { BancoItens, Julgamento, RegistroBruto } from './lib/tipos.js';
import { extrairVereditoJuiz, promptJuiz, RUBRICA_VERSAO } from './prompts/juiz.js';
import { criarProvedor } from './provedores/fabrica.js';
import { MODELOS } from './provedores/registro.js';
import type { Provedor } from './provedores/tipos.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { values: args } = parseArgs({
  allowPositionals: true, // o pnpm repassa o separador "--" como posicional
  options: {
    rodada: { type: 'string', default: 'smoke' },
    itens: { type: 'string', default: resolve(RAIZ, 'itens/itens-v1-rc.json') },
    juiz: { type: 'string', default: 'haiku-bedrock' },
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
const registroDe = new Map<string, RegistroBruto>();
for (const registro of registros) {
  const item = porId.get(registro.item_id);
  if (!item) throw new Error(`Item desconhecido nos brutos: ${registro.item_id}`);
  julgados.push(julgar(item, registro));
  registroDe.set(
    `${registro.modelo}|${registro.item_id}|${registro.parafrase}|${registro.modo}`,
    registro,
  );
}

// Juiz LLM nos pendentes.
type VereditoJuiz = 'sim' | 'nao' | 'parcial' | 'indeterminado';
interface LinhaJuiz {
  item_id: string;
  modelo: string;
  parafrase: number;
  modo: string;
  codigo?: string;
  rubrica_versao: string;
  trecho: string;
  veredito: VereditoJuiz;
  resposta_bruta: string;
  juiz_modelo: string;
  juiz_versao_modelo: string;
  tokens: { entrada: number; saida: number };
  custo_usd: number;
  do_cache: boolean;
}
const trilhaJuiz: LinhaJuiz[] = [];

const pendentesA = julgados.filter((j) => j.veredito === 'pendente_juiz');
const pendentesC = julgados.flatMap((j) =>
  (j.codigos_citados ?? [])
    .filter((c) => c.texto === 'pendente_juiz')
    .map((c) => ({ julgamento: j, citado: c })),
);
console.log(
  `Pendentes de juiz: ${pendentesA.length} (tarefa A) + ${pendentesC.length} (códigos da C)`,
);

if (args.juiz !== 'nenhum' && pendentesA.length + pendentesC.length > 0) {
  const defJuiz = MODELOS[args.juiz!];
  if (!defJuiz) throw new Error(`Juiz desconhecido: ${args.juiz}`);
  const provedorJuiz: Provedor = criarProvedor(defJuiz, carregarEnv(resolve(RAIZ, '.env')));
  const cache = new CacheDisco(resolve(RAIZ, 'cache'));
  const limitador = criarLimitador(5);

  interface JuizCacheado {
    veredito: Exclude<VereditoJuiz, 'indeterminado'>;
    resposta_bruta: string;
    versao_modelo: string;
    tokens: { entrada: number; saida: number };
    custo_usd: number;
  }

  const julgarComJuiz = async (
    canonico: string,
    trecho: string,
    ref: { item_id: string; modelo: string; parafrase: number; modo: string; codigo?: string },
  ): Promise<VereditoJuiz> => {
    const chave = chaveCache({
      juiz: defJuiz.id,
      modeloApi: defJuiz.modelo,
      rubrica: RUBRICA_VERSAO,
      canonico,
      trecho,
    });
    const emCache = cache.obter<JuizCacheado>(chave);
    if (emCache) {
      trilhaJuiz.push({
        ...ref,
        rubrica_versao: RUBRICA_VERSAO,
        trecho,
        veredito: emCache.veredito,
        resposta_bruta: emCache.resposta_bruta,
        juiz_modelo: defJuiz.id,
        juiz_versao_modelo: emCache.versao_modelo,
        tokens: emCache.tokens,
        custo_usd: 0,
        do_cache: true,
      });
      return emCache.veredito;
    }

    // RB-5: tentativa normal e um retry com folga antes de desistir.
    let respostaBruta = '';
    let versaoModelo = '';
    let tokens = { entrada: 0, saida: 0 };
    let custo = 0;
    let veredito: VereditoJuiz = 'indeterminado';
    for (const maxTokens of [30, 100]) {
      const resposta = await comRetry(
        () =>
          provedorJuiz.completar({ prompt: promptJuiz(canonico, trecho), grounded: false, maxTokens }),
        3,
        1000,
      );
      respostaBruta = resposta.texto;
      versaoModelo = resposta.versaoModelo;
      tokens = { entrada: resposta.tokens.entrada, saida: resposta.tokens.saida };
      custo += resposta.custoUsd;
      const extraido = extrairVereditoJuiz(resposta.texto);
      if (extraido) {
        veredito = extraido;
        break;
      }
    }

    if (veredito !== 'indeterminado') {
      cache.gravar(chave, {
        veredito,
        resposta_bruta: respostaBruta,
        versao_modelo: versaoModelo,
        tokens,
        custo_usd: custo,
      } satisfies JuizCacheado);
    }
    trilhaJuiz.push({
      ...ref,
      rubrica_versao: RUBRICA_VERSAO,
      trecho,
      veredito,
      resposta_bruta: respostaBruta,
      juiz_modelo: defJuiz.id,
      juiz_versao_modelo: versaoModelo,
      tokens,
      custo_usd: custo,
      do_cache: false,
    });
    return veredito;
  };

  await Promise.all([
    ...pendentesA.map((j) =>
      limitador(async () => {
        const item = porId.get(j.item_id)!;
        if (item.gabarito.tipo !== 'texto') return;
        const registro = registroDe.get(`${j.modelo}|${j.item_id}|${j.parafrase}|${j.modo}`)!;
        const veredito = await julgarComJuiz(item.gabarito.texto, registro.resposta, {
          item_id: j.item_id,
          modelo: j.modelo,
          parafrase: j.parafrase,
          modo: j.modo,
        });
        j.juiz = { veredito, modelo: defJuiz.id };
        j.veredito =
          veredito === 'sim'
            ? 'fiel_parafrase'
            : veredito === 'parcial'
              ? 'parcial'
              : veredito === 'indeterminado'
                ? 'indeterminado'
                : 'inventado';
      }),
    ),
    ...pendentesC.map(({ julgamento, citado }) =>
      limitador(async () => {
        const canonico = obter(citado.codigo)?.texto;
        if (!canonico || citado.trecho === undefined) return;
        const veredito = await julgarComJuiz(canonico, citado.trecho, {
          item_id: julgamento.item_id,
          modelo: julgamento.modelo,
          parafrase: julgamento.parafrase,
          modo: julgamento.modo,
          codigo: citado.codigo,
        });
        citado.texto =
          veredito === 'sim' ? 'ok' : veredito === 'indeterminado' ? 'indeterminado' : 'divergente';
      }),
    ),
  ]);
  console.log(`Juiz aplicado (${defJuiz.id}); ${trilhaJuiz.length} julgamentos na trilha.`);
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
trilhaJuiz.sort(
  (a, b) =>
    a.modelo.localeCompare(b.modelo) ||
    a.item_id.localeCompare(b.item_id) ||
    a.parafrase - b.parafrase ||
    (a.codigo ?? '').localeCompare(b.codigo ?? ''),
);

const saida = resolve(dirRodada, 'julgados.jsonl');
writeFileSync(saida, julgados.map((j) => JSON.stringify(j)).join('\n') + '\n');
console.log(`Julgados: ${saida} (${julgados.length})`);

if (trilhaJuiz.length > 0) {
  const saidaJuiz = resolve(dirRodada, 'juiz.jsonl');
  writeFileSync(saidaJuiz, trilhaJuiz.map((l) => JSON.stringify(l)).join('\n') + '\n');
  const custoJuiz = trilhaJuiz.reduce((s, l) => s + l.custo_usd, 0);
  console.log(`Trilha do juiz: ${saidaJuiz} (${trilhaJuiz.length} · US$ ${custoJuiz.toFixed(4)})`);
}
