/**
 * CLI: relatório HTML autocontido do estudo de intervenção "acesso à fonte"
 * (DECISOES.md D14). Artefato à parte do leaderboard, gerado a partir dos
 * estudo.json, brutos e manifestos das rodadas.
 *
 *   pnpm relatorio-estudo --rodada estudo-fonte-2026-08 --v2 estudo-fonte-2026-08-buscar-v2
 *
 * Saída: resultados/<rodada>/estudo.html
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { ResumoEstudo, ResumoModelo } from './lib/estudo.js';
import type { Manifesto } from './lib/manifesto.js';
import type { Modo, RegistroBruto } from './lib/tipos.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { values: args } = parseArgs({
  allowPositionals: true,
  options: {
    rodada: { type: 'string', default: 'estudo-fonte-2026-08' },
    v2: { type: 'string', default: 'estudo-fonte-2026-08-buscar-v2' },
    saida: { type: 'string' },
  },
});

// ---------- dados ----------

const dir = (r: string) => resolve(RAIZ, 'resultados', r);
const lerJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const lerJsonl = <T>(p: string): T[] => readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as T);

const estudo = lerJson<ResumoEstudo>(resolve(dir(args.rodada!), 'estudo.json'));
const estudoV2 = existsSync(resolve(dir(args.v2!), 'estudo.json')) ? lerJson<ResumoEstudo>(resolve(dir(args.v2!), 'estudo.json')) : null;
const manifesto = lerJson<Manifesto>(resolve(dir(args.rodada!), 'manifesto.json'));
const manifestoV2 = estudoV2 ? lerJson<Manifesto>(resolve(dir(args.v2!), 'manifesto.json')) : null;

/** Apresentação e ressalvas por id (o estudo declara condições por modelo, D14.1). */
const MODELOS: Record<string, { nome: string; empresa: string; rota: string; ressalva?: string }> = {
  'gemini-37-flash': { nome: 'Gemini 3.7 Flash', empresa: 'Google', rota: 'OpenRouter (pin Google)', ressalva: 'Rota direta do Google indisponível em 24–25/ago ("high demand"); as três condições rodaram via OpenRouter, seca refeita em 25/ago.' },
  'gpt-sol-direto': { nome: 'GPT-5.6 Sol', empresa: 'OpenAI', rota: 'API direta (Chat Completions)', ressalva: 'Chat Completions só aceita function tools sem raciocínio: as três condições rodam com reasoning_effort = none. A condição connector (Responses API) mede o modelo com raciocínio.' },
  'grok-46-direto': { nome: 'Grok 4.6', empresa: 'xAI', rota: 'API direta' },
  'sonnet-bedrock': { nome: 'Claude Sonnet 4.6', empresa: 'Anthropic via Amazon Bedrock', rota: 'Bedrock (Converse)', ressalva: 'Seca reaproveitada do cache da rodada oficial de 15–18/ago (mesma rota e configuração). 6 respostas truncadas na condição MCP, fora das taxas.' },
  'deepseek-flash-direto': { nome: 'DeepSeek V4 Flash', empresa: 'DeepSeek', rota: 'API direta', ressalva: 'Teto de 32.768 tokens (raciocina até o teto a 8.192; D13.2).' },
  'kimi-k3-direto': { nome: 'Kimi K3', empresa: 'Moonshot', rota: 'API direta', ressalva: 'A API exige temperature = 1 (protocolo pede 0).' },
  'sabia-4': { nome: 'Sabiá-4', empresa: 'Maritaca', rota: 'API direta', ressalva: 'Seca reaproveitada do cache da rodada oficial de 15–18/ago.' },
  'sabiazinho-4': { nome: 'Sabiazinho-4', empresa: 'Maritaca', rota: 'API direta', ressalva: 'Seca reaproveitada do cache da rodada oficial de 15–18/ago.' },
  'gpt-sol-mcp': { nome: 'GPT-5.6 Sol', empresa: 'OpenAI', rota: 'Responses API, connector MCP', ressalva: 'Sem temperature (rejeitada pelos gpt-5.x); raciocínio ligado.' },
  'grok-46-mcp': { nome: 'Grok 4.6', empresa: 'xAI', rota: 'Responses API, connector MCP' },
  'sonnet-5-mcp': { nome: 'Claude Sonnet 5', empresa: 'Anthropic', rota: 'Messages API, connector MCP', ressalva: 'Sem temperature (Claude 4.6+ removeu o parâmetro).' },
};
const ELENCO_A = ['gemini-37-flash', 'gpt-sol-direto', 'grok-46-direto', 'sonnet-bedrock', 'deepseek-flash-direto', 'kimi-k3-direto', 'sabia-4', 'sabiazinho-4'];
const ELENCO_B = ['gpt-sol-mcp', 'grok-46-mcp', 'sonnet-5-mcp'];

const custoPorModelo: Record<string, Record<string, number>> = {};
for (const [rodada, ids] of [[args.rodada!, [...ELENCO_A, ...ELENCO_B]], [args.v2!, ['sabia-4', 'sabiazinho-4']]] as const) {
  for (const id of ids) {
    for (const modo of ['seco', 'contexto', 'grounded'] as Modo[]) {
      const p = resolve(dir(rodada), `brutos-${id}-${modo}.jsonl`);
      if (!existsSync(p)) continue;
      const soma = lerJsonl<RegistroBruto>(p).reduce((a, r) => a + r.custo_usd, 0);
      ((custoPorModelo[rodada] ??= {})[id] = (custoPorModelo[rodada][id] ?? 0) + soma);
    }
  }
}

const pct = (x: number | null | undefined, d = 1) => (x === null || x === undefined ? '—' : `${(100 * x).toFixed(d).replace('.', ',')}%`);
const pp = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `${(100 * x).toFixed(1).replace('.', ',')}`);
const num = (n: number) => n.toLocaleString('pt-BR');
const usd = (x: number) => `US$ ${x.toFixed(2).replace('.', ',')}`;
const taxa = (r: ResumoModelo, modo: Modo) => r.condicoes[modo]?.todas;

// agregado do elenco A
const agg = { seco: { e: 0, n: 0 }, contexto: { e: 0, n: 0 }, grounded: { e: 0, n: 0 } };
for (const id of ELENCO_A) {
  const r = estudo.por_modelo[id];
  for (const modo of Object.keys(agg) as Modo[]) {
    const t = taxa(r, modo);
    if (t) {
      agg[modo].e += t.eventos;
      agg[modo].n += t.n;
    }
  }
}
const deltas = ELENCO_A.map((id) => estudo.por_modelo[id].deltas.grounded?.todas.delta ?? 0);
const deltaMedio = deltas.reduce((a, b) => a + b, 0) / deltas.length;
const execGrounded = manifesto.execucoes.find((e) => e.modo === 'grounded' && e.mcp_dados_versao);
const execV2 = manifestoV2?.execucoes.find((e) => e.modo === 'grounded' && e.mcp_tools_hash);
const custoTotal = Object.values(custoPorModelo).reduce((a, m) => a + Object.values(m).reduce((x, y) => x + y, 0), 0);
const totalRespostas = Object.values(estudo.por_modelo).reduce((a, r) => a + Object.values(r.condicoes).reduce((x, c) => x + (c.todas.n > 0 ? 300 : 0), 0), 0);

// ---------- gráfico (barras horizontais agrupadas) ----------

function graficoBarras(): string {
  const linhas = ELENCO_A.map((id) => ({ id, nome: MODELOS[id].nome, r: estudo.por_modelo[id] })).sort((a, b) => (taxa(b.r, 'seco')?.taxa ?? 0) - (taxa(a.r, 'seco')?.taxa ?? 0));
  const W = 760, esq = 170, dir_ = 60, alturaGrupo = 62, barra = 14, gap = 2, topo = 28;
  const H = topo + linhas.length * alturaGrupo + 24;
  const escala = (x: number) => esq + (x / 0.5) * (W - esq - dir_);
  const series: Array<{ modo: Modo; rotulo: string; classe: string }> = [
    { modo: 'seco', rotulo: 'Seca (só memória)', classe: 's1' },
    { modo: 'contexto', rotulo: 'Contexto (dado no prompt)', classe: 's2' },
    { modo: 'grounded', rotulo: 'MCP (consulta a fonte)', classe: 's3' },
  ];
  const grade = [0, 0.1, 0.2, 0.3, 0.4, 0.5].map((v) => `<line class="grid" x1="${escala(v)}" x2="${escala(v)}" y1="${topo - 6}" y2="${H - 20}"/><text class="eixo" x="${escala(v)}" y="${H - 6}" text-anchor="middle">${Math.round(v * 100)}%</text>`).join('');
  const grupos = linhas.map(({ nome, r }, i) => {
    const y0 = topo + i * alturaGrupo;
    const barras = series.map((s, k) => {
      const t = taxa(r, s.modo);
      const v = t?.taxa ?? 0;
      const y = y0 + k * (barra + gap);
      const x1 = escala(v);
      const rotulo = k === 0 || k === 2 ? `<text class="valor" x="${x1 + 6}" y="${y + barra - 3}">${pct(v)}</text>` : '';
      return `<g><title>${nome} · ${s.rotulo}: ${pct(v)} (${t?.eventos ?? 0} de ${t?.n ?? 0})</title><rect class="${s.classe}" x="${esq}" y="${y}" width="${Math.max(x1 - esq, 1)}" height="${barra}" rx="0"/>${v > 0.004 ? `<rect class="${s.classe}" x="${Math.max(x1 - 4, esq)}" y="${y}" width="4" height="${barra}" rx="3"/>` : ''}${rotulo}</g>`;
    }).join('');
    return `<text class="modelo" x="${esq - 10}" y="${y0 + barra + 8}" text-anchor="end">${nome}</text>${barras}`;
  }).join('');
  const legenda = series.map((s) => `<span class="leg"><i class="sw ${s.classe}"></i>${s.rotulo}</span>`).join('');
  return `<div class="legenda">${legenda}</div><div class="rolagem"><svg class="viz" viewBox="0 0 ${W} ${H}" role="img" aria-label="Taxa de alucinação por modelo nas três condições">${grade}<line class="base" x1="${esq}" x2="${esq}" y1="${topo - 6}" y2="${H - 20}"/>${grupos}</svg></div>`;
}

// ---------- tabelas ----------

function tabelaCondicoes(): string {
  const linhas = ELENCO_A.map((id) => {
    const r = estudo.por_modelo[id];
    const d = r.deltas.grounded?.todas;
    const dc = r.deltas.contexto?.todas;
    return `<tr><td>${MODELOS[id].nome}<span class="sub">${MODELOS[id].empresa}</span></td><td>${pct(taxa(r, 'seco')?.taxa)}<span class="sub">${taxa(r, 'seco')?.eventos}/${taxa(r, 'seco')?.n}</span></td><td>${pct(taxa(r, 'contexto')?.taxa)}</td><td>${pct(taxa(r, 'grounded')?.taxa)}<span class="sub">${taxa(r, 'grounded')?.eventos}/${taxa(r, 'grounded')?.n}</span></td><td>${pp(dc?.delta)} pp</td><td><b>${pp(d?.delta)} pp</b><span class="sub">IC95 [${pp(d?.ic95?.[0])}; ${pp(d?.ic95?.[1])}] · ${d?.pares} pares</span></td></tr>`;
  }).join('');
  return `<table><thead><tr><th>Modelo</th><th>Seca</th><th>Contexto</th><th>MCP</th><th>Δ contexto−seca</th><th>Δ MCP−seca</th></tr></thead><tbody>${linhas}</tbody></table>`;
}

function tabelaFonte(): string {
  const linhas = ELENCO_A.map((id) => {
    const r = estudo.por_modelo[id];
    const f = r.fonte.grounded ?? {};
    const c = r.condicoes.grounded;
    return `<tr><td>${MODELOS[id].nome}</td><td>${f.nao_chamou ?? 0}/${f.total ?? 0}</td><td>${f.chamou_e_errou ?? 0}</td><td>${f.rejeicao_negativa ?? 0}/${f.b_falsos_total ?? 0}</td><td>${f.alucinacao_residual ?? 0}/${f.c_codigos_citados ?? 0}</td><td>${c?.A.eventos}/${c?.A.n} · ${c?.D.eventos}/${c?.D.n}</td><td>${r.respostas_invalidas.grounded ?? 0}</td></tr>`;
  }).join('');
  return `<table><thead><tr><th>Modelo</th><th>Não chamou a tool</th><th>Chamou e errou</th><th>Falsos aceitos (B)</th><th>Códigos inventados (C)</th><th>Erros A · D</th><th>Inválidas</th></tr></thead><tbody>${linhas}</tbody></table>`;
}

function tabelaConnector(): string {
  const linhas = ELENCO_B.map((id) => {
    const r = estudo.por_modelo[id];
    const t = taxa(r, 'grounded');
    const f = r.fonte.grounded ?? {};
    return `<tr><td>${MODELOS[id].nome}<span class="sub">${MODELOS[id].rota}</span></td><td>${pct(t?.taxa)}<span class="sub">${t?.eventos}/${t?.n}</span></td><td>${f.nao_chamou ?? 0}/${f.total ?? 0}</td><td>${f.rejeicao_negativa ?? 0}/${f.b_falsos_total ?? 0}</td><td>${f.alucinacao_residual ?? 0}/${f.c_codigos_citados ?? 0}</td></tr>`;
  }).join('');
  return `<table><thead><tr><th>Modelo</th><th>Alucinação</th><th>Não chamou</th><th>Falsos aceitos</th><th>Inventados (C)</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr><td colspan="5" class="nota">Gemini 3.7 Flash (Interactions API): incompleto, 91 de 300 respostas, por indisponibilidade do serviço do Google em 24–25/ago; não entra na tabela.</td></tr></tfoot></table>`;
}

function tabelaSabia(): string {
  if (!estudoV2) return '';
  const linhas = ['sabia-4', 'sabiazinho-4'].map((id) => {
    const a = estudo.por_modelo[id];
    const b = estudoV2.por_modelo[id];
    const ta = taxa(a, 'grounded'); const tb = taxa(b, 'grounded');
    const fa = a.fonte.grounded ?? {}; const fb = b.fonte.grounded ?? {};
    const db = b.deltas.grounded?.todas;
    return `<tr><td>${MODELOS[id].nome}</td><td>${pct(ta?.taxa)}<span class="sub">${ta?.eventos}/${ta?.n}</span></td><td><b>${pct(tb?.taxa)}</b><span class="sub">${tb?.eventos}/${tb?.n} · Δ ${pp(db?.delta)} pp [${pp(db?.ic95?.[0])}; ${pp(db?.ic95?.[1])}]</span></td><td>${fa.rejeicao_negativa}/${fa.b_falsos_total} → <b>${fb.rejeicao_negativa}/${fb.b_falsos_total}</b></td><td>${a.condicoes.grounded?.D.eventos}/${a.condicoes.grounded?.D.n} → <b>${b.condicoes.grounded?.D.eventos}/${b.condicoes.grounded?.D.n}</b></td></tr>`;
  }).join('');
  return `<table><thead><tr><th>Modelo</th><th>MCP, busca original</th><th>MCP, busca corrigida</th><th>Falsos aceitos</th><th>Erros no lookup inverso (D)</th></tr></thead><tbody>${linhas}</tbody></table>`;
}

function tabelaCustos(): string {
  const linhas = [...ELENCO_A, ...ELENCO_B].map((id) => `<tr><td>${MODELOS[id].nome}<span class="sub">${MODELOS[id].rota}</span></td><td>${usd(custoPorModelo[args.rodada!]?.[id] ?? 0)}</td></tr>`).join('');
  const v2 = estudoV2 ? `<tr><td>Sabiá-4 e Sabiazinho-4, re-medição (busca corrigida)</td><td>${usd(Object.values(custoPorModelo[args.v2!] ?? {}).reduce((a, b) => a + b, 0))}</td></tr>` : '';
  return `<table><thead><tr><th>Modelo</th><th>Custo das condições medidas</th></tr></thead><tbody>${linhas}${v2}</tbody></table>`;
}

function ressalvas(): string {
  return [...ELENCO_A, ...ELENCO_B].filter((id) => MODELOS[id].ressalva).map((id) => `<li><b>${MODELOS[id].nome}</b> (${MODELOS[id].rota}): ${MODELOS[id].ressalva}</li>`).join('');
}

// ---------- página ----------

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Acesso à fonte: estudo de intervenção</title>
<style>
:root { color-scheme: light dark; --bg:#fcfcfb; --fg:#0b0b0b; --fg2:#52514e; --linha:#e6e5e0; --grid:#ececea; --card:#f4f4f1; --s1:#2a78d6; --s2:#eb6834; --s3:#1baf7a; --aviso:#fff4e0; --avisoborda:#eda100; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#1a1a19; --fg:#ffffff; --fg2:#c3c2b7; --linha:#33332f; --grid:#2a2a28; --card:#232321; --s1:#3987e5; --s2:#d95926; --s3:#199e70; --aviso:#2b2416; --avisoborda:#c98500; } }
:root[data-theme="dark"] { --bg:#1a1a19; --fg:#ffffff; --fg2:#c3c2b7; --linha:#33332f; --grid:#2a2a28; --card:#232321; --s1:#3987e5; --s2:#d95926; --s3:#199e70; --aviso:#2b2416; --avisoborda:#c98500; }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 900px; margin: 0 auto; padding: 32px 20px 64px; }
h1 { font-size: 2rem; line-height:1.2; margin: 0 0 4px; } h2 { font-size:1.35rem; margin: 40px 0 12px; } h3 { font-size:1.05rem; margin: 24px 0 8px; }
p, li { max-width: 72ch; } .meta { color: var(--fg2); font-size:.92rem; }
.aviso { background: var(--aviso); border-left: 4px solid var(--avisoborda); padding: 12px 16px; margin: 20px 0; border-radius: 0 6px 6px 0; }
.tiles { display:grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 12px; margin: 20px 0; }
.tile { background: var(--card); border-radius: 8px; padding: 14px 16px; } .tile .label { color: var(--fg2); font-size:.85rem; } .tile .valor { font-size: 2rem; font-weight: 600; line-height: 1.1; margin-top: 4px; } .tile .sub { color: var(--fg2); font-size:.85rem; }
table { border-collapse: collapse; width: 100%; font-size: .93rem; } th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--linha); vertical-align: top; } th { color: var(--fg2); font-weight: 600; font-size:.85rem; } td .sub, td.nota { display:block; color: var(--fg2); font-size:.8rem; }
.rolagem { overflow-x: auto; } .rolagem table { min-width: 640px; }
.viz { width: 100%; height: auto; display:block; } .viz .grid { stroke: var(--grid); stroke-width:1; } .viz .base { stroke: var(--linha); stroke-width:1; } .viz .eixo, .viz .modelo, .viz .valor { fill: var(--fg2); font-size: 12px; font-family: inherit; } .viz .modelo { fill: var(--fg); } .viz .valor { fill: var(--fg); }
.viz .s1 { fill: var(--s1); } .viz .s2 { fill: var(--s2); } .viz .s3 { fill: var(--s3); }
.legenda { display:flex; gap: 18px; flex-wrap: wrap; font-size:.88rem; color: var(--fg2); margin: 8px 0 4px; } .leg { display:inline-flex; align-items:center; gap:6px; } .sw { display:inline-block; width: 12px; height: 12px; border-radius: 3px; } .sw.s1{background:var(--s1)} .sw.s2{background:var(--s2)} .sw.s3{background:var(--s3)}
code { font-size:.9em; background: var(--card); padding: 1px 5px; border-radius: 4px; } pre { background: var(--card); padding: 12px; border-radius: 6px; overflow-x:auto; font-size:.85rem; }
details summary { cursor: pointer; color: var(--fg2); }
</style>
</head>
<body>
<main>
<h1>Acesso à fonte: quanto a alucinação sobre a BNCC cai quando o modelo tem o dado</h1>
<p class="meta">Estudo de intervenção do bncc-benchmark · rodadas <code>${args.rodada}</code>${estudoV2 ? ` e <code>${args.v2}</code>` : ''} · medido em 24–25/ago/2026 · ${num(totalRespostas)} respostas · ${usd(custoTotal)} de execução · pré-registro fechado antes da primeira chamada (<code>docs/estudo-fonte/pre-registro.md</code>).</p>

<div class="aviso"><b>Declaração de conflito de interesse.</b> A fonte de grounding (o servidor MCP <code>mcp.bncc.dev</code> e a listagem injetada no prompt) e o gabarito do benchmark são o <b>mesmo dataset</b>, mantido pelo mesmo time. Um modelo que consulta a fonte e copia acerta por construção. Por isso este documento não é um ranking de modelos "com MCP": o objeto é o <b>efeito do acesso à fonte</b>, e a condição de controle <i>contexto</i> existe para separar o mérito do dado do mérito do instrumento. O leaderboard do benchmark não é alterado por este estudo.</div>

<h2>Resultado em uma linha</h2>
<p>Sem fonte, os oito modelos erram em <b>${pct(agg.seco.e / agg.seco.n)}</b> das respostas. Com a fonte, <b>${pct(agg.contexto.e / agg.contexto.n)}</b> (dado no prompt) a <b>${pct(agg.grounded.e / agg.grounded.n)}</b> (via MCP). Em todos os modelos, sem exceção, e sem nenhum caso sistemático em que ter a fonte piorou a resposta.</p>
<div class="tiles">
<div class="tile"><div class="label">Seca (só memória)</div><div class="valor">${pct(agg.seco.e / agg.seco.n)}</div><div class="sub">${num(agg.seco.e)} erros em ${num(agg.seco.n)} respostas válidas</div></div>
<div class="tile"><div class="label">Contexto (dado no prompt)</div><div class="valor">${pct(agg.contexto.e / agg.contexto.n)}</div><div class="sub">${num(agg.contexto.e)} em ${num(agg.contexto.n)}</div></div>
<div class="tile"><div class="label">MCP (modelo consulta a fonte)</div><div class="valor">${pct(agg.grounded.e / agg.grounded.n)}</div><div class="sub">${num(agg.grounded.e)} em ${num(agg.grounded.n)}</div></div>
<div class="tile"><div class="label">Queda média por modelo, MCP − seca</div><div class="valor">${pp(deltaMedio)} pp</div><div class="sub">de ${pp(Math.max(...deltas))} a ${pp(Math.min(...deltas))} pp</div></div>
</div>

<h2>Taxa de alucinação por modelo e condição</h2>
${graficoBarras()}
<p class="meta">Barras: proporção de respostas com alucinação (A: texto inventado ou de outra habilidade; B: código falso aceito; C: códigos inexistentes por código citado; D: código errado). Respostas truncadas ou com erro de ferramenta ficam fora do denominador. A tabela abaixo traz os mesmos números com os intervalos.</p>
<div class="rolagem">${tabelaCondicoes()}</div>
<p class="meta">Δ = diferença pareada de proporções (mesmo item e paráfrase), IC 95% por bootstrap por item (${num(estudo.parametros.reamostras)} reamostras, semente ${estudo.parametros.seed}). "Pares" exclui as perguntas da tarefa B com código real e os itens especiais, que não entram no denominador de alucinação.</p>

<h2>O que acontece quando a fonte está disponível</h2>
<p>Quatro medidas que só fazem sentido com a fonte na mão, na condição MCP (300 respostas por modelo):</p>
<div class="rolagem">${tabelaFonte()}</div>
<ul>
<li><b>Todos consultam a fonte quando ela existe</b>: zero "não chamou a ferramenta" em ${num(ELENCO_A.reduce((a, id) => a + (estudo.por_modelo[id].fonte.grounded?.total ?? 0), 0))} respostas.</li>
<li><b>Ninguém inventa código em listas</b> (tarefa C) com a fonte: zero em ${num(ELENCO_A.reduce((a, id) => a + (estudo.por_modelo[id].fonte.grounded?.c_codigos_citados ?? 0), 0))} códigos citados.</li>
<li><b>Os erros residuais concentram-se em dois modelos e numa tarefa</b>: Sabiá-4 e Sabiazinho-4, no lookup inverso (dado o texto, achar o código). Não é falta de dado: na condição contexto, os dois ficam em ${pct(taxa(estudo.por_modelo['sabia-4'], 'contexto')?.taxa)} e ${pct(taxa(estudo.por_modelo['sabiazinho-4'], 'contexto')?.taxa)}. É uso frágil da busca.</li>
</ul>

<h2>Connector nativo: a empresa de IA fala com o MCP por nós</h2>
<p>Condição secundária: em vez de o harness executar o loop de ferramentas, a API da própria empresa conecta-se ao <code>mcp.bncc.dev</code> e resolve tudo numa requisição. Só quatro empresas oferecem isso (OpenAI, xAI, Anthropic, Google); três completaram.</p>
<div class="rolagem">${tabelaConnector()}</div>
<p>Nos três modelos, o resultado é o mesmo do loop feito pelo harness: 0%. O mecanismo de entrega não muda o efeito; o que muda é quem controla as voltas, o custo por resposta e a latência.</p>

${estudoV2 ? `<h2>O que o estudo devolveu ao produto: dois defeitos no <code>bncc_buscar</code></h2>
<p>Reproduzindo as chamadas dos Sabiá com os argumentos que eles enviaram, apareceram dois comportamentos do servidor que derrubam qualquer cliente que não passe o texto integral e sem filtros: o filtro <code>componente: "CO"</code> (Computação) sempre devolvia zero, e a busca exigia o trecho contíguo, na mesma ordem e com a mesma pontuação ("ritmos velocidades fluxos" não encontrava "ritmos, velocidades e fluxos"). Modelos grandes contornam (mandam o texto inteiro de primeira); os menores reformulam como palavras-chave, recebem "zero resultados" e concluem que o dado não existe, o pior modo de falha para uma fonte anti-alucinação.</p>
<p>O servidor foi corrigido e publicado em 25/ago (<code>@bncc/mcp</code> 0.3.0, worker 0.2.2). Como a versão dos dados não mudou, o harness passou a incluir na chave de cache um hash das ferramentas servidas (<code>${execV2?.mcp_tools_hash ?? ''}</code>), e os dois modelos afetados foram re-medidos na condição MCP, com 3 paráfrases, como <b>condição nova</b>, apresentada ao lado da original, nunca em substituição:</p>
<div class="rolagem">${tabelaSabia()}</div>
<p>A correção zerou os códigos falsos aceitos e as negações de códigos reais nos dois modelos e reduziu o erro total a um quarto no Sabiá-4. O que sobra é o lookup inverso: o Sabiazinho-4 não é determinístico a temperatura 0 (o mesmo item produz sequências de busca diferentes) e insiste em filtrar por Computação textos de Matemática.</p>
<p>No caminho, um terceiro achado: o worker limita 60 requisições por minuto por IP, o que agentes rápidos ultrapassam com facilidade e recebem HTTP 429 sem <code>Retry-After</code>; o cliente do harness passou a paciar 55 chamadas/min e a repetir com backoff. Três passagens da re-medição foram descartadas por defeitos do próprio cliente de medição (contagem de erros de ferramenta, semântica do <code>isError</code>, ausência de retry); os registros dessas passagens estão nas emendas do pré-registro.</p>` : ''}

<h2>Como foi medido</h2>
<ul>
<li><b>Itens</b>: os 300 itens do banco congelado <code>itens-v1</code> (88 lookup direto, 122 existência com 60 códigos falsos em três estratos e 2 especiais, 40 geração de listas, 50 lookup inverso), 1 paráfrase; mesmo gabarito do leaderboard.</li>
<li><b>Condições, pareadas no mesmo item e paráfrase</b>: <i>seca</i> (sem fonte, o protocolo do leaderboard); <i>contexto</i> (a listagem oficial do escopo do item, gerada localmente do gabarito, entra no prompt; sem ferramenta); <i>MCP</i> (as 7 ferramentas do <code>mcp.bncc.dev</code> disponíveis via function calling, loop no cliente, até 8 voltas); <i>connector nativo</i> (a API da empresa executa o loop).</li>
<li><b>Elenco</b>: 8 modelos, um por critério fixado antes da bateria: ao menos um por terço de desempenho na seca (leaderboard v0.2.0), ao menos um que raciocina antes de responder, uma rota Bedrock e rotas diretas, os dois modelos brasileiros. Alibaba (Qwen) fora por falta de acesso à API.</li>
<li><b>Rotas</b>: APIs diretas de cada empresa (DECISOES.md D14.1), sem agregador, exceto o Gemini (ressalva abaixo). Julgamento pelo avaliador v2 com juiz haiku-bedrock e rubrica-v1, os mesmos do leaderboard.</li>
<li><b>Análise</b>: fixada no pré-registro; ICs por bootstrap por item; sem correção para múltiplas comparações e sem p-valores; limites superiores pela regra do três quando há zero eventos. Regra sequencial: modelo com qualquer evento com a fonte é repetido com 3 paráfrases na condição afetada (acionada para os dois Sabiá).</li>
<li><b>Fonte</b>: dataset <code>${execGrounded?.mcp_dados_versao?.data_version ?? ''}</code> servido pelo MCP (commit <code>${execGrounded?.mcp_dados_versao?.commit?.slice(0, 7) ?? ''}</code>); harness no commit <code>${manifesto.execucoes[0]?.harness_commit ?? ''}</code>.</li>
</ul>

<h2>Ressalvas por modelo</h2>
<p>Condições que o protocolo previa e a rota direta não permite ficam declaradas, não silenciadas:</p>
<ul>${ressalvas()}</ul>
<ul>
<li>A condição seca de três modelos veio do cache da rodada oficial de 15–18/ago (mesma rota e configuração); as demais foram medidas em 24–25/ago.</li>
<li>Condição connector do Gemini incompleta (91/300) por indisponibilidade do Google; retomada prevista em versão PATCH deste estudo.</li>
<li>Os 30 itens do piloto (24/ago) foram reaproveitados do cache na bateria (mesma chave, mesma janela); contagem <code>do_cache</code> nos manifestos.</li>
</ul>

<h2>Custo</h2>
<div class="rolagem">${tabelaCustos()}</div>
<p class="meta">Custo de execução informado pelos tokens registrados em cada resposta; juiz: ${usd(manifesto.avaliacoes.reduce((a, x) => a + x.juiz_custo_usd, 0) + (manifestoV2?.avaliacoes.reduce((a, x) => a + x.juiz_custo_usd, 0) ?? 0))}.</p>

<h2>Reproduzir</h2>
<pre>pnpm executar --rodada ${args.rodada} --modelos &lt;ids&gt; --modo seco|contexto|grounded --parafrases 1
pnpm avaliar --rodada ${args.rodada}
pnpm agregar --rodada ${args.rodada} --verificar
pnpm exportar-estudo --rodada ${args.rodada} --reamostras ${estudo.parametros.reamostras}
pnpm relatorio-estudo --rodada ${args.rodada} --v2 ${args.v2}</pre>
<p class="meta">Brutos (prompt, resposta, tokens, custo, versão do modelo, chamadas de ferramenta), julgados, agregados e manifestos estão em <code>resultados/${args.rodada}/</code>${estudoV2 ? ` e <code>resultados/${args.v2}/</code>` : ''}. O CI recalcula os agregados a partir dos julgados a cada push.</p>
</main>
</body>
</html>
`;

const saida = args.saida ? resolve(RAIZ, args.saida) : resolve(dir(args.rodada!), 'estudo.html');
writeFileSync(saida, html);
console.log(`Relatório: ${saida} (${(html.length / 1024).toFixed(0)} kB)`);
