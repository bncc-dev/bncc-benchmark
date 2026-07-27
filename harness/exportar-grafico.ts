/**
 * CLI: desenha a dispersão fidelidade × aceitação de códigos falsos a partir do
 * leaderboard exportado, em SVG (uma versão clara e uma escura).
 *
 *   pnpm exportar-grafico --rodada oficial-seca-2026-07 --versao v0.1.0
 *
 * Artefato DERIVADO do leaderboard: não lê julgados nem altera resultado algum.
 * Existe como script, e não como SVG escrito à mão, para que o gráfico não possa
 * divergir dos números publicados.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { values: args } = parseArgs({
  allowPositionals: true,
  options: {
    rodada: { type: 'string' },
    versao: { type: 'string' },
    destacar: { type: 'string', default: '5' },
  },
});
if (!args.rodada || !args.versao) {
  throw new Error('Uso: pnpm exportar-grafico --rodada <rodada> --versao <vX.Y.Z>');
}

const dirSite = resolve(RAIZ, 'resultados', args.rodada, 'site');
const leaderboard = JSON.parse(
  readFileSync(resolve(dirSite, `leaderboard-${args.versao}.json`), 'utf8'),
) as { modelos: ModeloLeaderboard[] };

interface ModeloLeaderboard {
  id: string;
  posicao: number;
  nome: string;
  a_fiel: number;
  invencao_pura: number;
}

/** Tema: superfície, tinta e o hue de destaque. Escuro é escolhido, não invertido. */
interface Tema {
  nome: 'claro' | 'escuro';
  superficie: string;
  tintaPrimaria: string;
  tintaSecundaria: string;
  destaque: string;
  contexto: string;
  grade: string;
}

const TEMAS: Tema[] = [
  {
    nome: 'claro',
    superficie: '#fcfcfb',
    tintaPrimaria: '#0b0b0b',
    tintaSecundaria: '#52514e',
    destaque: '#2a78d6',
    contexto: '#a3a29c',
    grade: '#e6e5e1',
  },
  {
    nome: 'escuro',
    superficie: '#1a1a19',
    tintaPrimaria: '#ffffff',
    tintaSecundaria: '#c3c2b7',
    destaque: '#3987e5',
    contexto: '#6e6d67',
    grade: '#333330',
  },
];

const L = { esq: 78, dir: 150, topo: 92, base: 58 };
const W = 880;
const H = 500;
const areaW = W - L.esq - L.dir;
const areaH = H - L.topo - L.base;

/**
 * O eixo x para em 60%: nenhum modelo passa disso, e esticar até 100% deixaria
 * quase metade do gráfico vazio. A folga à direita (L.dir) existe para os
 * rótulos dos pontos mais à direita caberem sem sair da tela.
 */
const X_MAX = 0.6;
const TICKS_X = [0, 0.15, 0.3, 0.45, 0.6];
const TICKS_Y = [0, 0.25, 0.5, 0.75, 1];

const x = (v: number) => L.esq + (v / X_MAX) * areaW;
const y = (v: number) => L.topo + (1 - v) * areaH;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const nDestaque = Number(args.destacar);
const modelos = [...leaderboard.modelos].sort((a, b) => a.posicao - b.posicao);

/**
 * Rótulos apenas nos destacados, deslocados para não colidir: à direita por
 * padrão, à esquerda perto da borda, com empurrão vertical entre vizinhos.
 */
function posicionarRotulos(destacados: ModeloLeaderboard[]) {
  const postos: { m: ModeloLeaderboard; lx: number; ly: number; anchor: string }[] = [];
  for (const m of destacados) {
    const px = x(m.invencao_pura);
    const py = y(m.a_fiel);
    const paraEsquerda = px > L.esq + areaW * 0.82;
    let ly = py + 4;
    for (const p of postos) {
      if (Math.abs(p.ly - ly) < 15 && Math.abs(p.lx - (paraEsquerda ? px - 14 : px + 14)) < 190) {
        ly = p.ly + 16;
      }
    }
    postos.push({
      m,
      lx: paraEsquerda ? px - 14 : px + 14,
      ly,
      anchor: paraEsquerda ? 'end' : 'start',
    });
  }
  return postos;
}

function desenhar(t: Tema): string {
  const p: string[] = [];
  p.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">`,
  );
  p.push(`<rect width="${W}" height="${H}" fill="${t.superficie}"/>`);

  // Título e subtítulo: uma série só, então o título nomeia o que está plotado.
  p.push(
    `<text x="${L.esq}" y="30" fill="${t.tintaPrimaria}" font-size="17" font-weight="600">Fidelidade ao texto oficial × aceitação de códigos inventados</text>`,
  );
  p.push(
    `<text x="${L.esq}" y="50" fill="${t.tintaSecundaria}" font-size="13">17 modelos · rodada oficial-seca-2026-07 · sem acesso à fonte. Canto superior esquerdo é o melhor desempenho.</text>`,
  );
  p.push(
    `<text x="${L.esq}" y="70" fill="${t.tintaSecundaria}" font-size="12.5">Em azul, os 5 melhores por nota composta; em cinza, os outros 12.</text>`,
  );

  // Grade recessiva, hairline, sólida.
  for (const v of TICKS_Y) {
    p.push(
      `<line x1="${L.esq}" y1="${y(v)}" x2="${L.esq + areaW}" y2="${y(v)}" stroke="${t.grade}" stroke-width="1"/>`,
    );
    p.push(
      `<text x="${L.esq - 12}" y="${y(v) + 4}" fill="${t.tintaSecundaria}" font-size="12" text-anchor="end">${v * 100}%</text>`,
    );
  }
  for (const v of TICKS_X) {
    p.push(
      `<line x1="${x(v)}" y1="${L.topo}" x2="${x(v)}" y2="${L.topo + areaH}" stroke="${t.grade}" stroke-width="1"/>`,
    );
    p.push(
      `<text x="${x(v)}" y="${L.topo + areaH + 22}" fill="${t.tintaSecundaria}" font-size="12" text-anchor="middle">${v * 100}%</text>`,
    );
  }

  p.push(
    `<text x="${L.esq}" y="${H - 14}" fill="${t.tintaSecundaria}" font-size="13">Aceitou como real um código que não existe na BNCC  →</text>`,
  );
  p.push(
    `<text transform="translate(22 ${L.topo + areaH / 2}) rotate(-90)" fill="${t.tintaSecundaria}" font-size="13" text-anchor="middle">Reproduziu o texto oficial  →</text>`,
  );

  const destacados = modelos.slice(0, nDestaque);
  const contexto = modelos.slice(nDestaque);

  // Contexto primeiro, para os destacados ficarem por cima.
  for (const m of contexto) {
    p.push(
      `<circle cx="${x(m.invencao_pura).toFixed(1)}" cy="${y(m.a_fiel).toFixed(1)}" r="6" fill="${t.contexto}" stroke="${t.superficie}" stroke-width="2"/>`,
    );
  }
  for (const m of destacados) {
    p.push(
      `<circle cx="${x(m.invencao_pura).toFixed(1)}" cy="${y(m.a_fiel).toFixed(1)}" r="7" fill="${t.destaque}" stroke="${t.superficie}" stroke-width="2"/>`,
    );
  }

  // Rótulos em tinta de texto, nunca na cor da série.
  for (const r of posicionarRotulos(destacados)) {
    p.push(
      `<text x="${r.lx.toFixed(1)}" y="${r.ly.toFixed(1)}" fill="${t.tintaPrimaria}" font-size="12.5" text-anchor="${r.anchor}">${esc(r.m.nome)}</text>`,
    );
  }

  p.push('</svg>');
  return p.join('\n');
}

for (const tema of TEMAS) {
  const caminho = resolve(dirSite, `dispersao-${args.versao}-${tema.nome}.svg`);
  writeFileSync(caminho, desenhar(tema), 'utf8');
  console.log(`Gráfico (${tema.nome}): ${caminho}`);
}
