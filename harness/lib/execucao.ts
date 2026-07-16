/**
 * Núcleo da execução: (modelo × item × paráfrase), concorrência por provedor,
 * cache como checkpoint, retry com backoff para erros transitórios.
 * Separado do CLI para ser testável com provedor fake.
 */

import { ErroProvedor } from '../provedores/erro.js';
import type { DefModelo, Provedor } from '../provedores/tipos.js';
import { CacheDisco, chaveCache } from './cache.js';
import { URL_MCP } from './mcp-cliente.js';
import { criarLimitador } from './concorrencia.js';
import type { BancoItens, Item, Modo, RegistroBruto } from './tipos.js';

export interface OpcoesExecucao {
  banco: BancoItens;
  itens: Item[];
  def: DefModelo;
  provedor: Provedor;
  modo: Modo;
  parafrases: number;
  cache: CacheDisco;
  concorrencia?: number;
  maxTokens?: number;
  tentativas?: number;
  esperaBaseMs?: number;
  aoProgresso?: (feito: number, total: number, doCache: boolean) => void;
}

export interface ResultadoExecucao {
  registros: RegistroBruto[];
  doCache: number;
  chamadas: number;
  custoUsd: number;
}

const CODIGOS_REDE = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'EPIPE',
  'ENOTFOUND',
  'UND_ERR_SOCKET',
]);

/**
 * Erros de rede chegam do fetch como TypeError cru ("terminated",
 * "fetch failed"), com a causa real (ECONNRESET etc.) aninhada. São
 * transitórios por natureza e merecem retry tanto quanto um 429.
 */
function erroDeRede(erro: unknown): boolean {
  if (!(erro instanceof Error)) return false;
  const causa = (erro as { cause?: { code?: string } }).cause;
  if (causa?.code && CODIGOS_REDE.has(causa.code)) return true;
  return erro instanceof TypeError && /terminated|fetch failed|network/i.test(erro.message);
}

export async function comRetry<T>(
  fn: () => Promise<T>,
  tentativas: number,
  esperaBaseMs: number,
): Promise<T> {
  let ultimoErro: unknown;
  for (let t = 0; t < tentativas; t++) {
    try {
      return await fn();
    } catch (erro) {
      ultimoErro = erro;
      const transitorio = (erro instanceof ErroProvedor && erro.transitorio) || erroDeRede(erro);
      if (!transitorio || t === tentativas - 1) throw erro;
      await new Promise((r) => setTimeout(r, esperaBaseMs * 4 ** t));
    }
  }
  throw ultimoErro;
}

export async function executarBateria(opcoes: OpcoesExecucao): Promise<ResultadoExecucao> {
  const {
    banco,
    itens,
    def,
    provedor,
    modo,
    parafrases,
    cache,
    concorrencia = 5,
    maxTokens = 1024,
    tentativas = 3,
    esperaBaseMs = 1000,
    aoProgresso,
  } = opcoes;

  const limitador = criarLimitador(concorrencia);
  // Cada trabalho NUNCA rejeita (resolve com {erro} em falha): com dezenas de
  // promessas em voo aguardadas sequencialmente, uma rejeição anterior ao
  // await vira unhandledRejection e o Node mata o processo inteiro, por fora
  // de qualquer try/catch (queda 4 da rodada oficial).
  type Trabalho = { registro: RegistroBruto; doCache: boolean } | { erro: unknown };
  const trabalhos: Array<Promise<Trabalho>> = [];

  // Orçamento efetivo: o maior entre a config da rodada e o mínimo do modelo
  // (modelos com raciocínio interno precisam de folga para não sair cortados).
  const orcamentoBase = Math.max(maxTokens, def.maxTokensPadrao ?? 0);
  const TETO_ESCALADA = 16384;

  for (const item of itens) {
    const nParafrases = Math.min(parafrases, item.parafrases.length);
    for (let p = 0; p < nParafrases; p++) {
      const prompt = item.parafrases[p];
      // RB-3: maxTokens e o mecanismo de grounding fazem parte da identidade
      // da chamada; sem eles, uma re-execução com config diferente reutilizaria
      // respostas incompatíveis (ex.: truncadas) em silêncio.
      const chave = chaveCache({
        modelo: def.id,
        modeloApi: def.modelo,
        item: item.id,
        parafrase: p,
        modo,
        prompt,
        itensVersao: banco.versao,
        maxTokens: orcamentoBase,
        grounding: modo === 'grounded' ? `${def.provedor}:${URL_MCP}` : null,
      });

      trabalhos.push(
        limitador(async () => {
          const emCache = cache.obter<RegistroBruto>(chave);
          if (emCache) return { registro: emCache, doCache: true };

          // Escalada automática: resposta cortada por max_tokens ganha uma
          // segunda chance com o dobro do orçamento (o custo real fica nos
          // tokens registrados; a chave de cache usa o orçamento base, então
          // o checkpoint continua determinístico).
          let orcamentoUsado = orcamentoBase;
          let resposta = await comRetry(
            () => provedor.completar({ prompt, grounded: modo === 'grounded', maxTokens: orcamentoBase }),
            tentativas,
            esperaBaseMs,
          );
          if (resposta.finishReason === 'max_tokens' && orcamentoBase < TETO_ESCALADA) {
            orcamentoUsado = Math.min(orcamentoBase * 2, TETO_ESCALADA);
            resposta = await comRetry(
              () => provedor.completar({ prompt, grounded: modo === 'grounded', maxTokens: orcamentoUsado }),
              tentativas,
              esperaBaseMs,
            );
          }
          const registro: RegistroBruto = {
            item_id: item.id,
            modelo: def.id,
            versao_modelo: resposta.versaoModelo,
            parafrase: p,
            modo,
            mecanismo_grounding: resposta.mecanismoGrounding,
            prompt,
            resposta: resposta.texto,
            timestamp: new Date().toISOString(),
            custo_usd: resposta.custoUsd,
            max_tokens: orcamentoUsado,
            tokens: resposta.tokens,
            finish_reason: resposta.finishReason,
            tools_chamadas: resposta.toolsChamadas,
            dataset_versao: banco.dataset_versao,
            itens_versao: banco.versao,
          };
          cache.gravar(chave, registro);
          return { registro, doCache: false };
        }).then(
          (ok) => ok as Trabalho,
          (erro) => ({ erro }) as Trabalho,
        ),
      );
    }
  }

  const total = trabalhos.length;
  let feito = 0;
  const resultados: Array<{ registro: RegistroBruto; doCache: boolean }> = [];
  let primeiroErro: unknown = null;
  let erros = 0;
  for (const trabalho of trabalhos) {
    const r = await trabalho;
    feito++;
    if ('erro' in r) {
      erros++;
      if (primeiroErro === null) primeiroErro = r.erro;
      continue;
    }
    aoProgresso?.(feito, total, r.doCache);
    resultados.push(r);
  }
  if (primeiroErro !== null) {
    // Tudo que completou está no cache; o chamador decide (FALHA + fila segue).
    throw new Error(
      `${erros} de ${total} chamadas falharam após retries; primeiro erro: ${(primeiroErro as Error).message?.slice(0, 200)}`,
      { cause: primeiroErro },
    );
  }

  // Ordem estável no JSONL, independente da ordem de conclusão.
  resultados.sort(
    (a, b) =>
      a.registro.item_id.localeCompare(b.registro.item_id) ||
      a.registro.parafrase - b.registro.parafrase,
  );

  return {
    registros: resultados.map((r) => r.registro),
    doCache: resultados.filter((r) => r.doCache).length,
    chamadas: resultados.filter((r) => !r.doCache).length,
    custoUsd: resultados.reduce((soma, r) => (r.doCache ? soma : soma + r.registro.custo_usd), 0),
  };
}

/** Subconjunto balanceado entre tarefas (para smokes com --limite). */
export function selecionarBalanceado(itens: Item[], limite: number): Item[] {
  if (limite >= itens.length) return itens;
  const porTarefa = new Map<string, Item[]>();
  for (const item of itens) {
    const grupo = porTarefa.get(item.tarefa) ?? [];
    grupo.push(item);
    porTarefa.set(item.tarefa, grupo);
  }
  const grupos = [...porTarefa.values()];
  const selecionados: Item[] = [];
  let indice = 0;
  while (selecionados.length < limite) {
    let adicionou = false;
    for (const grupo of grupos) {
      if (selecionados.length >= limite) break;
      if (indice < grupo.length) {
        selecionados.push(grupo[indice]);
        adicionou = true;
      }
    }
    if (!adicionou) break;
    indice++;
  }
  return selecionados;
}
