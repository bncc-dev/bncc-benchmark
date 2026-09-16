/**
 * Adapter de lote da Anthropic (Message Batches API). Mesmo corpo do
 * adapter síncrono (montarCorpoAnthropic); a Anthropic processa em até 24h a
 * 50% do preço. Resultados ficam disponíveis por 29 dias em `results_url`.
 */

import { converterRespostaAnthropic, montarCorpoAnthropic, type RespostaApiAnthropic } from './anthropic.js';
import { ErroProvedor } from './erro.js';
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

const BASE = 'https://api.anthropic.com/v1/messages/batches';

interface LoteApi {
  id: string;
  processing_status: 'in_progress' | 'canceling' | 'ended';
  request_counts?: { processing: number; succeeded: number; errored: number; canceled: number; expired: number };
  results_url?: string | null;
}

interface LinhaApi {
  custom_id: string;
  result: { type: 'succeeded'; message: RespostaApiAnthropic } | { type: 'errored' | 'expired' | 'canceled'; error?: unknown };
}

export function criarProvedorBatchAnthropic(def: DefModelo, key: string): ProvedorBatch {
  const fator = def.batch?.fatorPreco ?? FATOR_PRECO_BATCH;
  const headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01' };

  async function pedir(url: string, corpo?: unknown): Promise<Response> {
    const resposta = await fetch(url, {
      method: corpo ? 'POST' : 'GET',
      signal: AbortSignal.timeout(300_000),
      headers: corpo ? { ...headers, 'content-type': 'application/json' } : headers,
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    if (!resposta.ok) {
      const detalhe = await resposta.text();
      throw new ErroProvedor(resposta.status, `${def.id} batch ${resposta.status}: ${detalhe.slice(0, 300)}`);
    }
    return resposta;
  }

  return {
    id: def.id,
    async submeter(pedidos: PedidoBatch[]): Promise<LoteRemoto> {
      const requests = pedidos.map((p) => ({
        custom_id: p.customId,
        params: montarCorpoAnthropic(def, p.chamada).corpo,
      }));
      const lote = (await (await pedir(BASE, { requests })).json()) as LoteApi;
      return { id: lote.id };
    },
    async estado(lote: LoteRemoto): Promise<EstadoLoteRemoto> {
      const d = (await (await pedir(`${BASE}/${lote.id}`)).json()) as LoteApi;
      const c = d.request_counts;
      const contagens = c
        ? { total: c.processing + c.succeeded + c.errored + c.canceled + c.expired, concluidos: c.succeeded, falhos: c.errored + c.canceled + c.expired }
        : undefined;
      if (d.processing_status === 'ended') {
        if (!d.results_url) return { fase: 'falhou', bruto: d.processing_status, contagens, erro: 'lote encerrado sem results_url' };
        return { fase: 'concluido', bruto: d.processing_status, contagens, extras: { results_url: d.results_url } };
      }
      return { fase: 'processando', bruto: d.processing_status, contagens };
    },
    async coletar(lote: LoteRemoto): Promise<LinhaLote[]> {
      const url = lote.extras?.results_url;
      if (!url) throw new Error(`${def.id}: lote ${lote.id} sem results_url; consulte o estado antes de coletar`);
      const texto = await (await pedir(url)).text();
      const linhas: LinhaLote[] = [];
      for (const l of texto.split('\n')) {
        if (!l.trim()) continue;
        const d = JSON.parse(l) as LinhaApi;
        if (d.result.type === 'succeeded') {
          linhas.push({ customId: d.custom_id, resposta: comDescontoBatch(converterRespostaAnthropic(def, d.result.message, false), fator) });
        } else {
          linhas.push({ customId: d.custom_id, erro: JSON.stringify(d.result).slice(0, 300) });
        }
      }
      return linhas;
    },
  };
}
