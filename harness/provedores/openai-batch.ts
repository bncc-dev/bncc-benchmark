/**
 * Adapter de lote da OpenAI (Batch API). Mesmo corpo do adapter
 * chat/completions (montarCorpoChat); a OpenAI processa em até 24h a 50% do
 * preço. Ciclo: upload de um JSONL (purpose=batch) → criação do lote →
 * consulta → download do arquivo de saída (e do de erros, se houver).
 */

import { ErroProvedor } from './erro.js';
import { converterRespostaChat, montarCorpoChat, type RespostaApi } from './openai-compat.js';
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

interface LoteApi {
  id: string;
  status: 'validating' | 'failed' | 'in_progress' | 'finalizing' | 'completed' | 'expired' | 'cancelling' | 'cancelled';
  request_counts?: { total: number; completed: number; failed: number };
  output_file_id?: string | null;
  error_file_id?: string | null;
  errors?: { data?: Array<{ message?: string; line?: number }> } | null;
}

interface LinhaApi {
  custom_id: string;
  response?: { status_code: number; body: RespostaApi } | null;
  error?: { message?: string } | null;
}

const TERMINAIS_FALHA = new Set(['failed', 'expired', 'cancelled']);

export function criarProvedorBatchOpenAi(def: DefModelo, key: string): ProvedorBatch {
  if (!def.baseUrl) throw new Error(`Modelo ${def.id} sem baseUrl`);
  const base = def.baseUrl;
  const fator = def.batch?.fatorPreco ?? FATOR_PRECO_BATCH;
  const auth = { authorization: `Bearer ${key}` };

  async function pedir(url: string, init?: RequestInit): Promise<Response> {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(300_000), ...init, headers: { ...auth, ...(init?.headers as Record<string, string> | undefined) } });
    if (!resposta.ok) {
      const detalhe = await resposta.text();
      throw new ErroProvedor(resposta.status, `${def.id} batch ${resposta.status}: ${detalhe.slice(0, 300)}`);
    }
    return resposta;
  }

  async function baixarLinhas(fileId: string): Promise<LinhaApi[]> {
    const texto = await (await pedir(`${base}/files/${fileId}/content`)).text();
    return texto
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as LinhaApi);
  }

  return {
    id: def.id,
    async submeter(pedidos: PedidoBatch[], rotulo: string): Promise<LoteRemoto> {
      const jsonl =
        pedidos
          .map((p) =>
            JSON.stringify({
              custom_id: p.customId,
              method: 'POST',
              url: '/v1/chat/completions',
              body: montarCorpoChat(def, [{ role: 'user', content: p.chamada.prompt }], p.chamada.maxTokens),
            }),
          )
          .join('\n') + '\n';
      const form = new FormData();
      form.append('purpose', 'batch');
      form.append('file', new Blob([jsonl], { type: 'application/jsonl' }), `${rotulo}.jsonl`);
      const arquivo = (await (await pedir(`${base}/files`, { method: 'POST', body: form })).json()) as { id: string };
      const lote = (await (
        await pedir(`${base}/batches`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ input_file_id: arquivo.id, endpoint: '/v1/chat/completions', completion_window: '24h', metadata: { rotulo } }),
        })
      ).json()) as LoteApi;
      return { id: lote.id, extras: { input_file_id: arquivo.id } };
    },
    async estado(lote: LoteRemoto): Promise<EstadoLoteRemoto> {
      const d = (await (await pedir(`${base}/batches/${lote.id}`)).json()) as LoteApi;
      const c = d.request_counts;
      const contagens = c ? { total: c.total, concluidos: c.completed, falhos: c.failed } : undefined;
      const extras: Record<string, string> = {};
      if (d.output_file_id) extras.output_file_id = d.output_file_id;
      if (d.error_file_id) extras.error_file_id = d.error_file_id;
      if (TERMINAIS_FALHA.has(d.status)) {
        const erro = d.errors?.data?.map((e) => `${e.line ?? '?'}: ${e.message ?? ''}`).join('; ');
        return { fase: 'falhou', bruto: d.status, contagens, extras, erro: erro || d.status };
      }
      if (d.status === 'completed') return { fase: 'concluido', bruto: d.status, contagens, extras };
      return { fase: 'processando', bruto: d.status, contagens, extras };
    },
    async coletar(lote: LoteRemoto): Promise<LinhaLote[]> {
      const linhas: LinhaLote[] = [];
      const saida = lote.extras?.output_file_id;
      const erros = lote.extras?.error_file_id;
      if (!saida && !erros) throw new Error(`${def.id}: lote ${lote.id} sem arquivo de saída; consulte o estado antes de coletar`);
      for (const d of saida ? await baixarLinhas(saida) : []) {
        if (d.response && d.response.status_code === 200) {
          linhas.push({ customId: d.custom_id, resposta: comDescontoBatch(converterRespostaChat(def, d.response.body), fator) });
        } else {
          linhas.push({ customId: d.custom_id, erro: JSON.stringify(d.error ?? d.response?.body ?? 'sem response').slice(0, 300) });
        }
      }
      for (const d of erros ? await baixarLinhas(erros) : []) {
        linhas.push({ customId: d.custom_id, erro: JSON.stringify(d.error ?? 'erro sem detalhe').slice(0, 300) });
      }
      return linhas;
    },
  };
}
