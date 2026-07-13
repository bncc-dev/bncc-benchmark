/** Contrato dos adapters de provedor (fetch puro, DECISOES.md D1). */

export interface ChamadaModelo {
  prompt: string;
  /** true = conectar ao bncc.dev (MCP ou tool-use); ver METODOLOGIA. */
  grounded: boolean;
  maxTokens: number;
}

export interface RespostaModelo {
  texto: string;
  versaoModelo: string;
  tokens: { entrada: number; saida: number; reasoning?: number };
  custoUsd: number;
  /**
   * RB-4: por que a geração parou, normalizado entre provedores:
   * 'fim' (resposta completa), 'max_tokens' (truncada), 'bloqueado' (safety),
   * ou o valor bruto do provedor para casos não mapeados.
   */
  finishReason: string;
  /** Chamadas de tool na rodada grounded (0 = não usou o grounding). */
  toolsChamadas: number;
  /** Ex.: 'mcp:mcp.bncc.dev'; null na rodada seca. */
  mecanismoGrounding: string | null;
}

export interface Provedor {
  id: string;
  completar(chamada: ChamadaModelo): Promise<RespostaModelo>;
}

export interface DefModelo {
  /** Identificador curto usado em --modelos e nos nomes de arquivo. */
  id: string;
  provedor: 'anthropic' | 'bedrock' | 'openai-compat' | 'google';
  /** Nome do modelo na API do provedor. */
  modelo: string;
  /** Variável de ambiente com a key. */
  envKey: string;
  /** USD por milhão de tokens; custo é informativo, conferir antes do M5. */
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
}
