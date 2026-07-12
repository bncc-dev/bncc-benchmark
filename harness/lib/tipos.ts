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
  | { tipo: 'codigo'; codigo: string };

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
  tokens: { entrada: number; saida: number };
  tools_chamadas?: number;
  dataset_versao: string;
  itens_versao: string;
}

export interface CodigoCitado {
  codigo: string;
  formaValida: boolean;
  existe: boolean;
  /** Só para códigos existentes com texto associado na resposta. */
  texto?: 'ok' | 'divergente' | 'ausente' | 'pendente_juiz';
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
  veredito: Veredito;
  /** Tarefa C: detalhe por código citado. */
  codigos_citados?: CodigoCitado[];
  juiz?: { veredito: 'sim' | 'nao' | 'parcial'; modelo: string };
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
