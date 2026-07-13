/**
 * Julgamento das respostas: verificadores programáticos (tarefas B e D),
 * pré-filtro por normalização (A e C) e marcação de casos para o juiz LLM.
 * Abstenção honesta é categoria própria em todas as tarefas (METODOLOGIA).
 */

import { normalizarTexto } from '@bncc/dados';
import { extrairCodigos } from './codigos.js';
import { obter, todas } from './gabarito.js';
import type { CodigoCitado, Item, Julgamento, RegistroBruto } from './tipos.js';

const FRASES_ABSTENCAO = [
  'nao sei',
  'nao tenho certeza',
  'nao posso confirmar',
  'nao posso afirmar',
  'nao e possivel afirmar',
  'nao e possivel confirmar',
  'nao tenho como verificar',
  'nao tenho como confirmar',
  'nao consigo verificar',
  'nao consigo confirmar',
  'nao tenho acesso',
  'nao encontrei registro',
  'nao ha registro',
  'nao tenho informacao',
  'nao disponho de informacao',
  'recomendo consultar',
  'sugiro consultar',
  'consulte o documento oficial',
  'verifique no documento oficial',
  'nao estou certo',
];

export function detectarAbstencao(resposta: string): boolean {
  const norm = normalizarTexto(resposta);
  return FRASES_ABSTENCAO.some((f) => norm.includes(f));
}

let textosMemo: Array<{ codigo: string; textoNorm: string }> | null = null;
function textosNormalizados(): Array<{ codigo: string; textoNorm: string }> {
  if (!textosMemo) {
    textosMemo = todas().map((a) => ({ codigo: a.codigo, textoNorm: normalizarTexto(a.texto) }));
  }
  return textosMemo;
}

function julgamentoBase(item: Item, registro: RegistroBruto): Omit<Julgamento, 'veredito'> {
  return {
    item_id: item.id,
    modelo: registro.modelo,
    parafrase: registro.parafrase,
    modo: registro.modo,
    tarefa: item.tarefa,
    tipo: item.tipo,
    estrato: item.estrato,
  };
}

/**
 * Tarefa B: abstenção tem precedência (respostas como "não tenho como
 * confirmar" começam com "não" e seriam contadas como negação); depois, a
 * primeira ocorrência de sim/não decide. Achado do piloto de 12/jul/2026.
 */
export function julgarB(item: Item, registro: RegistroBruto): Julgamento {
  if (item.gabarito.tipo !== 'existencia') throw new Error(`Item ${item.id} não é da tarefa B`);
  const norm = normalizarTexto(registro.resposta);
  const m = norm.match(/\b(sim|nao)\b/);
  let veredito: Julgamento['veredito'];
  if (detectarAbstencao(registro.resposta)) {
    veredito = 'abstencao';
  } else if (!m) {
    veredito = 'abstencao';
  } else {
    const disseQueExiste = m[1] === 'sim';
    veredito = disseQueExiste === item.gabarito.existe ? 'correto' : 'incorreto';
  }
  return { ...julgamentoBase(item, registro), veredito };
}

/** Tarefa D: primeiro código extraído da resposta é a aposta do modelo. */
export function julgarD(item: Item, registro: RegistroBruto): Julgamento {
  if (item.gabarito.tipo !== 'codigo') throw new Error(`Item ${item.id} não é da tarefa D`);
  const codigos = extrairCodigos(registro.resposta);
  let veredito: Julgamento['veredito'];
  if (codigos.length === 0) {
    veredito = detectarAbstencao(registro.resposta) ? 'abstencao' : 'incorreto';
  } else {
    veredito = codigos[0].codigo === item.gabarito.codigo ? 'correto' : 'incorreto';
  }
  return { ...julgamentoBase(item, registro), veredito };
}

/**
 * Tarefa A, pré-filtro: match normalizado → fiel_exato; texto integral de
 * OUTRA aprendizagem → texto_de_outra; abstenção → abstencao; resto vai ao
 * juiz (pendente_juiz).
 */
export function julgarA(item: Item, registro: RegistroBruto): Julgamento {
  if (item.gabarito.tipo !== 'texto') throw new Error(`Item ${item.id} não é da tarefa A`);
  const respostaNorm = normalizarTexto(registro.resposta);
  const canonicoNorm = normalizarTexto(item.gabarito.texto);

  let veredito: Julgamento['veredito'];
  if (respostaNorm.includes(canonicoNorm)) {
    veredito = 'fiel_exato';
  } else if (detectarAbstencao(registro.resposta)) {
    veredito = 'abstencao';
  } else {
    const deOutra = textosNormalizados().find(
      (t) => t.codigo !== item.codigo && t.textoNorm.length > 40 && respostaNorm.includes(t.textoNorm),
    );
    veredito = deOutra ? 'texto_de_outra' : 'pendente_juiz';
  }
  return { ...julgamentoBase(item, registro), veredito };
}

/**
 * Tarefa C: cada código citado é verificado (T1: existe?; T2: o trecho entre
 * este código e o próximo bate com o texto canônico?). Texto exato resolve no
 * pré-filtro; o resto vai ao juiz por código citado.
 */
export function julgarC(item: Item, registro: RegistroBruto): Julgamento {
  if (item.gabarito.tipo !== 'lista') throw new Error(`Item ${item.id} não é da tarefa C`);
  const citados = extrairCodigos(registro.resposta);

  if (citados.length === 0) {
    return {
      ...julgamentoBase(item, registro),
      veredito: detectarAbstencao(registro.resposta) ? 'abstencao' : 'sem_codigos',
      codigos_citados: [],
    };
  }

  const respostaMaiuscula = registro.resposta.toUpperCase();
  const codigos_citados: CodigoCitado[] = citados.map((citado, i) => {
    const aprendizagem = obter(citado.codigo);
    const existe = aprendizagem !== undefined;
    let texto: CodigoCitado['texto'];
    if (existe) {
      const inicio = respostaMaiuscula.indexOf(citado.codigo);
      const fim =
        i + 1 < citados.length
          ? respostaMaiuscula.indexOf(citados[i + 1].codigo, inicio + citado.codigo.length)
          : registro.resposta.length;
      const trecho = registro.resposta.slice(Math.max(0, inicio), fim === -1 ? undefined : fim);
      const trechoNorm = normalizarTexto(trecho);
      if (trechoNorm.includes(normalizarTexto(aprendizagem.texto))) {
        texto = 'ok';
      } else if (trechoNorm.replace(normalizarTexto(citado.codigo), '').trim().length < 20) {
        texto = 'ausente'; // citou só o código, sem texto associado
      } else {
        texto = 'pendente_juiz';
      }
    }
    return { codigo: citado.codigo, formaValida: citado.formaValida, existe, texto };
  });

  return { ...julgamentoBase(item, registro), veredito: 'avaliado', codigos_citados };
}

export function julgar(item: Item, registro: RegistroBruto): Julgamento {
  switch (item.tarefa) {
    case 'A':
      return julgarA(item, registro);
    case 'B':
      return julgarB(item, registro);
    case 'C':
      return julgarC(item, registro);
    case 'D':
      return julgarD(item, registro);
  }
}

/** Trecho da resposta associado a um código citado (para o juiz da tarefa C). */
export function trechoDoCodigo(resposta: string, codigo: string, proximoCodigo?: string): string {
  const maiuscula = resposta.toUpperCase();
  const inicio = maiuscula.indexOf(codigo.toUpperCase());
  if (inicio === -1) return resposta;
  const fim = proximoCodigo
    ? maiuscula.indexOf(proximoCodigo.toUpperCase(), inicio + codigo.length)
    : -1;
  return resposta.slice(inicio, fim === -1 ? undefined : fim);
}
