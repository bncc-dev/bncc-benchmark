/**
 * Agregação dos julgamentos por modelo × modo × tarefa × estrato, e o check
 * de consistência que o CI usa (recalcular e comparar, DECISOES.md D3).
 */

import type { Agregados, Julgamento, Modo } from './tipos.js';

function contar(registro: Record<string, number>, chave: string, quanto = 1): void {
  registro[chave] = (registro[chave] ?? 0) + quanto;
}

/** Julgamento conta como alucinação? (por tarefa; abstenção nunca conta.) */
function alucinacoes(j: Julgamento): number {
  switch (j.tarefa) {
    case 'A':
      return j.veredito === 'inventado' || j.veredito === 'texto_de_outra' ? 1 : 0;
    case 'B':
      return j.veredito === 'incorreto' && j.tipo.startsWith('falso') ? 1 : 0;
    case 'C':
      return (j.codigos_citados ?? []).filter((c) => !c.existe).length;
    case 'D':
      return j.veredito === 'incorreto' ? 1 : 0;
  }
}

export function agregar(
  julgados: Julgamento[],
  rodada: string,
  meta: { dataset_versao: string; itens_versao: string },
): Agregados {
  const por_modelo: Agregados['por_modelo'] = {};

  for (const j of julgados) {
    const modelo = (por_modelo[j.modelo] ??= { modo: {} as never });
    const modos = modelo.modo as Record<Modo, { tarefas: Record<string, Record<string, number>>; estratos: Record<string, Record<string, number>>; total_julgamentos: number }>;
    const modo = (modos[j.modo] ??= { tarefas: {}, estratos: {}, total_julgamentos: 0 });
    modo.total_julgamentos++;

    const tarefa = (modo.tarefas[j.tarefa] ??= {});
    contar(tarefa, 'total');
    contar(tarefa, `veredito:${j.veredito}`);
    if (j.tarefa === 'B') {
      contar(tarefa, `tipo:${j.tipo}:${j.veredito}`);
      // D10: a métrica dupla. "Aceitou falso" se divide por onde o código
      // existe no mundo real: invenção pura (limpo) vs confusão com
      // currículo derivado vs zona cinzenta federal.
      if (j.tipo.startsWith('falso') && j.antivexame_categoria) {
        contar(tarefa, `antivexame:${j.antivexame_categoria}:total`);
        if (j.veredito === 'incorreto') {
          contar(tarefa, `antivexame:${j.antivexame_categoria}:aceito`);
        }
      }
    }
    if (j.tarefa === 'C' && j.codigos_citados) {
      contar(tarefa, 'codigos_citados', j.codigos_citados.length);
      contar(tarefa, 'codigos_inventados', j.codigos_citados.filter((c) => !c.existe).length);
      contar(tarefa, 'codigos_forma_invalida', j.codigos_citados.filter((c) => !c.formaValida).length);
      // Código real fora do escopo pedido é métrica própria (não é T1).
      contar(tarefa, 'codigos_fora_escopo', j.codigos_citados.filter((c) => c.escopo === 'fora').length);
      for (const c of j.codigos_citados) {
        if (c.texto) contar(tarefa, `texto:${c.texto}`);
      }
    }

    for (const chaveEstrato of [j.estrato.modulo, `etapa:${j.estrato.etapa}`]) {
      const estrato = (modo.estratos[chaveEstrato] ??= {});
      contar(estrato, 'total');
      contar(estrato, 'alucinacoes', alucinacoes(j));
      if (j.veredito === 'abstencao') contar(estrato, 'abstencoes');
    }
  }

  return {
    rodada,
    gerado_em: new Date().toISOString(),
    dataset_versao: meta.dataset_versao,
    itens_versao: meta.itens_versao,
    por_modelo,
  };
}

/** Compara dois agregados ignorando o timestamp de geração. */
export function agregadosEquivalentes(a: Agregados, b: Agregados): boolean {
  const canonico = (x: Agregados) => JSON.stringify({ ...x, gerado_em: null });
  return canonico(a) === canonico(b);
}
