/** Contrato dos adapters de provedor (fetch puro, DECISOES.md D1). */

/** Desconto das Batch APIs de OpenAI, Anthropic e Google em 16/set/2026; conferir na data da rodada. */
export const FATOR_PRECO_BATCH = 0.5;

export interface ChamadaModelo {
  prompt: string;
  /** true = conectar ao bncc.dev (MCP ou tool-use); ver METODOLOGIA. */
  grounded: boolean;
  maxTokens: number;
}

export interface RespostaModelo {
  texto: string;
  versaoModelo: string;
  /**
   * CONVENÇÃO (16/set/2026): `saida` é o total de tokens de saída COBRADOS,
   * raciocínio incluído; `reasoning` é a parcela de raciocínio dentro dele.
   * O custo usa `saida`. Cada API informa isso de um jeito; o adapter normaliza.
   */
  tokens: { entrada: number; saida: number; reasoning?: number };
  custoUsd: number;
  /**
   * Por que a geração parou, normalizado entre provedores:
   * 'fim' (resposta completa), 'max_tokens' (truncada), 'bloqueado' (safety),
   * ou o valor bruto do provedor para casos não mapeados.
   */
  finishReason: string;
  /** Chamadas de tool na rodada grounded (0 = não usou o grounding). */
  toolsChamadas: number;
  /** Voltas do loop de tool-use no cliente; ausente quando o loop roda no servidor. */
  voltas?: number;
  /** Chamadas de tool que falharam por transporte (HTTP, rede, timeout); isError e argumentos inválidos NÃO contam. */
  toolsErros?: number;
  /** Primeira mensagem de erro de transporte (auditoria). */
  toolsErroExemplo?: string;
  /** Ex.: 'mcp:mcp.bncc.dev'; null na rodada seca. */
  mecanismoGrounding: string | null;
}

export interface Provedor {
  id: string;
  completar(chamada: ChamadaModelo): Promise<RespostaModelo>;
}

/** Um pedido dentro de um lote; `customId` identifica a chamada (item × paráfrase). */
export interface PedidoBatch {
  customId: string;
  chamada: ChamadaModelo; // grounded sempre false: batch não aceita tools
}

/** O que a submissão devolve; `extras` guarda ids auxiliares (arquivo de entrada, URL de resultados). */
export interface LoteRemoto {
  id: string;
  extras?: Record<string, string>;
}

export interface EstadoLoteRemoto {
  fase: 'processando' | 'concluido' | 'falhou';
  /** Valor cru do provedor (validating, in_progress, ended, BATCH_STATE_RUNNING...). */
  bruto: string;
  contagens?: { total?: number; concluidos?: number; falhos?: number };
  /** Atualizações a persistir em `LoteRemoto.extras` (output_file_id, results_url...). */
  extras?: Record<string, string>;
  /** Mensagem quando fase = 'falhou' (ex.: arquivo reprovado na validação). */
  erro?: string;
}

/** Uma linha coletada; `custoUsd` da resposta JÁ vem com o fator de batch aplicado. */
export type LinhaLote =
  | { customId: string; resposta: RespostaModelo }
  | { customId: string; erro: string };

/**
 * Transporte assíncrono (Batch API). Mesmo corpo do síncrono, submetido em
 * lote; o harness consulta e coleta em invocações separadas (lib/execucao-batch).
 */
export interface ProvedorBatch {
  id: string;
  submeter(pedidos: PedidoBatch[], rotulo: string): Promise<LoteRemoto>;
  estado(lote: LoteRemoto): Promise<EstadoLoteRemoto>;
  coletar(lote: LoteRemoto): Promise<LinhaLote[]>;
}

/** Aplica o desconto de batch ao custo de uma resposta convertida pelo adapter síncrono. */
export function comDescontoBatch(resposta: RespostaModelo, fator: number): RespostaModelo {
  return { ...resposta, custoUsd: resposta.custoUsd * fator };
}

export interface DefModelo {
  /** Identificador curto usado em --modelos e nos nomes de arquivo. */
  id: string;
  provedor: 'anthropic' | 'bedrock' | 'openai-compat' | 'google' | 'openai-responses' | 'google-interactions';
  /** Nome do modelo na API do provedor. */
  modelo: string;
  /** Variável de ambiente com a key. */
  envKey: string;
  /** USD por milhão de tokens; custo é informativo, conferir na data da rodada. */
  precos: { entrada: number; saida: number };
  /** Base URL para provedores openai-compat. */
  baseUrl?: string;
  /**
   * Orçamento mínimo de resposta para este modelo (tokens). Modelos com
   * raciocínio interno queimam o orçamento pensando antes de escrever; sem
   * folga, a resposta sai cortada (finish_reason=max_tokens).
   */
  maxTokensPadrao?: number;
  /** Campos extras mesclados no corpo da requisição (ex.: pin de provedor no OpenRouter). */
  corpoExtra?: Record<string, unknown>;
  /** true quando o adapter implementa a rodada grounded. */
  suportaGrounded: boolean;
  /**
   * Nome do parâmetro de teto de tokens no corpo (openai-compat). A API direta
   * da OpenAI rejeita `max_tokens` nos gpt-5.x e exige `max_completion_tokens`;
   * agregadores traduzem isso, rotas diretas não. Default: 'max_tokens'.
   */
  parametroMaxTokens?: 'max_tokens' | 'max_completion_tokens';
  /**
   * Omitir `temperature` no corpo. Modelos que rejeitam o parâmetro: gpt-5.x
   * na Responses API; Claude 4.6+ (Sonnet 5, Opus 5, Fable 5) na Messages
   * API. CONDIÇÃO DISTINTA do protocolo (temperatura 0): declarar na release.
   */
  semTemperatura?: boolean;
  /**
   * Como a API (openai-compat) informa os tokens de raciocínio no `usage`:
   * - 'na-saida' (default): `completion_tokens` já inclui o raciocínio
   *   (OpenAI, Moonshot, OpenRouter).
   * - 'fora-da-saida': `reasoning_tokens` vem à parte e NÃO está em
   *   `completion_tokens`, embora seja cobrado como saída (xAI).
   * - 'nao-informado': nenhum campo traz o raciocínio; ele é a diferença
   *   `total_tokens − prompt − completion` (Gemini pelo endpoint compatível).
   * Errar isso subestima o custo em até uma ordem de grandeza (smoke de
   * 16/set/2026: grok direto 10×, gemini-pro direto 17×).
   */
  contagemRaciocinio?: 'na-saida' | 'fora-da-saida' | 'nao-informado';
  /**
   * Habilita a execução em lote pela Batch API da empresa (só modo seco; sem
   * tools). `api` deve casar com `provedor` (openai ↔ openai-compat em
   * api.openai.com; anthropic ↔ anthropic; google ↔ google): o corpo da
   * requisição é o mesmo do síncrono, então a medição é comparável.
   * `fatorPreco` multiplica `precos` (default FATOR_PRECO_BATCH).
   */
  batch?: { api: 'openai' | 'anthropic' | 'google'; fatorPreco?: number };
  /** Ajustes do adapter openai-responses (connector MCP nativo). */
  opcoesResponses?: {
    /** Enviar `require_approval: "never"` no tool MCP (OpenAI exige; xAI rejeita). */
    requireApproval?: boolean;
  };
}
