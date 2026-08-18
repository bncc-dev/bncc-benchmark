/**
 * Destilação de uma rodada julgada para o site público (bncc.dev/benchmark).
 *
 * Implementação canônica da NOTA COMPOSTA (0-100) do leaderboard: média
 * simples de cinco taxas, uma por dimensão de alucinação:
 *   1. B reais confirmados (%)          — reconhece o que existe
 *   2. 100 − invenção pura (%)          — não aceita códigos falsos LIMPOS (D10)
 *   3. A fiel (%)                       — transcreve sem inventar texto
 *   4. D correto (%)                    — acha o código a partir do texto
 *   5. C texto ok / códigos citados (%) — gera citações fiéis
 * "Invenção pura" usa só os falsos da categoria anti-vexame 'limpo';
 * 'derivado' e 'cinzenta-federal' são reportados à parte como
 * "confusão com currículo derivado" (protocolo D10).
 */

import type { BancoItens, Item, Julgamento, RegistroBruto } from './tipos.js';

export interface Apresentacao {
  nome: string;
  empresa: string;
  tier: 'topo de linha' | 'econômico';
}

export interface MetricasModelo {
  /** Taxas 0-1, exceto nota (0-100) e custo (US$). */
  nota: number;
  b_reais: number;
  invencao_pura: number;
  confusao_derivado: number;
  a_fiel: number;
  a_aluc: number;
  a_abstencao: number;
  d_ok: number;
  c_inventados: number;
  c_texto_ok: number;
  c_citados: number;
  cortados: number;
  custo_usd: number;
}

export interface ExemploCurado {
  rotulo: 'invencao' | 'abstencao' | 'confusao';
  pergunta: string;
  resposta: string;
  explicacao: string;
}

export interface ModeloExport extends MetricasModelo {
  id: string;
  posicao: number;
  nome: string;
  empresa: string;
  tier: string;
  /**
   * Endpoints que de fato serviram as chamadas, com a contagem de cada um
   * (D9: provedores diferentes são medições distintas, e o leaderboard
   * identifica o provedor). Normalmente uma entrada só; mais de uma sinaliza
   * que o roteamento variou dentro da mesma medição.
   */
  rotas: Record<string, number>;
  exemplos: ExemploCurado[];
}

export interface AmostraCrua {
  item_id: string;
  parafrase: number;
  modelo: string;
  nome_modelo: string;
  tarefa: string;
  pergunta: string;
  resposta: string;
  veredito: string;
  ok: boolean;
}

export interface RecorteLinha {
  rotulo: string;
  taxa: number;
}

export interface ExportSite {
  meta: {
    rodada: string;
    versao: string;
    itens_versao: string;
    total_itens: number;
    dataset_versao: string;
    avaliador_versao: string;
    total_respostas: number;
    total_modelos: number;
    abstencoes_a: number;
    medido_em: string;
    custo_total_usd: number;
  };
  modelos: ModeloExport[];
  recortes: { por_etapa: RecorteLinha[]; por_modulo: RecorteLinha[] };
  amostras: AmostraCrua[];
  /** Amostra maior por modelo (id → respostas), para o drawer de JSON bruto do site. */
  amostras_drawer: Record<string, AmostraCrua[]>;
}

const pct = (n: number, d: number): number => (d > 0 ? n / d : 0);

interface Contadores {
  br_ok: number;
  br_n: number;
  limpo_aceito: number;
  limpo_n: number;
  deriv_aceito: number;
  deriv_n: number;
  a_fiel: number;
  a_aluc: number;
  a_abst: number;
  a_n: number;
  d_ok: number;
  d_n: number;
  c_citados: number;
  c_inventados: number;
  c_texto_ok: number;
  invalidas: number;
}

function contar(julgados: Julgamento[]): Contadores {
  const c: Contadores = {
    br_ok: 0, br_n: 0, limpo_aceito: 0, limpo_n: 0, deriv_aceito: 0, deriv_n: 0,
    a_fiel: 0, a_aluc: 0, a_abst: 0, a_n: 0, d_ok: 0, d_n: 0,
    c_citados: 0, c_inventados: 0, c_texto_ok: 0, invalidas: 0,
  };
  for (const j of julgados) {
    if (j.veredito === 'resposta_invalida') {
      c.invalidas++;
      continue;
    }
    if (j.tarefa === 'B') {
      if (j.tipo === 'real') {
        c.br_n++;
        if (j.veredito === 'correto') c.br_ok++;
      } else if (j.tipo.startsWith('falso')) {
        const aceitou = j.veredito === 'incorreto' ? 1 : 0;
        if (j.antivexame_categoria === 'limpo') {
          c.limpo_n++;
          c.limpo_aceito += aceitou;
        } else if (j.antivexame_categoria) {
          // 'derivado' e 'cinzenta-federal' contam juntos como confusão-derivado
          c.deriv_n++;
          c.deriv_aceito += aceitou;
        }
      }
    } else if (j.tarefa === 'A') {
      c.a_n++;
      if (j.veredito === 'fiel_exato' || j.veredito === 'fiel_parafrase') c.a_fiel++;
      else if (j.veredito === 'inventado' || j.veredito === 'texto_de_outra') c.a_aluc++;
      else if (j.veredito === 'abstencao') c.a_abst++;
    } else if (j.tarefa === 'D') {
      c.d_n++;
      if (j.veredito === 'correto') c.d_ok++;
    } else if (j.tarefa === 'C') {
      for (const cit of j.codigos_citados ?? []) {
        c.c_citados++;
        if (!cit.existe) c.c_inventados++;
        if (cit.texto === 'ok') c.c_texto_ok++;
      }
    }
  }
  return c;
}

export function calcularMetricas(julgados: Julgamento[], custoUsd: number): MetricasModelo {
  const c = contar(julgados);
  const dimensoes = [
    pct(c.br_ok, c.br_n),
    1 - pct(c.limpo_aceito, c.limpo_n),
    pct(c.a_fiel, c.a_n),
    pct(c.d_ok, c.d_n),
    pct(c.c_texto_ok, c.c_citados),
  ];
  return {
    nota: (dimensoes.reduce((s, d) => s + d, 0) / dimensoes.length) * 100,
    b_reais: pct(c.br_ok, c.br_n),
    invencao_pura: pct(c.limpo_aceito, c.limpo_n),
    confusao_derivado: pct(c.deriv_aceito, c.deriv_n),
    a_fiel: pct(c.a_fiel, c.a_n),
    a_aluc: pct(c.a_aluc, c.a_n),
    a_abstencao: pct(c.a_abst, c.a_n),
    d_ok: pct(c.d_ok, c.d_n),
    c_inventados: pct(c.c_inventados, c.c_citados),
    c_texto_ok: pct(c.c_texto_ok, c.c_citados),
    c_citados: c.c_citados,
    cortados: c.invalidas,
    custo_usd: custoUsd,
  };
}

/** Taxa de alucinação na tarefa A (inventado + texto_de_outra), no recorte dado. */
function recorteA(julgados: Julgamento[], grupo: (j: Julgamento) => string | null): RecorteLinha[] {
  const acc = new Map<string, { aluc: number; n: number }>();
  for (const j of julgados) {
    if (j.tarefa !== 'A' || j.veredito === 'resposta_invalida') continue;
    const chave = grupo(j);
    if (!chave) continue;
    const g = acc.get(chave) ?? { aluc: 0, n: 0 };
    g.n++;
    if (j.veredito === 'inventado' || j.veredito === 'texto_de_outra') g.aluc++;
    acc.set(chave, g);
  }
  return [...acc.entries()]
    .map(([rotulo, g]) => ({ rotulo, taxa: pct(g.aluc, g.n) }))
    .sort((a, b) => a.taxa - b.taxa);
}

const LIMITE_TRECHO = 320;
const aparar = (s: string): string =>
  s.length > LIMITE_TRECHO ? `${s.slice(0, LIMITE_TRECHO).trimEnd()} [...]` : s;

function juntarBruto(
  brutos: RegistroBruto[],
): Map<string, RegistroBruto> {
  return new Map(brutos.map((r) => [`${r.item_id}:${r.parafrase}`, r]));
}

/** Exemplos curados por modelo: prioriza invenção pura na B, depois A alucinada. */
function curarExemplos(
  julgados: Julgamento[],
  porChave: Map<string, RegistroBruto>,
  itens: Map<string, Item>,
): ExemploCurado[] {
  const exemplos: ExemploCurado[] = [];
  const pegar = (j: Julgamento): RegistroBruto | undefined =>
    porChave.get(`${j.item_id}:${j.parafrase}`);

  const invencaoB = julgados.find(
    (j) => j.tarefa === 'B' && j.antivexame_categoria === 'limpo' && j.veredito === 'incorreto',
  );
  if (invencaoB) {
    const r = pegar(invencaoB);
    const item = itens.get(invencaoB.item_id);
    if (r && item) {
      exemplos.push({
        rotulo: 'invencao',
        pergunta: aparar(r.prompt),
        resposta: aparar(r.resposta),
        explicacao: `O código ${item.codigo} não existe em nenhuma fonte, nem oficial nem em currículo derivado, e o modelo o confirmou como real.`,
      });
    }
  }

  const alucA = julgados.find((j) => j.tarefa === 'A' && j.veredito === 'inventado');
  if (exemplos.length < 2 && alucA) {
    const r = pegar(alucA);
    const item = itens.get(alucA.item_id);
    if (r && item) {
      exemplos.push({
        rotulo: 'invencao',
        pergunta: aparar(r.prompt),
        resposta: aparar(r.resposta),
        explicacao: `O texto apresentado como sendo de ${item.codigo} não corresponde ao texto oficial da habilidade.`,
      });
    }
  }

  if (exemplos.length === 0) {
    const confusao = julgados.find(
      (j) => j.tarefa === 'B' && j.antivexame_categoria === 'derivado' && j.veredito === 'incorreto',
    );
    if (confusao) {
      const r = pegar(confusao);
      const item = itens.get(confusao.item_id);
      if (r && item) {
        exemplos.push({
          rotulo: 'confusao',
          pergunta: aparar(r.prompt),
          resposta: aparar(r.resposta),
          explicacao: `O código ${item.codigo} não existe na BNCC, mas existe em currículo derivado dela; o modelo confundiu as duas coisas.`,
        });
      }
    }
  }
  return exemplos.slice(0, 2);
}

/** Um julgamento conta como acerto para fins de rótulo da amostra. */
function ehOk(j: Julgamento): boolean {
  return ['correto', 'fiel_exato', 'fiel_parafrase', 'abstencao'].includes(j.veredito);
}

/**
 * Amostra maior por modelo para o drawer de JSON bruto do site: até `porModelo`
 * respostas reais, distribuídas em rodízio pelas tarefas A/B/C/D e com os erros
 * na frente dos acertos dentro de cada tarefa. Determinística (sem aleatório).
 */
function amostrarDrawer(
  julgadosPorModelo: Map<string, Julgamento[]>,
  brutosPorModelo: Map<string, Map<string, RegistroBruto>>,
  apresentacao: Record<string, Apresentacao>,
  porModelo: number,
): Record<string, AmostraCrua[]> {
  const saida: Record<string, AmostraCrua[]> = {};
  const chave = (j: Julgamento): string => `${j.item_id}:${j.parafrase}`;
  const ordenar = (a: Julgamento, b: Julgamento): number => {
    const ea = ehOk(a) ? 1 : 0;
    const eb = ehOk(b) ? 1 : 0;
    if (ea !== eb) return ea - eb; // erros primeiro
    return chave(a).localeCompare(chave(b));
  };

  for (const modelo of [...julgadosPorModelo.keys()].sort()) {
    const porChave = brutosPorModelo.get(modelo)!;
    const porTarefa = new Map<string, Julgamento[]>();
    for (const j of julgadosPorModelo.get(modelo)!) {
      const grupo = porTarefa.get(j.tarefa) ?? [];
      grupo.push(j);
      porTarefa.set(j.tarefa, grupo);
    }
    for (const grupo of porTarefa.values()) grupo.sort(ordenar);

    const tarefas = ['A', 'B', 'C', 'D'];
    const escolhidas: Julgamento[] = [];
    for (let i = 0; escolhidas.length < porModelo; i++) {
      let avancou = false;
      for (const t of tarefas) {
        const grupo = porTarefa.get(t);
        if (grupo && grupo[i]) {
          escolhidas.push(grupo[i]);
          avancou = true;
          if (escolhidas.length >= porModelo) break;
        }
      }
      if (!avancou) break;
    }

    saida[modelo] = escolhidas
      .map((j): AmostraCrua | null => {
        const r = porChave.get(chave(j));
        if (!r) return null;
        return {
          item_id: j.item_id,
          parafrase: j.parafrase,
          modelo,
          nome_modelo: apresentacao[modelo]?.nome ?? modelo,
          tarefa: j.tarefa,
          pergunta: aparar(r.prompt),
          resposta: aparar(r.resposta),
          veredito: j.veredito,
          ok: ehOk(j),
        };
      })
      .filter((a): a is AmostraCrua => a !== null)
      .slice(0, porModelo);
  }
  return saida;
}

/** Amostra determinística de respostas cruas: erros e acertos notáveis por tarefa. */
function amostrar(
  julgadosPorModelo: Map<string, Julgamento[]>,
  brutosPorModelo: Map<string, Map<string, RegistroBruto>>,
  apresentacao: Record<string, Apresentacao>,
  limite: number,
): AmostraCrua[] {
  const amostras: AmostraCrua[] = [];
  const vagasPorModelo = Math.max(1, Math.floor(limite / julgadosPorModelo.size));
  const modelos = [...julgadosPorModelo.keys()].sort();
  const okDe = ehOk;

  for (const modelo of modelos) {
    const julgados = julgadosPorModelo.get(modelo)!;
    const porChave = brutosPorModelo.get(modelo)!;
    const candidatos = [
      julgados.find((j) => j.tarefa === 'B' && j.antivexame_categoria === 'limpo' && j.veredito === 'incorreto'),
      julgados.find((j) => j.tarefa === 'A' && j.veredito === 'inventado'),
      julgados.find((j) => j.tarefa === 'B' && j.tipo === 'real' && j.veredito === 'correto'),
      julgados.find((j) => j.tarefa === 'A' && j.veredito === 'fiel_exato'),
      julgados.find((j) => j.tarefa === 'D' && j.veredito === 'incorreto'),
    ].filter((j): j is Julgamento => Boolean(j));
    let usadas = 0;
    for (const j of candidatos) {
      if (usadas >= vagasPorModelo) break;
      const r = porChave.get(`${j.item_id}:${j.parafrase}`);
      if (!r) continue;
      amostras.push({
        item_id: j.item_id,
        parafrase: j.parafrase,
        modelo,
        nome_modelo: apresentacao[modelo]?.nome ?? modelo,
        tarefa: j.tarefa,
        pergunta: aparar(r.prompt),
        resposta: aparar(r.resposta),
        veredito: j.veredito,
        ok: okDe(j),
      });
      usadas++;
    }
  }
  return amostras.slice(0, limite);
}

export interface EntradaExport {
  rodada: string;
  versao: string;
  banco: BancoItens;
  itens: Map<string, Item>;
  julgados: Julgamento[];
  brutos: Map<string, RegistroBruto[]>;
  apresentacao: Record<string, Apresentacao>;
  limiteAmostras?: number;
}

export function montarExport(entrada: EntradaExport): ExportSite {
  const { rodada, versao, banco, itens, julgados, brutos, apresentacao } = entrada;

  const julgadosPorModelo = new Map<string, Julgamento[]>();
  for (const j of julgados) {
    if (!apresentacao[j.modelo]) continue; // ignora modelos fora do elenco (ex.: adiados)
    const grupo = julgadosPorModelo.get(j.modelo) ?? [];
    grupo.push(j);
    julgadosPorModelo.set(j.modelo, grupo);
  }

  const brutosPorModelo = new Map<string, Map<string, RegistroBruto>>();
  let custoTotal = 0;
  let totalRespostas = 0;
  let medidoEm = '';
  for (const [modelo, registros] of brutos) {
    brutosPorModelo.set(modelo, juntarBruto(registros));
    totalRespostas += registros.length;
    for (const r of registros) {
      custoTotal += r.custo_usd;
      if (r.timestamp > medidoEm) medidoEm = r.timestamp;
    }
  }

  const modelos: ModeloExport[] = [...julgadosPorModelo.entries()]
    .map(([id, js]) => {
      const registros = brutos.get(id) ?? [];
      const custo = registros.reduce((s, r) => s + r.custo_usd, 0);
      const metricas = calcularMetricas(js, custo);
      const rotas: Record<string, number> = {};
      for (const r of registros) rotas[r.versao_modelo] = (rotas[r.versao_modelo] ?? 0) + 1;
      return {
        id,
        posicao: 0,
        ...apresentacao[id],
        ...metricas,
        rotas,
        exemplos: curarExemplos(js, brutosPorModelo.get(id) ?? new Map(), itens),
      };
    })
    .sort((a, b) => b.nota - a.nota)
    .map((m, i) => ({ ...m, posicao: i + 1 }));

  const julgadosElenco = julgados.filter((j) => apresentacao[j.modelo]);
  const NOME_ETAPA: Record<string, string> = { EI: 'Infantil', EF: 'Fundamental', EM: 'Médio' };
  const NOME_MODULO: Record<string, string> = {
    'bncc-2018': 'BNCC 2018',
    'computacao-2022': 'Computação 2022',
  };

  return {
    meta: {
      rodada,
      versao,
      itens_versao: banco.versao,
      total_itens: banco.itens.length,
      dataset_versao: banco.dataset_versao,
      avaliador_versao: julgados[0]?.avaliador_versao ?? '?',
      total_respostas: totalRespostas,
      total_modelos: modelos.length,
      abstencoes_a: julgadosElenco.filter((j) => j.tarefa === 'A' && j.veredito === 'abstencao')
        .length,
      medido_em: medidoEm.slice(0, 10),
      custo_total_usd: Math.round(custoTotal * 100) / 100,
    },
    modelos,
    recortes: {
      por_etapa: recorteA(julgadosElenco, (j) => NOME_ETAPA[j.estrato.etapa] ?? null),
      por_modulo: recorteA(julgadosElenco, (j) => NOME_MODULO[j.estrato.modulo] ?? null),
    },
    amostras: amostrar(julgadosPorModelo, brutosPorModelo, apresentacao, entrada.limiteAmostras ?? 34),
    amostras_drawer: amostrarDrawer(julgadosPorModelo, brutosPorModelo, apresentacao, 10),
  };
}
