/**
 * CLI: aplica a adjudicação anti-vexame (D10) ao banco v1-rc e congela o
 * itens-v1.json definitivo.
 *
 *   pnpm exec tsx harness/congelar-itens.ts --por "Nome do adjudicador"
 *
 * Fonte da adjudicação: docs/anti-vexame/pre-triagem-<data>.json (classificação
 * por código, com fontes), confirmada por humano na planilha de adjudicação.
 * Regenerar o v1-rc (pnpm gerar) NÃO toca no v1 congelado; um novo
 * congelamento exige nova adjudicação.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { BancoItens } from './lib/tipos.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { values: args } = parseArgs({
  allowPositionals: true,
  options: {
    por: { type: 'string' },
    data: { type: 'string', default: '2026-07-15' },
    triagem: {
      type: 'string',
      default: resolve(RAIZ, 'docs/anti-vexame/pre-triagem-2026-07-15.json'),
    },
    entrada: { type: 'string', default: resolve(RAIZ, 'itens/itens-v1-rc.json') },
    saida: { type: 'string', default: resolve(RAIZ, 'itens/itens-v1.json') },
  },
});

if (!args.por) throw new Error('Informe --por "Nome" (quem adjudicou a planilha).');

interface Triagem {
  data_triagem: string;
  resultados: Array<{
    codigo: string;
    item_id: string;
    classificacao: 'limpo' | 'derivado' | 'cinzenta-federal';
    achados: Array<{ url: string; tipo: string; evidencia: string }>;
    observacao: string;
  }>;
}

const triagem = JSON.parse(readFileSync(args.triagem!, 'utf8')) as Triagem;
const banco = JSON.parse(readFileSync(args.entrada!, 'utf8')) as BancoItens;
const porId = new Map(triagem.resultados.map((r) => [r.item_id, r]));

let aplicados = 0;
let cinzentas = 0;
for (const item of banco.itens) {
  if (!item.tipo.startsWith('falso-')) continue;
  const r = porId.get(item.id);
  if (!r) throw new Error(`Item falso sem triagem: ${item.id} (${item.codigo})`);
  if (r.codigo !== item.codigo) {
    throw new Error(`Triagem divergente para ${item.id}: ${r.codigo} != ${item.codigo}`);
  }
  item.verificacao_antivexame = {
    status: 'ok',
    categoria: r.classificacao,
    fontes: r.achados.map((a) => a.url),
    verificado_em: args.data!,
    por: args.por!,
    notas: r.observacao,
  };
  if (r.classificacao === 'cinzenta-federal') {
    cinzentas++;
    item.nota =
      `${item.nota ? item.nota + ' ' : ''}D10 zona cinzenta federal: código existe em documento ` +
      `MEC/CNE pré-homologação; reportar à parte, como o typo EF05CO011.`;
  }
  aplicados++;
}
if (aplicados !== 60) throw new Error(`Esperava 60 falsos adjudicados; apliquei ${aplicados}`);

banco.versao = 'v1';
writeFileSync(args.saida!, JSON.stringify(banco, null, 1), 'utf8');
console.log(
  `itens-v1 congelado: ${args.saida}\n` +
    `${aplicados} falsos adjudicados (${cinzentas} cinzenta-federal) · por ${args.por} em ${args.data}`,
);
