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
  /** Ajustes do adapter openai-responses (connector MCP nativo). */
  opcoesResponses?: {
    /** Enviar `require_approval: "never"` no tool MCP (OpenAI exige; xAI rejeita). */
    requireApproval?: boolean;
  };
}
