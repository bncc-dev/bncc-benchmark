import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { CacheDisco } from '../harness/lib/cache.js';
import { executarBateria, montarRegistro, orcamentoEscalado, planejarChamadas, TETO_ESCALADA } from '../harness/lib/execucao.js';
import { avancarLote } from '../harness/lib/execucao-batch.js';
import { gerarBanco } from '../harness/lib/gerador.js';
import { caminhoLote, lerLote, type FlagsLote } from '../harness/lib/lote.js';
import type { DefModelo, LinhaLote, PedidoBatch, Provedor, ProvedorBatch, RespostaModelo } from '../harness/provedores/tipos.js';

const banco = gerarBanco(20260712);
const dirTemporario = mkdtempSync(join(tmpdir(), 'bncc-benchmark-batch-'));
afterAll(() => rmSync(dirTemporario, { recursive: true, force: true }));

const DEF: DefModelo = {
  id: 'fake-batch',
  provedor: 'anthropic',
  modelo: 'fake-1',
  envKey: 'FAKE_KEY',
  precos: { entrada: 1, saida: 5 },
  batch: { api: 'anthropic' },
  suportaGrounded: false,
};

const FLAGS: FlagsLote = { itens: 'itens/x.json', itens_versao: banco.versao, limite: 4, parafrases: 1, max_tokens_flag: 1024 };

function resposta(texto: string, extra: Partial<RespostaModelo> = {}): RespostaModelo {
  return {
    texto,
    versaoModelo: 'fake-1',
    finishReason: 'fim',
    tokens: { entrada: 100, saida: 20 },
    custoUsd: 0.0001, // já com o fator de batch aplicado (responsabilidade do adapter)
    toolsChamadas: 0,
    mecanismoGrounding: null,
    ...extra,
  };
}

/** ProvedorBatch fake: lotes ficam "processando" até serem liberados; respostas programáveis por customId. */
function provedorBatchFake() {
  const submetidos: Array<{ id: string; pedidos: PedidoBatch[]; rotulo: string }> = [];
  const liberados = new Set<string>();
  const falhos = new Set<string>();
  let programar: (p: PedidoBatch) => LinhaLote = (p) => ({ customId: p.customId, resposta: resposta(`r:${p.customId}`) });
  const provedor: ProvedorBatch = {
    id: DEF.id,
    async submeter(pedidos, rotulo) {
      const id = `lote-${submetidos.length + 1}`;
      submetidos.push({ id, pedidos, rotulo });
      return { id };
    },
    async estado(lote) {
      if (falhos.has(lote.id)) return { fase: 'falhou', bruto: 'failed', erro: 'arquivo reprovado' };
      if (!liberados.has(lote.id)) return { fase: 'processando', bruto: 'in_progress', contagens: { total: 2, concluidos: 0 } };
      return { fase: 'concluido', bruto: 'ended', extras: { results_url: `u/${lote.id}` } };
    },
    async coletar(lote) {
      expect(lote.extras?.results_url).toBe(`u/${lote.id}`); // extras do estado chegam à coleta
      const l = submetidos.find((s) => s.id === lote.id)!;
      return l.pedidos.map(programar);
    },
  };
  return {
    provedor,
    submetidos,
    liberar: (id: string) => liberados.add(id),
    falhar: (id: string) => falhos.add(id),
    programar: (fn: typeof programar) => (programar = fn),
  };
}

function cenario(nome: string, def: DefModelo = DEF, maxTokens = 1024) {
  const dir = join(dirTemporario, nome);
  const cache = new CacheDisco(join(dir, 'cache'));
  const itens = banco.itens.slice(0, 4);
  const fake = provedorBatchFake();
  const caminhoEstado = caminhoLote(dir, def.id, 'seco');
  const avancar = (extra: { reenviarFalhas?: boolean } = {}) =>
    avancarLote({ banco, itens, def, modo: 'seco', parafrases: 1, cache, maxTokens, provedorBatch: fake.provedor, caminhoEstado, flags: { ...FLAGS, max_tokens_flag: maxTokens }, rotulo: `t/${nome}`, ...extra });
  return { dir, cache, itens, fake, caminhoEstado, avancar };
}

describe('funções extraídas de executarBateria', () => {
  it('planejarChamadas produz exatamente as chaves que executarBateria grava no cache', async () => {
    const cache = new CacheDisco(join(dirTemporario, 'plano', 'cache'));
    const itens = banco.itens.slice(0, 3);
    const provedor: Provedor = { id: 'fake', async completar() { return resposta('x'); } };
    await executarBateria({ banco, itens, def: DEF, provedor, modo: 'seco', parafrases: 2, cache, maxTokens: 1024 });
    const plano = planejarChamadas({ banco, itens, def: DEF, modo: 'seco', parafrases: 2, maxTokens: 1024 });
    expect(plano).toHaveLength(6);
    for (const c of plano) expect(cache.obter(c.chave)).not.toBeNull();
  });

  it('orcamentoEscalado dobra até o teto e devolve null no teto', () => {
    expect(orcamentoEscalado(1024)).toBe(2048);
    expect(orcamentoEscalado(9000)).toBe(TETO_ESCALADA);
    expect(orcamentoEscalado(TETO_ESCALADA)).toBeNull();
  });

  it('montarRegistro carimba execucao/lote_id só quando há extras', () => {
    const [c] = planejarChamadas({ banco, itens: banco.itens.slice(0, 1), def: DEF, modo: 'seco', parafrases: 1, maxTokens: 1024 });
    const ctx = { banco, def: DEF, modo: 'seco' as const };
    const sem = montarRegistro(c, resposta('a'), 1024, ctx);
    expect(sem).not.toHaveProperty('execucao');
    expect(sem).not.toHaveProperty('lote_id');
    const com = montarRegistro(c, resposta('a'), 2048, ctx, { execucao: 'batch', lote_id: 'L1' });
    expect(com).toMatchObject({ execucao: 'batch', lote_id: 'L1', max_tokens: 2048, modelo: DEF.id });
  });
});

describe('avancarLote', () => {
  it('submete só o que não está em cache, persiste o estado e devolve em-andamento', async () => {
    const { cache, itens, fake, avancar, caminhoEstado } = cenario('submete');
    // Um item já em cache (vindo do síncrono): não vai ao lote.
    const provedor: Provedor = { id: 'fake', async completar() { return resposta('sincrono'); } };
    await executarBateria({ banco, itens: itens.slice(0, 1), def: DEF, provedor, modo: 'seco', parafrases: 1, cache, maxTokens: 1024 });

    const r1 = await avancar();
    expect(r1.situacao).toBe('em-andamento');
    expect(fake.submetidos).toHaveLength(1);
    expect(fake.submetidos[0].pedidos).toHaveLength(3);
    expect(fake.submetidos[0].pedidos.every((p) => p.chamada.grounded === false && p.chamada.maxTokens === 1024)).toBe(true);
    const estado = lerLote(caminhoEstado)!;
    expect(estado.lotes).toHaveLength(1);
    expect(Object.values(estado.pedidos).every((p) => p.situacao === 'submetido')).toBe(true);
    expect(estado.submissao_em_curso).toBeUndefined();

    // Lote ainda processando: não ressubmete.
    const r2 = await avancar();
    expect(r2.situacao).toBe('em-andamento');
    expect(fake.submetidos).toHaveLength(1);
    expect(lerLote(caminhoEstado)!.lotes[0].ultimo_estado?.bruto).toBe('in_progress');
  });

  it('coleta grava no cache com carimbo de batch; o síncrono depois sai 100% do cache', async () => {
    const { cache, itens, fake, avancar } = cenario('coleta');
    await avancar();
    fake.liberar('lote-1');
    const r = await avancar();
    expect(r.situacao).toBe('concluido');
    if (r.situacao !== 'concluido') return;
    expect(r.resultado.registros).toHaveLength(4);
    expect(r.resultado.chamadas).toBe(4);
    expect(r.resultado.doCache).toBe(0);
    expect(r.resultado.custoUsd).toBeCloseTo(0.0004, 6); // fator já aplicado pelo adapter; não aplica de novo
    expect(r.resultado.registros.every((x) => x.execucao === 'batch' && x.lote_id === 'lote-1' && x.max_tokens === 1024)).toBe(true);
    expect(r.lotes[0].coletado_em).toBeDefined();

    const contador = { chamadas: 0 };
    const provedor: Provedor = { id: 'fake', async completar() { contador.chamadas++; return resposta('nao deveria'); } };
    const sinc = await executarBateria({ banco, itens, def: DEF, provedor, modo: 'seco', parafrases: 1, cache, maxTokens: 1024 });
    expect(contador.chamadas).toBe(0);
    expect(sinc.doCache).toBe(4);
    expect(sinc.registros[0].execucao).toBe('batch');
  });

  it('escalada: resposta cortada vai a um lote de geração 2 com o dobro; bruto grava o orçamento efetivo', async () => {
    const { itens, fake, avancar, caminhoEstado } = cenario('escala', DEF, 2048);
    await avancar();
    fake.programar((p) =>
      p.customId.startsWith(`${itens[0].id}-`)
        ? { customId: p.customId, resposta: resposta('cortada', { finishReason: 'max_tokens' }) }
        : { customId: p.customId, resposta: resposta(`ok:${p.customId}`) },
    );
    fake.liberar('lote-1');
    const r2 = await avancar();
    expect(r2.situacao).toBe('em-andamento');
    expect(fake.submetidos).toHaveLength(2);
    expect(fake.submetidos[1].pedidos).toHaveLength(1);
    expect(fake.submetidos[1].pedidos[0].chamada.maxTokens).toBe(4096);
    expect(lerLote(caminhoEstado)!.lotes[1]).toMatchObject({ geracao: 2, max_tokens: 4096 });

    fake.programar((p) => ({ customId: p.customId, resposta: resposta('inteira') }));
    fake.liberar('lote-2');
    const r3 = await avancar();
    expect(r3.situacao).toBe('concluido');
    if (r3.situacao !== 'concluido') return;
    const escalado = r3.resultado.registros.find((x) => x.item_id === itens[0].id)!;
    expect(escalado).toMatchObject({ max_tokens: 4096, lote_id: 'lote-2', resposta: 'inteira' });
    // A chave é a do orçamento base: o mesmo plano acha o registro no cache.
    const plano = planejarChamadas({ banco, itens, def: DEF, modo: 'seco', parafrases: 1, maxTokens: 2048 });
    expect(plano.every((c) => lerLote(caminhoEstado)!.pedidos[`${c.item.id}-p0`].chave === c.chave)).toBe(true);
  });

  it('no teto de escalada a resposta cortada entra no cache como está (paridade com o síncrono)', async () => {
    const { fake, avancar } = cenario('teto', DEF, TETO_ESCALADA);
    await avancar();
    fake.programar((p) => ({ customId: p.customId, resposta: resposta('cortada', { finishReason: 'max_tokens' }) }));
    fake.liberar('lote-1');
    const r = await avancar();
    expect(r.situacao).toBe('concluido');
    expect(fake.submetidos).toHaveLength(1);
  });

  it('linhas com erro não abortam; resultado incompleto; reenvio só com a flag', async () => {
    const { itens, fake, avancar } = cenario('erros');
    await avancar();
    fake.programar((p) =>
      p.customId.startsWith(`${itens[1].id}-`) ? { customId: p.customId, erro: 'expired' } : { customId: p.customId, resposta: resposta('ok') },
    );
    fake.liberar('lote-1');
    const r = await avancar();
    expect(r.situacao).toBe('incompleto');
    if (r.situacao !== 'incompleto') return;
    expect(r.resultado.registros).toHaveLength(3);
    expect(r.faltantes).toEqual([{ customId: `${itens[1].id}-p0`, erro: 'expired' }]);

    // Sem a flag: nada é submetido de novo.
    const r2 = await avancar();
    expect(r2.situacao).toBe('incompleto');
    expect(fake.submetidos).toHaveLength(1);

    // Com a flag: só a faltante.
    fake.programar((p) => ({ customId: p.customId, resposta: resposta('agora foi') }));
    const r3 = await avancar({ reenviarFalhas: true });
    expect(r3.situacao).toBe('em-andamento');
    expect(fake.submetidos[1].pedidos.map((p) => p.customId)).toEqual([`${itens[1].id}-p0`]);
    fake.liberar('lote-2');
    const r4 = await avancar({ reenviarFalhas: true });
    expect(r4.situacao).toBe('concluido');
  });

  it('pedidos "escalar" órfãos de uma passada anterior são submetidos na passada seguinte', async () => {
    const { cache, itens, fake, avancar, caminhoEstado } = cenario('escala-orfa', DEF, 2048);
    await avancar();
    fake.programar((p) => ({ customId: p.customId, resposta: resposta('cortada', { finishReason: 'max_tokens' }) }));
    fake.liberar('lote-1');
    // A submissão da escalada falha (ex.: 429): a coleta já gravou 'escalar' no estado.
    const original = fake.provedor.submeter;
    fake.provedor.submeter = async () => { throw new Error('429'); };
    await expect(avancar()).rejects.toThrow('429');
    const estado = lerLote(caminhoEstado)!;
    expect(Object.values(estado.pedidos).every((p) => p.situacao === 'escalar')).toBe(true);
    expect(estado.submissao_em_curso).toBeDefined();
    // Conciliação manual: apaga a marca; a passada seguinte submete a geração 2.
    delete estado.submissao_em_curso;
    const { gravarLote } = await import('../harness/lib/lote.js');
    gravarLote(caminhoEstado, estado);
    fake.provedor.submeter = original;
    const r = await avancar();
    expect(r.situacao).toBe('em-andamento');
    expect(fake.submetidos).toHaveLength(2);
    expect(fake.submetidos[1].pedidos).toHaveLength(itens.length);
    expect(fake.submetidos[1].pedidos[0].chamada.maxTokens).toBe(4096);
    expect(cache.obter(lerLote(caminhoEstado)!.pedidos[fake.submetidos[1].pedidos[0].customId].chave)).toBeNull();
  });

  it('customId ausente na coleta vira erro "sem resultado no lote"', async () => {
    const { itens, fake, avancar } = cenario('ausente');
    await avancar();
    fake.programar((p) => ({ customId: p.customId.startsWith(`${itens[2].id}-`) ? 'outro' : p.customId, resposta: resposta('ok') }));
    fake.liberar('lote-1');
    const r = await avancar();
    expect(r.situacao).toBe('incompleto');
    if (r.situacao === 'incompleto') expect(r.faltantes[0].erro).toBe('sem resultado no lote');
  });

  it('lote que falhou na consulta marca os pedidos como erro sem ressubmeter', async () => {
    const { fake, avancar } = cenario('falhou');
    await avancar();
    fake.falhar('lote-1');
    const r = await avancar();
    expect(r.situacao).toBe('incompleto');
    if (r.situacao === 'incompleto') expect(r.faltantes.every((f) => f.erro.includes('arquivo reprovado'))).toBe(true);
    expect(fake.submetidos).toHaveLength(1);
  });

  it('configuração divergente da submissão aborta sem submeter', async () => {
    const { cache, itens, fake, caminhoEstado, avancar } = cenario('flags');
    await avancar();
    await expect(
      avancarLote({ banco, itens, def: DEF, modo: 'seco', parafrases: 1, cache, maxTokens: 4096, provedorBatch: fake.provedor, caminhoEstado, flags: { ...FLAGS, max_tokens_flag: 4096 }, rotulo: 't' }),
    ).rejects.toThrow(/outra configuração/);
    expect(fake.submetidos).toHaveLength(1);
  });

  it('marca de submissão interrompida bloqueia nova submissão', async () => {
    const { cache, itens, fake, caminhoEstado, avancar } = cenario('interrompida');
    const quebrado: ProvedorBatch = { ...fake.provedor, async submeter() { throw new Error('rede caiu'); } };
    await expect(
      avancarLote({ banco, itens, def: DEF, modo: 'seco', parafrases: 1, cache, maxTokens: 1024, provedorBatch: quebrado, caminhoEstado, flags: FLAGS, rotulo: 't' }),
    ).rejects.toThrow('rede caiu');
    expect(lerLote(caminhoEstado)!.submissao_em_curso).toBeDefined();
    await expect(avancar()).rejects.toThrow(/interrompida/);
  });

  it('recusa modo diferente de seco', async () => {
    const { cache, itens, fake, caminhoEstado } = cenario('modo');
    await expect(
      avancarLote({ banco, itens, def: DEF, modo: 'grounded', parafrases: 1, cache, maxTokens: 1024, provedorBatch: fake.provedor, caminhoEstado, flags: FLAGS, rotulo: 't' }),
    ).rejects.toThrow(/modo seco/);
  });
});
