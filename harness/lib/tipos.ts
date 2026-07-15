/** Tipos centrais do benchmark. */

export type Tarefa = 'A' | 'B' | 'C' | 'D';

export type TipoItem =
  | 'real'
  /** Sequência + 1 (a borda imediata; a armadilha mais difícil). */
  | 'falso-extensao'
  /** Sequência + 2..15 (além da borda, ainda plausível). */
  | 'falso-profundo'
  /** Prefixo gramaticalmente válido sem nenhum código (ex.: EF01AR). */
  | 'falso-combinacao'
  | 'especial';

export type Etapa = 'EI' | 'EF' | 'EM';
export type Modulo = 'bncc-2018' | 'computacao-2022';
export type Modo = 'seco' | 'grounded';

export interface Estrato {
  etapa: Etapa;
  modulo: Modulo;
  /** Sigla do componente (EF), área (EM), campo de experiências (EI) ou CO. */
  componente?: string;
}

export interface PedidoC {
  quantidade: number;
  /** Descrição humana do escopo, usada nos prompts (ex.: "Matemática do 7º ano"). */
  descricao: string;
  escopo: Estrato & { ano?: number };
}

export type Gabarito =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'existencia'; existe: boolean }
  | { tipo: 'lista'; codigosValidos: string[] }
  /**
   * RB-7: codigosAceitos cobre textos idênticos com códigos distintos
   * (Computação numera o mesmo texto por ano e por bloco); qualquer um deles
   * é resposta correta na tarefa D.
   */
  | { tipo: 'codigo'; codigo: string; codigosAceitos: string[] };

export interface Item {
  id: string;
  tarefa: Tarefa;
  tipo: TipoItem;
  /** Presente nas tarefas A, B e D. */
  codigo?: string;
  /** Texto canônico mostrado ao modelo na tarefa D. */
  texto?: string;
  /** Presente na tarefa C. */
  pedido?: PedidoC;
  gabarito: Gabarito;
  estrato: Estrato;
  /** Prompts prontos (template já aplicado), 2-3 por item. */
  parafrases: string[];
  nota?: string;
  verificacao_antivexame?: {
    status: 'pendente' | 'ok' | 'rejeitado';
    /** Protocolo D10: onde o código falso existe no mundo real, se existir. */
    categoria?: 'limpo' | 'derivado' | 'cinzenta-federal';
    fontes?: string[];
    verificado_em?: string;
    por?: string;
    notas?: string;
  };
}

export interface BancoItens {
  versao: string;
  seed: number;
  dataset_versao: string;
  gerado_em: string;
  distribuicao: Record<string, number>;
  itens: Item[];
}

export interface RegistroBruto {
  item_id: string;
  modelo: string;
  versao_modelo: string;
  parafrase: number;
  modo: Modo;
  mecanismo_grounding: string | null;
  prompt: string;
  resposta: string;
  timestamp: string;
  custo_usd: number;
  tokens: { entrada: number; saida: number; reasoning?: number };
  /**
   * RB-4: por que o provedor parou de gerar. 'fim' = resposta completa;
   * 'max_tokens' = truncada; 'bloqueado' = safety; outros valores = bruto do
   * provedor. Ausente em registros anteriores ao avaliador v2 (tratados como
   * válidos, limitação documentada).
   */
  finish_reason?: string;
  tools_chamadas?: number;
  dataset_versao: string;
  itens_versao: string;
}

export interface CodigoCitado {
  codigo: string;
  formaValida: boolean;
  existe: boolean;
  /** RB-1: código existente está dentro do escopo pedido pelo item C? */
  escopo?: 'dentro' | 'fora';
  /** Só para códigos existentes com texto associado na resposta. */
  texto?: 'ok' | 'divergente' | 'ausente' | 'pendente_juiz' | 'indeterminado';
  /** RB-6/RB-8: segmento da resposta associado ao código (auditável, vai ao juiz). */
  trecho?: string;
}

export type Veredito =
  // A e D
  | 'correto'
  | 'fiel_exato'
  | 'fiel_parafrase'
  | 'parcial'
  | 'texto_de_outra'
  | 'inventado'
  | 'incorreto'
  | 'abstencao'
  | 'pendente_juiz'
  /** RB-5: juiz não emitiu veredito parseável mesmo após retry; nunca conta como alucinação. */
  | 'indeterminado'
  /** RB-4: resposta truncada/bloqueada pelo provedor; artefato de execução, fora das taxas. */
  | 'resposta_invalida'
  // C (resumo do item)
  | 'sem_codigos'
  | 'avaliado';

export interface Julgamento {
  item_id: string;
  modelo: string;
  parafrase: number;
  modo: Modo;
  tarefa: Tarefa;
  tipo: TipoItem;
  estrato: Estrato;
  /** Versão da lógica de julgamento que produziu este veredito (auditoria). */
  avaliador_versao: string;
  /** D10: categoria anti-vexame do código falso (itens da tarefa B). */
  antivexame_categoria?: 'limpo' | 'derivado' | 'cinzenta-federal';
  veredito: Veredito;
  /** Tarefa C: detalhe por código citado. */
  codigos_citados?: CodigoCitado[];
  juiz?: { veredito: 'sim' | 'nao' | 'parcial' | 'indeterminado'; modelo: string };
}

export interface Agregados {
  rodada: string;
  gerado_em: string;
  dataset_versao: string;
  itens_versao: string;
  por_modelo: Record<string, AgregadoModelo>;
}

export interface AgregadoModelo {
  modo: Record<
    Modo,
    {
      tarefas: Record<string, Record<string, number>>;
      estratos: Record<string, Record<string, number>>;
      total_julgamentos: number;
    }
  >;
}
