/**
 * Caminho de execução em lote (Batch API): mesma bateria e mesma identidade
 * de chamada do síncrono (planejarChamadas), transporte assíncrono. Cada
 * invocação de `avancarLote` executa UMA passada da máquina de estados
 * (submete, ou consulta, ou coleta e escala, ou finaliza) e sai; o estado
 * fica em resultados/<rodada>/lotes-<modelo>-<modo>.json (lib/lote.ts) e as
 * respostas, no cache, com a chave que o síncrono usaria.
 */

import type { DefModelo, PedidoBatch, ProvedorBatch } from '../provedores/tipos.js';
import type { CacheDisco } from './cache.js';
import {
  comRetry,
  montarRegistro,
  orcamentoEscalado,
  planejarChamadas,
  type ChamadaPlanejada,
  type OpcoesExecucao,
  type ResultadoExecucao,
} from './execucao.js';
import {
  customIdDe,
  gravarLote,
  lerLote,
  validarFlags,
  type ApiBatch,
  type EstadoLote,
  type FlagsLote,
  type LoteSubmetido,
} from './lote.js';
import type { RegistroBruto } from './tipos.js';

export interface OpcoesLote
  extends Pick<OpcoesExecucao, 'banco' | 'itens' | 'def' | 'modo' | 'parafrases' | 'cache' | 'maxTokens'> {
  provedorBatch: ProvedorBatch;
  /** Caminho do arquivo de estado (lib/lote.ts caminhoLote). */
  caminhoEstado: string;
  flags: FlagsLote;
  /** Rótulo humano do lote no provedor (rodada/modelo). */
  rotulo: string;
  /** Ressubmete pedidos com erro (linhas falhas, lote reprovado, expirados). */
  reenviarFalhas?: boolean;
  tentativas?: number;
  esperaBaseMs?: number;
  agora?: () => Date;
}

export type ResultadoLote =
  | { situacao: 'em-andamento'; resumo: string }
  | { situacao: 'concluido'; resultado: ResultadoExecucao; lotes: LoteSubmetido[] }
  | {
      situacao: 'incompleto';
      resultado: ResultadoExecucao;
      lotes: LoteSubmetido[];
      faltantes: Array<{ customId: string; erro: string }>;
    };

export async function avancarLote(o: OpcoesLote): Promise<ResultadoLote> {
  const { def, modo, cache, provedorBatch, caminhoEstado, flags, rotulo, tentativas = 3, esperaBaseMs = 1000 } = o;
  const agora = () => (o.agora ?? (() => new Date()))().toISOString();
  if (modo !== 'seco') throw new Error(`Execução em lote só no modo seco (batch não aceita tools); modo pedido: ${modo}`);
  if (!def.batch) throw new Error(`${def.id} não tem Batch API configurada`);

  // 1. Planejar com as mesmas chaves do síncrono.
  const plano = planejarChamadas(o);
  const porCustomId = new Map<string, ChamadaPlanejada>();
  for (const c of plano) porCustomId.set(customIdDe(c.item.id, c.parafrase), c);

  // 2. Carregar ou criar o estado.
  let estado = lerLote(caminhoEstado);
  if (estado) {
    validarFlags(estado, flags);
    if (estado.modelo !== def.id || estado.modo !== modo) {
      throw new Error(`Estado em ${caminhoEstado} é de ${estado.modelo}/${estado.modo}, não de ${def.id}/${modo}`);
    }
    for (const [id, p] of Object.entries(estado.pedidos)) {
      const c = porCustomId.get(id);
      if (c && c.chave !== p.chave) {
        throw new Error(
          `Pedido ${id} foi submetido com outra identidade (chave ${p.chave.slice(0, 8)} ≠ ${c.chave.slice(0, 8)}): banco de itens ou prompt mudaram desde a submissão`,
        );
      }
    }
    if (estado.submissao_em_curso) {
      throw new Error(
        `${def.id}: uma submissão de lote (geração ${estado.submissao_em_curso.geracao}, ${estado.submissao_em_curso.em}) foi interrompida antes de gravar o id. ` +
          'Pode existir um lote pago sem registro local: concilie no console da empresa e apague a marca submissao_em_curso do arquivo de estado antes de continuar.',
      );
    }
  } else {
    estado = {
      versao: 1,
      modelo: def.id,
      modo,
      api: def.batch.api as ApiBatch,
      flags,
      lotes: [],
      pedidos: {},
    };
  }
  const persistir = () => gravarLote(caminhoEstado, estado!);

  const submeter = async (ids: string[], geracao: 1 | 2, maxTokens: number): Promise<void> => {
    const pedidos: PedidoBatch[] = ids.map((id) => {
      const c = porCustomId.get(id)!;
      return { customId: id, chamada: { prompt: c.prompt, grounded: false, maxTokens } };
    });
    estado!.submissao_em_curso = { geracao, em: agora() };
    persistir();
    // Sem retry aqui: um POST que falhou pela rede pode ter criado o lote do
    // outro lado; a marca acima força conciliação manual em vez de duplicar.
    const remoto = await provedorBatch.submeter(pedidos, `${rotulo}/g${geracao}`);
    delete estado!.submissao_em_curso;
    const indice = estado!.lotes.push({ geracao, max_tokens: maxTokens, remoto, submetido_em: agora() }) - 1;
    for (const id of ids) {
      const c = porCustomId.get(id)!;
      estado!.pedidos[id] = { item_id: c.item.id, parafrase: c.parafrase, chave: c.chave, lote: indice, situacao: 'submetido' };
    }
    persistir();
  };

  // 3/4. Pendentes que nunca foram pedidos (ou falharam e podem ser reenviados).
  const pendentes = plano.filter((c) => !cache.obter<RegistroBruto>(c.chave));
  const aSubmeter = pendentes
    .map((c) => customIdDe(c.item.id, c.parafrase))
    .filter((id) => {
      const p = estado!.pedidos[id];
      return !p || (p.situacao === 'erro' && o.reenviarFalhas);
    });
  if (aSubmeter.length > 0) {
    const base = plano[0].orcamentoBase;
    await submeter(aSubmeter, 1, base);
    return { situacao: 'em-andamento', resumo: `${def.id}: lote submetido com ${aSubmeter.length} pedido(s) (orçamento ${base}); rode de novo mais tarde para coletar` };
  }

  // 5. Lotes abertos: consultar; coletar os concluídos.
  const abertos = estado.lotes.map((l, i) => [l, i] as const).filter(([l]) => !l.coletado_em && !l.erro);
  let algumProcessando: string | null = null;
  const aEscalar: string[] = [];
  for (const [lote, indice] of abertos) {
    const st = await comRetry(() => provedorBatch.estado(lote.remoto), tentativas, esperaBaseMs);
    lote.ultimo_estado = { em: agora(), bruto: st.bruto, ...(st.contagens ? { contagens: st.contagens } : {}) };
    if (st.extras) lote.remoto.extras = { ...lote.remoto.extras, ...st.extras };
    persistir();
    if (st.fase === 'processando') {
      const c = st.contagens;
      algumProcessando = `${def.id}: lote ${lote.remoto.id} ${st.bruto}${c ? ` (${c.concluidos ?? 0}/${c.total ?? '?'} concluídos)` : ''}, submetido em ${lote.submetido_em}`;
      continue;
    }
    if (st.fase === 'falhou') {
      lote.erro = st.erro ?? st.bruto;
      for (const p of Object.values(estado.pedidos)) {
        if (p.lote === indice && p.situacao === 'submetido') {
          p.situacao = 'erro';
          p.erro = `lote falhou: ${lote.erro}`;
        }
      }
      persistir();
      continue;
    }
    // 6. Coleta.
    const linhas = await comRetry(() => provedorBatch.coletar(lote.remoto), tentativas, esperaBaseMs);
    const vistos = new Set<string>();
    for (const linha of linhas) {
      const p = estado.pedidos[linha.customId];
      const c = porCustomId.get(linha.customId);
      if (!p || !c || p.lote !== indice) continue; // linha de outro lote ou desconhecida
      vistos.add(linha.customId);
      if ('erro' in linha) {
        p.situacao = 'erro';
        p.erro = linha.erro;
        continue;
      }
      const escalado = orcamentoEscalado(c.orcamentoBase);
      if (linha.resposta.finishReason === 'max_tokens' && lote.geracao === 1 && escalado !== null) {
        // Como no síncrono, a resposta cortada é descartada e refeita com o dobro.
        p.situacao = 'escalar';
        aEscalar.push(linha.customId);
        continue;
      }
      const registro = montarRegistro(c, linha.resposta, lote.max_tokens, { banco: o.banco, def, modo }, { execucao: 'batch', lote_id: lote.remoto.id });
      cache.gravar(c.chave, registro);
      p.situacao = 'ok';
      delete p.erro;
    }
    for (const [id, p] of Object.entries(estado.pedidos)) {
      if (p.lote === indice && p.situacao === 'submetido' && !vistos.has(id)) {
        p.situacao = 'erro';
        p.erro = 'sem resultado no lote';
      }
    }
    lote.coletado_em = agora();
    persistir();
  }

  // 7. Escalada: um lote de geração 2 para as linhas cortadas.
  if (aEscalar.length > 0) {
    const escalado = orcamentoEscalado(plano[0].orcamentoBase)!;
    await submeter(aEscalar, 2, escalado);
    return { situacao: 'em-andamento', resumo: `${def.id}: ${aEscalar.length} resposta(s) cortada(s); lote de escalada submetido com orçamento ${escalado}` };
  }
  if (algumProcessando) return { situacao: 'em-andamento', resumo: algumProcessando };

  // 8. Finalizar: registros do cache para todo o plano.
  const registros: RegistroBruto[] = [];
  const faltantes: Array<{ customId: string; erro: string }> = [];
  let chamadas = 0;
  let custoUsd = 0;
  for (const c of plano) {
    const id = customIdDe(c.item.id, c.parafrase);
    const r = cache.obter<RegistroBruto>(c.chave);
    if (r) {
      registros.push(r);
      if (estado.pedidos[id]?.situacao === 'ok') {
        chamadas++;
        custoUsd += r.custo_usd;
      }
      continue;
    }
    faltantes.push({ customId: id, erro: estado.pedidos[id]?.erro ?? 'não submetido' });
  }
  registros.sort((a, b) => a.item_id.localeCompare(b.item_id) || a.parafrase - b.parafrase);
  const resultado: ResultadoExecucao = { registros, doCache: registros.length - chamadas, chamadas, custoUsd };
  if (faltantes.length > 0) return { situacao: 'incompleto', resultado, lotes: estado.lotes, faltantes };
  return { situacao: 'concluido', resultado, lotes: estado.lotes };
}
