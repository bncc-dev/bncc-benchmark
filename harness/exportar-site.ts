/**
 * CLI: destila uma rodada julgada num JSON compacto para o site bncc.dev.
 *
 *   pnpm exportar-site --rodada oficial-seca-2026-07 --versao v0.1.0
 *
 * Artefato DERIVADO dos julgados/brutos: não altera nenhum resultado, logo
 * não exige bump de release (DECISOES.md D11). É a implementação canônica da
 * nota composta usada no leaderboard público (antes um script avulso da
 * release). O JSON gerado é vendorizado no repo do site (bncc-pacotes) com
 * proveniência (tag + SHA-256); nada do held-out passa por aqui, porque o
 * held-out nunca entra em resultados/ (D5).
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import type { BancoItens, Item, Julgamento, RegistroBruto } from './lib/tipos.js';
import { calcularMetricas, montarExport, type Apresentacao } from './lib/exportar.js';

/**
 * Nome público, empresa e faixa de preço de cada modelo já medido.
 *
 * O id designa o MODELO, não a vaga no elenco (D13.1): quando o fabricante
 * lança versão nova, ela entra com id próprio e o antigo permanece aqui,
 * porque as releases em que foi medido seguem citáveis. Por isso a tabela só
 * cresce — ids nunca são reapontados nem removidos.
 */
export const APRESENTACAO: Record<string, Apresentacao> = {
  'gpt-sol': { nome: 'GPT-5.6 Sol', empresa: 'OpenAI', tier: 'topo de linha' },
  'gpt-luna': { nome: 'GPT-5.6 Luna', empresa: 'OpenAI', tier: 'econômico' },
  'fable-5': { nome: 'Claude Fable 5', empresa: 'Anthropic', tier: 'topo de linha' },
  'opus-4.8': { nome: 'Claude Opus 4.8', empresa: 'Anthropic', tier: 'topo de linha' }, // rodadas até jul/2026
  'opus-5': { nome: 'Claude Opus 5', empresa: 'Anthropic', tier: 'topo de linha' },
  'sonnet-5': { nome: 'Claude Sonnet 5', empresa: 'Anthropic', tier: 'topo de linha' },
  'sonnet-bedrock': { nome: 'Claude Sonnet 4.6', empresa: 'Anthropic', tier: 'topo de linha' },
  'haiku-bedrock': { nome: 'Claude Haiku 4.5', empresa: 'Anthropic', tier: 'econômico' },
  'gemini-pro': { nome: 'Gemini 3.1 Pro', empresa: 'Google', tier: 'topo de linha' },
  // Ids até jul/2026 (v0.1.0), preservados porque a release é imutável.
  'gemini-flash': { nome: 'Gemini 3.5 Flash', empresa: 'Google', tier: 'econômico' },
  grok: { nome: 'Grok 4.5', empresa: 'xAI', tier: 'topo de linha' },
  kimi: { nome: 'Kimi K2.6', empresa: 'Moonshot', tier: 'topo de linha' },
  'qwen-max': { nome: 'Qwen 3.7 Max', empresa: 'Alibaba', tier: 'topo de linha' },
  // Ids a partir de ago/2026 (v0.2.0).
  'gemini-37-flash': { nome: 'Gemini 3.7 Flash', empresa: 'Google', tier: 'econômico' },
  'grok-46': { nome: 'Grok 4.6', empresa: 'xAI', tier: 'topo de linha' },
  'kimi-k3': { nome: 'Kimi K3', empresa: 'Moonshot', tier: 'topo de linha' },
  'qwen-38-max': { nome: 'Qwen 3.8 Max', empresa: 'Alibaba', tier: 'topo de linha' },
  'qwen-plus': { nome: 'Qwen 3.7 Plus', empresa: 'Alibaba', tier: 'econômico' },
  'deepseek-pro': { nome: 'DeepSeek V4 Pro', empresa: 'DeepSeek', tier: 'topo de linha' },
  'deepseek-flash': { nome: 'DeepSeek V4 Flash', empresa: 'DeepSeek', tier: 'econômico' },
  'muse-spark': { nome: 'Muse Spark 1.2', empresa: 'Meta', tier: 'topo de linha' },
  'qwen-flash': { nome: 'Qwen 3.7 Flash', empresa: 'Alibaba', tier: 'econômico' },
  'sabia-4': { nome: 'Sabiá-4', empresa: 'Maritaca AI', tier: 'topo de linha' },
  'sabiazinho-4': { nome: 'Sabiazinho-4', empresa: 'Maritaca AI', tier: 'econômico' },
};

function lerJsonl<T>(caminho: string): T[] {
  return readFileSync(caminho, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((linha) => JSON.parse(linha) as T);
}

const { values } = parseArgs({
  options: {
    rodada: { type: 'string' },
    versao: { type: 'string' },
    itens: { type: 'string', default: 'itens/itens-v1.json' },
    saida: { type: 'string' },
  },
  allowPositionals: true,
});

if (!values.rodada || !values.versao) {
  console.error('Uso: pnpm exportar-site --rodada <nome> --versao vX.Y.Z');
  process.exit(1);
}

const dir = join('resultados', values.rodada);
const julgados = lerJsonl<Julgamento>(join(dir, 'julgados.jsonl'));
const banco = JSON.parse(readFileSync(values.itens, 'utf-8')) as BancoItens;
const itens = new Map<string, Item>(banco.itens.map((i) => [i.id, i]));

// O elenco vem dos brutos que a rodada produziu, não do APRESENTACAO: desde a
// D13.1 o catálogo guarda também ids de rodadas antigas, que não têm arquivo
// aqui. Um id medido sem entrada no catálogo é erro de configuração e para o
// export — sairia no leaderboard sem nome público.
const elenco = readdirSync(dir)
  .map((f) => /^brutos-(.+)-seco\.jsonl$/.exec(f)?.[1])
  .filter((m): m is string => Boolean(m))
  .sort();

const semApresentacao = elenco.filter((m) => !APRESENTACAO[m]);
if (semApresentacao.length > 0) {
  throw new Error(
    `Modelos sem entrada em APRESENTACAO: ${semApresentacao.join(', ')}. ` +
      'Acrescente-os em harness/exportar-site.ts antes de exportar.',
  );
}

const brutos = new Map<string, RegistroBruto[]>();
for (const modelo of elenco) {
  brutos.set(modelo, lerJsonl<RegistroBruto>(join(dir, `brutos-${modelo}-seco.jsonl`)));
}

const exportado = montarExport({
  rodada: values.rodada,
  versao: values.versao,
  banco,
  itens,
  julgados,
  brutos,
  apresentacao: APRESENTACAO,
});

const corpo = JSON.stringify(exportado, null, 1);
const sha = createHash('sha256').update(corpo).digest('hex');
const saida = values.saida ?? join(dir, 'site', `leaderboard-${values.versao}.json`);
mkdirSync(dirname(saida), { recursive: true });
writeFileSync(saida, corpo);

console.log(`Exportado: ${saida} (${(corpo.length / 1024).toFixed(0)} KB)`);
console.log(`SHA-256: ${sha}`);
console.log(`Modelos: ${exportado.modelos.length} · respostas: ${exportado.meta.total_respostas}`);
for (const m of exportado.modelos) {
  console.log(
    `  ${String(m.posicao).padStart(2)} ${m.id.padEnd(16)} nota ${m.nota.toFixed(1).replace('.', ',')}`,
  );
}
// eslint-disable-next-line no-void
void calcularMetricas; // reexport de conveniência para os testes
