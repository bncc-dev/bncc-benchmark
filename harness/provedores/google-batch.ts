/**
 * Adapter de lote do Google (Gemini Batch API, `batchGenerateContent` com
 * pedidos inline). Mesmo corpo do adapter nativo (montarCorpoGoogle); o
 * Google processa em até 24h a 50% do preço. Entrada inline devolve
 * resposta inline; se um dia o volume exigir arquivo, o adapter falha claro.
 */

import { ErroProvedor } from './erro.js';
import { converterRespostaGoogle, montarCorpoGoogle, type RespostaApiGoogle } from './google.js';
import {
  comDescontoBatch,
  FATOR_PRECO_BATCH,
  type DefModelo,
  type EstadoLoteRemoto,
  type LinhaLote,
  type LoteRemoto,
  type PedidoBatch,
  type ProvedorBatch,
} from './tipos.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface OperacaoApi {
  name: string;
  done?: boolean;
  metadata?: { state?: string; batchStats?: { requestCount?: string; successfulRequestCount?: string; failedRequestCount?: string } };
  error?: { message?: string };
  response?: {
    inlinedResponses?: { inlinedResponses?: Array<{ metadata?: { key?: string }; response?: RespostaApiGoogle; error?: unknown }> };
    responsesFile?: string;
  };
}

const ESTADOS_FALHA = new Set(['BATCH_STATE_FAILED', 'BATCH_STATE_CANCELLED', 'BATCH_STATE_EXPIRED']);

export function criarProvedorBatchGoogle(def: DefModelo, key: string): ProvedorBatch {
  const fator = def.batch?.fatorPreco ?? FATOR_PRECO_BATCH;

  async function pedir(url: string, corpo?: unknown): Promise<OperacaoApi> {
    const resposta = await fetch(url, {
      method: corpo ? 'POST' : 'GET',
      signal: AbortSignal.timeout(300_000),
      headers: { 'x-goog-api-key': key, ...(corpo ? { 'content-type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    if (!resposta.ok) {
      const detalhe = await resposta.text();
      throw new ErroProvedor(resposta.status, `${def.id} batch ${resposta.status}: ${detalhe.slice(0, 300)}`);
    }
    return (await resposta.json()) as OperacaoApi;
  }

  return {
    id: def.id,
    async submeter(pedidos: PedidoBatch[], rotulo: string): Promise<LoteRemoto> {
      const requests = pedidos.map((p) => ({ request: montarCorpoGoogle(p.chamada), metadata: { key: p.customId } }));
      const op = await pedir(`${BASE}/models/${def.modelo}:batchGenerateContent`, {
        batch: { display_name: rotulo, input_config: { requests: { requests } } },
      });
      return { id: op.name };
    },
    async estado(lote: LoteRemoto): Promise<EstadoLoteRemoto> {
      const op = await pedir(`${BASE}/${lote.id}`);
      const bruto = op.metadata?.state ?? (op.done ? 'done' : 'pending');
      const st = op.metadata?.batchStats;
      const contagens = st
        ? { total: Number(st.requestCount ?? 0), concluidos: Number(st.successfulRequestCount ?? 0), falhos: Number(st.failedRequestCount ?? 0) }
        : undefined;
      if (ESTADOS_FALHA.has(bruto) || op.error) {
        return { fase: 'falhou', bruto, contagens, erro: op.error?.message ?? bruto };
      }
      if (op.done && bruto === 'BATCH_STATE_SUCCEEDED') return { fase: 'concluido', bruto, contagens };
      return { fase: 'processando', bruto, contagens };
    },
    async coletar(lote: LoteRemoto): Promise<LinhaLote[]> {
      // A operação concluída carrega as respostas inline; não guardamos a
      // resposta inteira no estado para o arquivo não inchar.
      const op = await pedir(`${BASE}/${lote.id}`);
      if (op.response?.responsesFile) {
        throw new Error(`${def.id}: lote ${lote.id} devolveu responsesFile (entrada grande demais para inline); não suportado`);
      }
      const inline = op.response?.inlinedResponses?.inlinedResponses ?? [];
      return inline.map((d): LinhaLote => {
        const customId = d.metadata?.key ?? '';
        if (d.error || !d.response) return { customId, erro: JSON.stringify(d.error ?? 'sem response').slice(0, 300) };
        return { customId, resposta: comDescontoBatch(converterRespostaGoogle(def, d.response), fator) };
      });
    },
  };
}
