/**
 * Rubrica fechada do juiz LLM (METODOLOGIA, seção Julgamento). O juiz só é
 * chamado nos casos que o pré-filtro programático não resolve.
 */

/**
 * A versão da rubrica integra a chave de cache do juiz e é gravada em
 * juiz.jsonl. Qualquer mudança neste prompt exige bump.
 */
export const RUBRICA_VERSAO = 'rubrica-v3';

export function promptJuiz(textoCanonico: string, trecho: string): string {
  return `Você compara o texto oficial de uma aprendizagem da BNCC com o texto que um modelo de linguagem atribuiu a ela.

Decida nesta ordem:

1. O modelo ATRIBUIU um texto à aprendizagem (mesmo com ressalvas como "pelo
   que recordo" ou "aproximadamente")? Então julgue APENAS o conteúdo
   pedagógico desse texto: ele descreve a mesma aprendizagem (mesmo objeto,
   mesma ação esperada do aluno), ainda que com outras palavras?
   - "sim": mesmo conteúdo pedagógico (paráfrase fiel)
   - "parcial": parte do conteúdo, com omissões ou acréscimos relevantes
   - "nao": conteúdo diferente, de outra aprendizagem, ou inventado
2. Não atribuiu texto, e AFIRMOU que o código ou a aprendizagem não existe,
   não é da BNCC ou está errado? Responda "negacao". (A aprendizagem existe;
   negar é um erro, mas não é texto inventado.)
3. Não atribuiu texto e apenas declarou que não sabe, não tem certeza ou não
   pode confirmar? Responda "abstencao". Falar do código, da área, do ano ou
   de onde consultar não é atribuir texto.

Responda com UMA única palavra: sim, parcial, nao, negacao ou abstencao.

TEXTO OFICIAL:
"""${textoCanonico}"""

TEXTO ATRIBUÍDO PELO MODELO:
"""${trecho}"""

Sua resposta (sim, parcial, nao, negacao ou abstencao):`;
}

export function extrairVereditoJuiz(
  resposta: string,
): 'sim' | 'nao' | 'parcial' | 'abstencao' | 'negacao' | null {
  const norm = resposta
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const m = norm.match(/\b(sim|nao|parcial|abstencao|negacao)\b/);
  return (m?.[1] as 'sim' | 'nao' | 'parcial' | 'abstencao' | 'negacao') ?? null;
}
