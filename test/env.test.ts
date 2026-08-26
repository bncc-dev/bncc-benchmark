import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { carregarEnv } from '../harness/lib/env.js';

const NOME = 'BNCC_TESTE_ENV_KEY';

describe('carregarEnv', () => {
  afterEach(() => {
    delete process.env[NOME];
  });

  it('o .env vence a variável de shell com o mesmo nome (D14.1)', () => {
    process.env[NOME] = 'da-shell';
    const dir = mkdtempSync(join(tmpdir(), 'bncc-env-'));
    const caminho = join(dir, '.env');
    writeFileSync(caminho, `# comentário\n${NOME}="do-arquivo"\n`, 'utf8');
    expect(carregarEnv(caminho)[NOME]).toBe('do-arquivo');
  });

  it('variável só na shell continua visível', () => {
    process.env[NOME] = 'da-shell';
    const dir = mkdtempSync(join(tmpdir(), 'bncc-env-'));
    const caminho = join(dir, '.env');
    writeFileSync(caminho, 'OUTRA=1\n', 'utf8');
    expect(carregarEnv(caminho)[NOME]).toBe('da-shell');
  });

  it('.env ausente devolve o ambiente da shell', () => {
    process.env[NOME] = 'da-shell';
    expect(carregarEnv('/caminho/inexistente/.env')[NOME]).toBe('da-shell');
  });
});
