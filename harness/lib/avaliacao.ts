/**
 * Julgamento das respostas: verificadores programáticos (tarefas B e D),
 * pré-filtro por normalização (A e C) e marcação de casos para o juiz LLM.
 *
 * Semântica de abstenção (RB-2): resposta substantiva tem precedência.
 * Abstenção só vale quando, removidas as frases de incerteza, não sobra
 * resposta (sim/não na B; texto proposto na A; código na C/D). Hedge no fim
 * de uma resposta assertiva não a anula.
 *
 * RB-4: respostas truncadas ou bloqueadas pelo provedor (finish_reason
 * diferente de 'fim') são 'resposta_invalida', fora das taxas de alucinação.
 */

import { normalizarTexto } from '@bncc/dados';
import { extrairCitacoes, extrairCodigos } from './codigos.js';
import { obter, todas } from './gabarito.js';
import type { CodigoCitado, Item, Julgamento, RegistroBruto } from './tipos.js';

/** Versão da lógica de julgamento; gravada em cada Julgamento (auditoria). */
export const AVALIADOR_VERSAO = '2';

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

/** Remove as frases de incerteza do texto normalizado (RB-2). */
export function removerFrasesAbstencao(norm: string): string {
  let resto = norm;
  for (const f of FRASES_ABSTENCAO) resto = resto.split(f).join(' ');
  return resto.replace(/\s+/g, ' ').trim();
}

let textosMemo: Array<{ codigo: string; textoNorm: string }> | null = null;
function textosNormalizados(): Array<{ codigo: string; textoNorm: string }> {
  if (!textosMemo) {
    textosMemo = todas().map((a) => ({ codigo: a.codigo, textoNorm: normalizarTexto(a.texto) }));
  }
  return textosMemo;
}

function julgamentoBase(item: Item, registro: RegistroBruto): Omit<Julgamento, 'veredito'> {
  const base: Omit<Julgamento, 'veredito'> = {
    item_id: item.id,
    modelo: registro.modelo,
    parafrase: registro.parafrase,
    modo: registro.modo,
    tarefa: item.tarefa,
    tipo: item.tipo,
    estrato: item.estrato,
    avaliador_versao: AVALIADOR_VERSAO,
  };
  // D10: a categoria anti-vexame acompanha o julgamento para a agregação
  // separar invenção pura de confusão com currículo derivado.
  if (item.verificacao_antivexame?.categoria) {
    base.antivexame_categoria = item.verificacao_antivexame.categoria;
  }
  return base;
}

/** RB-4: truncamento/bloqueio do provedor invalida a resposta para julgamento. */
function respostaInvalida(registro: RegistroBruto): boolean {
  return registro.finish_reason !== undefined && registro.finish_reason !== 'fim';
}

/**
 * Tarefa B (RB-2): o sim/não é procurado APÓS remover as frases de
 * incerteza, então "não tenho como verificar" vira abstenção, mas
 * "sim, existe (...) consulte o documento oficial" continua sendo "sim".
 */
export function julgarB(item: Item, registro: RegistroBruto): Julgamento {
  if (item.gabarito.tipo !== 'existencia') throw new Error(`Item ${item.id} não é da tarefa B`);
  if (respostaInvalida(registro)) {
    return { ...julgamentoBase(item, registro), veredito: 'resposta_invalida' };
  }
  const resto = removerFrasesAbstencao(normalizarTexto(registro.resposta));
  const m = resto.match(/\b(sim|nao)\b/);
  let veredito: Julgamento['veredito'];
  if (!m) {
    veredito = 'abstencao';
  } else {
    const disseQueExiste = m[1] === 'sim';
    veredito = disseQueExiste === item.gabarito.existe ? 'correto' : 'incorreto';
  }
  return { ...julgamentoBase(item, registro), veredito };
}

/** Tarefa D: primeiro código extraído é a aposta; qualquer codigosAceitos vale (RB-7). */
export function julgarD(item: Item, registro: RegistroBruto): Julgamento {
  if (item.gabarito.tipo !== 'codigo') throw new Error(`Item ${item.id} não é da tarefa D`);
  if (respostaInvalida(registro)) {
    return { ...julgamentoBase(item, registro), veredito: 'resposta_invalida' };
  }
  const codigos = extrairCodigos(registro.resposta);
  let veredito: Julgamento['veredito'];
  if (codigos.length === 0) {
    veredito = detectarAbstencao(registro.resposta) ? 'abstencao' : 'incorreto';
  } else {
    veredito = item.gabarito.codigosAceitos.includes(codigos[0].codigo) ? 'correto' : 'incorreto';
  }
  return { ...julgamentoBase(item, registro), veredito };
}

/**
 * Tarefa A (RB-2): conteúdo substantivo é avaliado ANTES da abstenção.
 * Ordem: transcrição exata → texto integral de outra aprendizagem → só então
 * abstenção (e apenas se não sobrou conteúdo substantivo) → juiz.
 */
export function julgarA(item: Item, registro: RegistroBruto): Julgamento {
  if (item.gabarito.tipo !== 'texto') throw new Error(`Item ${item.id} não é da tarefa A`);
  if (respostaInvalida(registro)) {
    return { ...julgamentoBase(item, registro), veredito: 'resposta_invalida' };
  }
  const respostaNorm = normalizarTexto(registro.resposta);
  const canonicoNorm = normalizarTexto(item.gabarito.texto);

  let veredito: Julgamento['veredito'];
  if (respostaNorm.includes(canonicoNorm)) {
    veredito = 'fiel_exato';
  } else {
    const deOutra = textosNormalizados().find(
      (t) =>
        t.codigo !== item.codigo && t.textoNorm.length > 40 && respostaNorm.includes(t.textoNorm),
    );
    if (deOutra) {
      veredito = 'texto_de_outra';
    } else if (removerFrasesAbstencao(respostaNorm).length < 40) {
      // Sem conteúdo substantivo além das frases de incerteza.
      veredito = 'abstencao';
    } else {
      veredito = 'pendente_juiz';
    }
  }
  return { ...julgamentoBase(item, registro), veredito };
}

const TAMANHO_MAX_TRECHO = 500;

/**
 * Tarefa C (RB-1, RB-6): citações localizadas por posição (matchAll);
 * segmento do código i vai do fim da citação i ao início da citação i+1.
 * Cada código existente ganha escopo (dentro/fora do pedido) e o trecho
 * associado fica registrado no julgamento (auditável; é o que o juiz vê).
 */
export function julgarC(item: Item, registro: RegistroBruto): Julgamento {
  if (item.gabarito.tipo !== 'lista') throw new Error(`Item ${item.id} não é da tarefa C`);
  if (respostaInvalida(registro)) {
    return { ...julgamentoBase(item, registro), veredito: 'resposta_invalida', codigos_citados: [] };
  }
  const citacoes = extrairCitacoes(registro.resposta);

  if (citacoes.length === 0) {
    return {
      ...julgamentoBase(item, registro),
      veredito: detectarAbstencao(registro.resposta) ? 'abstencao' : 'sem_codigos',
      codigos_citados: [],
    };
  }

  const escopoValido = new Set(item.gabarito.codigosValidos);
  const vistos = new Set<string>();
  const codigos_citados: CodigoCitado[] = [];

  for (let i = 0; i < citacoes.length; i++) {
    const citacao = citacoes[i];
    if (vistos.has(citacao.codigo)) continue;
    vistos.add(citacao.codigo);

    const fimSegmento = i + 1 < citacoes.length ? citacoes[i + 1].posicao : registro.resposta.length;
    const trecho = registro.resposta.slice(citacao.fim, fimSegmento).trim().slice(0, TAMANHO_MAX_TRECHO);

    const aprendizagem = obter(citacao.codigo);
    const existe = aprendizagem !== undefined;
    const citado: CodigoCitado = {
      codigo: citacao.codigo,
      formaValida: citacao.formaValida,
      existe,
    };
    if (existe) {
      citado.escopo = escopoValido.has(citacao.codigo) ? 'dentro' : 'fora';
      citado.trecho = trecho;
      const trechoNorm = normalizarTexto(trecho);
      if (trechoNorm.includes(normalizarTexto(aprendizagem.texto))) {
        citado.texto = 'ok';
      } else if (trechoNorm.length < 20) {
        citado.texto = 'ausente'; // citou só o código, sem texto associado
      } else {
        citado.texto = 'pendente_juiz';
      }
    }
    codigos_citados.push(citado);
  }

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
