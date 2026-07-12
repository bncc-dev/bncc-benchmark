/**
 * Geração determinística do banco de itens (DECISOES.md D2, D6, D7, D8).
 * Toda a aleatoriedade vem do PRNG seedado; mesma seed, mesmo banco.
 */

import { normalizarTexto, versao } from '@bncc/dados';
import { amostrar, criarRng, embaralhar, inteiro, type Rng } from './aleatorio.js';
import {
  analisar,
  anosDe,
  detectarLacunas,
  maximosPorPrefixo,
  pad2,
  prefixosInexistentes,
} from './codigos.js';
import { todas, todosCodigos, type Aprendizagem } from './gabarito.js';
import { parafrasesA, parafrasesB, parafrasesC, parafrasesD } from '../prompts/tarefas.js';
import type { BancoItens, Estrato, Item, PedidoC } from './tipos.js';

export const DISTRIBUICAO_D2 = {
  A: 80,
  B_reais: 60,
  B_falso_extensao: 30,
  B_falso_profundo: 20,
  B_falso_combinacao: 10,
  C: 40,
  D: 50,
} as const;

/** Fração alvo de Computação nos itens (super-representação deliberada, D2). */
const FRACAO_CO = 0.2;

const NOMES: Record<string, string> = {
  AR: 'Arte',
  CI: 'Ciências',
  EF: 'Educação Física',
  ER: 'Ensino Religioso',
  GE: 'Geografia',
  HI: 'História',
  LI: 'Língua Inglesa',
  LP: 'Língua Portuguesa',
  MA: 'Matemática',
  EO: 'O eu, o outro e o nós',
  CG: 'Corpo, gestos e movimentos',
  TS: 'Traços, sons, cores e formas',
  ET: 'Espaços, tempos, quantidades, relações e transformações',
  LGG: 'Linguagens e suas Tecnologias',
  MAT: 'Matemática e suas Tecnologias',
  CNT: 'Ciências da Natureza e suas Tecnologias',
  CHS: 'Ciências Humanas e Sociais Aplicadas',
  CO: 'Computação',
};
// EF é ambíguo (componente Educação Física × campo EI "Escuta, fala...");
// o campo da EI é resolvido pelo contexto de etapa.
const NOME_CAMPO_EF_EI = 'Escuta, fala, pensamento e imaginação';

function nomeComponente(estrato: Estrato): string {
  if (estrato.etapa === 'EI' && estrato.componente === 'EF') return NOME_CAMPO_EF_EI;
  return NOMES[estrato.componente ?? ''] ?? estrato.componente ?? '';
}

/** Amostra n aprendizagens com ~20% de Computação e proporção por etapa. */
function amostrarReais(rng: Rng, n: number, usados: Set<string>): Aprendizagem[] {
  const disponiveis = todas().filter((a) => !usados.has(a.codigo));
  const co = disponiveis.filter((a) => a.estrato.modulo === 'computacao-2022');
  const b18 = disponiveis.filter((a) => a.estrato.modulo === 'bncc-2018');

  const nCo = Math.min(Math.round(n * FRACAO_CO), co.length);
  const n18 = n - nCo;

  // Proporcional por etapa dentro da BNCC-2018, com resto para o EF (maior pool).
  const porEtapa = (etapa: string) => b18.filter((a) => a.estrato.etapa === etapa);
  const pools = { EI: porEtapa('EI'), EF: porEtapa('EF'), EM: porEtapa('EM') };
  const total18 = b18.length;
  const nEI = Math.max(1, Math.round((pools.EI.length / total18) * n18));
  const nEM = Math.max(1, Math.round((pools.EM.length / total18) * n18));
  const nEF = n18 - nEI - nEM;

  const escolhidos = [
    ...amostrar(rng, co, nCo),
    ...amostrar(rng, pools.EI, nEI),
    ...amostrar(rng, pools.EF, nEF),
    ...amostrar(rng, pools.EM, nEM),
  ];
  for (const a of escolhidos) usados.add(a.codigo);
  return embaralhar(rng, escolhidos);
}

function estratoDoCodigo(codigo: string): Estrato {
  const info = analisar(codigo);
  if (!info) throw new Error(`Código sem gramática: ${codigo}`);
  return { etapa: info.etapa, modulo: info.modulo, componente: info.componente };
}

const ANTIVEXAME_PENDENTE = { status: 'pendente' as const };

function itensA(rng: Rng, usados: Set<string>, ids: () => string): Item[] {
  return amostrarReais(rng, DISTRIBUICAO_D2.A, usados).map((a) => ({
    id: ids(),
    tarefa: 'A' as const,
    tipo: 'real' as const,
    codigo: a.codigo,
    gabarito: { tipo: 'texto' as const, texto: a.texto },
    estrato: a.estrato,
    parafrases: parafrasesA(a.codigo, a.estrato.etapa),
  }));
}

function itensBReais(rng: Rng, usados: Set<string>, ids: () => string): Item[] {
  return amostrarReais(rng, DISTRIBUICAO_D2.B_reais, usados).map((a) => ({
    id: ids(),
    tarefa: 'B' as const,
    tipo: 'real' as const,
    codigo: a.codigo,
    gabarito: { tipo: 'existencia' as const, existe: true },
    estrato: a.estrato,
    parafrases: parafrasesB(a.codigo),
  }));
}

function amostrarFalsos(
  rng: Rng,
  candidatos: string[],
  n: number,
  usados: Set<string>,
): string[] {
  const livres = candidatos.filter((c) => !usados.has(c));
  const co = livres.filter((c) => analisar(c)?.modulo === 'computacao-2022');
  const b18 = livres.filter((c) => analisar(c)?.modulo === 'bncc-2018');
  const nCo = Math.min(Math.round(n * FRACAO_CO), co.length);
  const escolhidos = [...amostrar(rng, co, nCo), ...amostrar(rng, b18, n - nCo)];
  for (const c of escolhidos) usados.add(c);
  return embaralhar(rng, escolhidos);
}

function itemFalso(codigo: string, tipo: Item['tipo'], ids: () => string): Item {
  return {
    id: ids(),
    tarefa: 'B',
    tipo,
    codigo,
    gabarito: { tipo: 'existencia', existe: false },
    estrato: estratoDoCodigo(codigo),
    parafrases: parafrasesB(codigo),
    verificacao_antivexame: { ...ANTIVEXAME_PENDENTE },
  };
}

function itensBFalsos(rng: Rng, usados: Set<string>, ids: () => string): Item[] {
  const codigos = todosCodigos();
  const { extensoes } = detectarLacunas(codigos);
  const maximos = maximosPorPrefixo(codigos);

  const bordas = amostrarFalsos(rng, extensoes, DISTRIBUICAO_D2.B_falso_extensao, usados);

  const profundosCandidatos: string[] = [];
  for (const [prefixo, max] of [...maximos.entries()].sort()) {
    const alem = inteiro(rng, 2, 15);
    if (max + alem <= 99) profundosCandidatos.push(`${prefixo}${pad2(max + alem)}`);
  }
  const profundos = amostrarFalsos(
    rng,
    profundosCandidatos,
    DISTRIBUICAO_D2.B_falso_profundo,
    usados,
  );

  const combinacoes = amostrarFalsos(
    rng,
    prefixosInexistentes(codigos).map((p) => `${p}${pad2(inteiro(rng, 1, 12))}`),
    DISTRIBUICAO_D2.B_falso_combinacao,
    usados,
  );

  return [
    ...bordas.map((c) => itemFalso(c, 'falso-extensao', ids)),
    ...profundos.map((c) => itemFalso(c, 'falso-profundo', ids)),
    ...combinacoes.map((c) => itemFalso(c, 'falso-combinacao', ids)),
  ];
}

function candidatosPedidosC(): PedidoC[] {
  const pool = todas();
  const pedidos: PedidoC[] = [];

  const adicionar = (
    descricao: string,
    escopo: PedidoC['escopo'],
    filtro: (a: Aprendizagem) => boolean,
    quantidadePadrao = 5,
  ) => {
    const validos = pool.filter(filtro);
    const quantidade = Math.min(quantidadePadrao, validos.length >= 5 ? 5 : 3);
    if (validos.length >= quantidade && quantidade >= 3) {
      pedidos.push({ quantidade, descricao, escopo });
    }
  };

  // EF 2018: componente × ano.
  for (const comp of ['AR', 'CI', 'EF', 'ER', 'GE', 'HI', 'LI', 'LP', 'MA']) {
    for (let ano = 1; ano <= 9; ano++) {
      adicionar(
        `${NOMES[comp]} do ${ano}º ano do Ensino Fundamental`,
        { etapa: 'EF', modulo: 'bncc-2018', componente: comp, ano },
        (a) =>
          a.estrato.modulo === 'bncc-2018' &&
          a.estrato.componente === comp &&
          a.estrato.etapa === 'EF' &&
          anosDe(a.codigo.slice(2, 4)).includes(ano),
      );
    }
  }
  // EI 2018: campo de experiências.
  for (const campo of ['EO', 'CG', 'TS', 'EF', 'ET']) {
    const nome = campo === 'EF' ? NOME_CAMPO_EF_EI : NOMES[campo];
    adicionar(
      `do campo de experiências "${nome}" na Educação Infantil`,
      { etapa: 'EI', modulo: 'bncc-2018', componente: campo },
      (a) =>
        a.estrato.modulo === 'bncc-2018' &&
        a.estrato.etapa === 'EI' &&
        a.estrato.componente === campo,
    );
  }
  // EM 2018: área.
  for (const area of ['LGG', 'MAT', 'CNT', 'CHS']) {
    adicionar(
      `da área de ${NOMES[area]} no Ensino Médio`,
      { etapa: 'EM', modulo: 'bncc-2018', componente: area },
      (a) =>
        a.estrato.modulo === 'bncc-2018' &&
        a.estrato.etapa === 'EM' &&
        (a.estrato.componente === area || (area === 'LGG' && a.estrato.componente === 'LP')),
    );
  }
  // Computação: quatro recortes.
  const co = (a: Aprendizagem) => a.estrato.modulo === 'computacao-2022';
  adicionar('Computação na Educação Infantil', { etapa: 'EI', modulo: 'computacao-2022' }, (a) => co(a) && a.estrato.etapa === 'EI', 3);
  for (let ano = 1; ano <= 9; ano++) {
    adicionar(
      `Computação no ${ano}º ano do Ensino Fundamental`,
      { etapa: 'EF', modulo: 'computacao-2022', componente: 'CO', ano },
      (a) => co(a) && a.estrato.etapa === 'EF' && anosDe(a.codigo.slice(2, 4)).includes(ano),
    );
  }
  adicionar('Computação no Ensino Médio', { etapa: 'EM', modulo: 'computacao-2022' }, (a) => co(a) && a.estrato.etapa === 'EM');

  return pedidos;
}

function itensC(rng: Rng, ids: () => string): Item[] {
  const candidatos = candidatosPedidosC();
  const co = candidatos.filter((p) => p.escopo.modulo === 'computacao-2022');
  const b18 = candidatos.filter((p) => p.escopo.modulo === 'bncc-2018');
  const nCo = Math.min(Math.round(DISTRIBUICAO_D2.C * FRACAO_CO), co.length);
  const pedidos = embaralhar(rng, [
    ...amostrar(rng, co, nCo),
    ...amostrar(rng, b18, DISTRIBUICAO_D2.C - nCo),
  ]);

  const pool = todas();
  return pedidos.map((pedido) => {
    const validos = pool.filter((a) => {
      if (a.estrato.modulo !== pedido.escopo.modulo) return false;
      if (a.estrato.etapa !== pedido.escopo.etapa) return false;
      if (pedido.escopo.componente && pedido.escopo.modulo === 'bncc-2018') {
        const compValido =
          a.estrato.componente === pedido.escopo.componente ||
          (pedido.escopo.componente === 'LGG' && a.estrato.componente === 'LP');
        if (!compValido) return false;
      }
      if (pedido.escopo.ano !== undefined) {
        if (!anosDe(a.codigo.slice(2, 4)).includes(pedido.escopo.ano)) return false;
      }
      return true;
    });
    return {
      id: ids(),
      tarefa: 'C' as const,
      tipo: 'real' as const,
      pedido,
      gabarito: { tipo: 'lista' as const, codigosValidos: validos.map((a) => a.codigo).sort() },
      estrato: {
        etapa: pedido.escopo.etapa,
        modulo: pedido.escopo.modulo,
        componente: pedido.escopo.componente,
      },
      parafrases: parafrasesC(pedido),
    };
  });
}

function itensD(rng: Rng, usados: Set<string>, ids: () => string): Item[] {
  return amostrarReais(rng, DISTRIBUICAO_D2.D, usados).map((a) => ({
    id: ids(),
    tarefa: 'D' as const,
    tipo: 'real' as const,
    codigo: a.codigo,
    texto: a.texto,
    gabarito: { tipo: 'codigo' as const, codigo: a.codigo },
    estrato: a.estrato,
    parafrases: parafrasesD(a.texto, a.estrato.etapa),
  }));
}

/** Pares vizinhos (mesmo prefixo, sequências adjacentes) com texto parecido. */
function paresVizinhos(maximo: number): Array<[Aprendizagem, Aprendizagem]> {
  const porCodigo = new Map(todas().map((a) => [a.codigo, a]));
  const pares: Array<{ par: [Aprendizagem, Aprendizagem]; escore: number }> = [];
  for (const a of todas()) {
    const info = analisar(a.codigo);
    if (!info) continue;
    const vizinhoCodigo = `${info.prefixo}${pad2(info.sequencia + 1)}`;
    const vizinho = porCodigo.get(vizinhoCodigo);
    if (!vizinho) continue;
    const tokensA = new Set(normalizarTexto(a.texto).split(' '));
    const tokensB = new Set(normalizarTexto(vizinho.texto).split(' '));
    const intersecao = [...tokensA].filter((t) => tokensB.has(t)).length;
    const uniao = new Set([...tokensA, ...tokensB]).size;
    pares.push({ par: [a, vizinho], escore: intersecao / uniao });
  }
  pares.sort((x, y) => y.escore - x.escore || x.par[0].codigo.localeCompare(y.par[0].codigo));
  return pares.slice(0, maximo).map((p) => p.par);
}

function itensEspeciais(ids: () => string): Item[] {
  const especiais: Item[] = [
    {
      id: ids(),
      tarefa: 'B',
      tipo: 'especial',
      codigo: 'EF05CO11',
      gabarito: { tipo: 'existencia', existe: true },
      estrato: { etapa: 'EF', modulo: 'computacao-2022', componente: 'CO' },
      parafrases: parafrasesB('EF05CO11'),
      nota: 'Forma canônica do dataset (DECISOES 9-10 do bncc-dados); o documento oficial grafa EF05CO011.',
    },
    {
      id: ids(),
      tarefa: 'B',
      tipo: 'especial',
      codigo: 'EF05CO011',
      gabarito: { tipo: 'existencia', existe: false },
      estrato: { etapa: 'EF', modulo: 'computacao-2022', componente: 'CO' },
      parafrases: parafrasesB('EF05CO011'),
      nota: 'Typo do anexo oficial do Parecer CNE/CEB 2/2022 (três dígitos). Modelos treinados no PDF original podem reconhecê-la; reportar separadamente (DECISOES D6).',
      verificacao_antivexame: {
        status: 'ok',
        notas: 'A forma com typo existe no documento oficial por definição; é o ponto do item.',
      },
    },
  ];

  for (const [a, vizinho] of paresVizinhos(8)) {
    especiais.push({
      id: ids(),
      tarefa: 'A',
      tipo: 'especial',
      codigo: a.codigo,
      gabarito: { tipo: 'texto', texto: a.texto },
      estrato: a.estrato,
      parafrases: parafrasesA(a.codigo, a.estrato.etapa),
      nota: `Vizinho de texto similar: ${vizinho.codigo}. Mede confusão fina entre códigos adjacentes.`,
    });
  }
  return especiais;
}

export function gerarBanco(seed: number): BancoItens {
  const rng = criarRng(seed);
  const usados = new Set<string>();

  const contadores: Record<string, number> = {};
  const ids = (tarefa: string) => () => {
    contadores[tarefa] = (contadores[tarefa] ?? 0) + 1;
    return `${tarefa}-${String(contadores[tarefa]).padStart(3, '0')}`;
  };

  const itens: Item[] = [
    ...itensA(rng, usados, ids('a')),
    ...itensBReais(rng, usados, ids('b')),
    ...itensBFalsos(rng, usados, ids('b')),
    ...itensC(rng, ids('c')),
    ...itensD(rng, usados, ids('d')),
    ...itensEspeciais(ids('esp')),
  ];

  const distribuicao: Record<string, number> = {};
  for (const item of itens) {
    const chave = `${item.tarefa}:${item.tipo}`;
    distribuicao[chave] = (distribuicao[chave] ?? 0) + 1;
  }

  return {
    versao: 'v1-rc',
    seed,
    dataset_versao: versao().data_version,
    gerado_em: new Date().toISOString(),
    distribuicao,
    itens,
  };
}
