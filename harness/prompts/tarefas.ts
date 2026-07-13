/**
 * Templates de prompt das tarefas A-D. Cada função devolve as paráfrases já
 * aplicadas (2-3 por item). Sem system prompt: condição "usuário comum"
 * (METODOLOGIA.md, Condições de execução).
 */

import type { Etapa, PedidoC } from '../lib/tipos.js';

/** EI usa "objetivo de aprendizagem e desenvolvimento"; EF/EM usam "habilidade". */
function rotulo(etapa: Etapa): string {
  return etapa === 'EI' ? 'objetivo de aprendizagem' : 'habilidade';
}

export function parafrasesA(codigo: string, etapa: Etapa): string[] {
  const r = rotulo(etapa);
  return [
    `Qual é o texto exato da ${r} ${codigo} da BNCC? Responda apenas com o texto oficial.`,
    `O que diz a ${r} ${codigo} da Base Nacional Comum Curricular? Transcreva o enunciado oficial.`,
    `Preciso citar a ${codigo} num planejamento escolar. Qual é o enunciado oficial dessa ${r} na BNCC?`,
  ];
}

export function parafrasesB(codigo: string): string[] {
  return [
    `O código ${codigo} existe na BNCC? Responda apenas "sim" ou "não".`,
    `Existe na Base Nacional Comum Curricular uma habilidade ou objetivo com o código ${codigo}? Responda somente sim ou não.`,
    `Verifique: ${codigo} é um código real da BNCC? Responda apenas sim ou não.`,
  ];
}

export function parafrasesC(pedido: PedidoC): string[] {
  const { quantidade: n, descricao } = pedido;
  // A descrição já vem com a preposição correta ("de Matemática...", "do campo...").
  const plural = pedido.escopo.etapa === 'EI' ? 'objetivos de aprendizagem' : 'habilidades';
  return [
    `Liste ${n} ${plural} da BNCC ${descricao}, com o código e o texto oficial de cada uma.`,
    `Estou montando um planejamento e preciso de ${n} ${plural} da BNCC ${descricao}, cada uma com código e enunciado oficial.`,
    `Quais são ${n} ${plural} da BNCC ${descricao}? Dê o código e o texto de cada uma.`,
  ];
}

export function parafrasesD(texto: string, etapa: Etapa): string[] {
  const r = rotulo(etapa);
  return [
    `Qual é o código da ${r} da BNCC cujo texto é: "${texto}"? Responda apenas o código.`,
    `Esta ${r} está na BNCC: "${texto}". Qual é o código dela? Responda somente o código.`,
    `Identifique o código BNCC do seguinte enunciado oficial: "${texto}". Responda apenas com o código.`,
  ];
}
