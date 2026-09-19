/**
 * Rubrica fechada do juiz LLM (METODOLOGIA, seção Julgamento). O juiz só é
 * chamado nos casos que o pré-filtro programático não resolve.
 */

/**
 * A versão da rubrica integra a chave de cache do juiz e é gravada em
 * juiz.jsonl. Qualquer mudança neste prompt exige bump.
 */
export const RUBRICA_VERSAO = 'rubrica-v2';

export function promptJuiz(textoCanonico: string, trecho: string): string {
  return `Você compara o texto oficial de uma aprendizagem da BNCC com o texto que um modelo de linguagem atribuiu a ela.

Primeiro decida se o modelo chegou a atribuir um texto à aprendizagem. Se ele
declarou que não sabe, não tem certeza ou não pode confirmar, e NÃO apresentou
nenhum texto como sendo o da aprendizagem (falar do código, da área, do ano ou
de onde consultar não é apresentar o texto), a resposta é uma abstenção.

Se houve texto atribuído, julgue APENAS o conteúdo pedagógico: a resposta
descreve a mesma aprendizagem (mesmo objeto, mesma ação esperada do aluno),
ainda que com outras palavras?

Responda com UMA única palavra:
- "abstencao": o modelo recusou responder e não atribuiu texto nenhum
- "sim": mesmo conteúdo pedagógico (paráfrase fiel)
- "parcial": parte do conteúdo, com omissões ou acréscimos relevantes
- "nao": conteúdo diferente, de outra aprendizagem, ou inventado

TEXTO OFICIAL:
"""${textoCanonico}"""

TEXTO ATRIBUÍDO PELO MODELO:
"""${trecho}"""

Sua resposta (abstencao, sim, parcial ou nao):`;
}

export function extrairVereditoJuiz(
  resposta: string,
): 'sim' | 'nao' | 'parcial' | 'abstencao' | null {
  const norm = resposta
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const m = norm.match(/\b(sim|nao|parcial|abstencao)\b/);
  return (m?.[1] as 'sim' | 'nao' | 'parcial' | 'abstencao') ?? null;
}
