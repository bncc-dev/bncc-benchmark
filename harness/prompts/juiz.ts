/**
 * Rubrica fechada do juiz LLM (METODOLOGIA, seção Julgamento). O juiz só é
 * chamado nos casos que o pré-filtro programático não resolve.
 */

export function promptJuiz(textoCanonico: string, trecho: string): string {
  return `Você compara o texto oficial de uma aprendizagem da BNCC com o texto que um modelo de linguagem atribuiu a ela.

Julgue APENAS o conteúdo pedagógico: a resposta descreve a mesma aprendizagem (mesmo objeto, mesma ação esperada do aluno), ainda que com outras palavras?

Responda com UMA única palavra:
- "sim": mesmo conteúdo pedagógico (paráfrase fiel)
- "parcial": parte do conteúdo, com omissões ou acréscimos relevantes
- "nao": conteúdo diferente, de outra aprendizagem, ou inventado

TEXTO OFICIAL:
"""${textoCanonico}"""

TEXTO ATRIBUÍDO PELO MODELO:
"""${trecho}"""

Sua resposta (sim, parcial ou nao):`;
}

export function extrairVereditoJuiz(resposta: string): 'sim' | 'nao' | 'parcial' | null {
  const norm = resposta
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const m = norm.match(/\b(sim|nao|parcial)\b/);
  return (m?.[1] as 'sim' | 'nao' | 'parcial') ?? null;
}
