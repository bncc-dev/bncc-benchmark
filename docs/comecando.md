# Começando: instalação e primeira execução

Guia mínimo para rodar o benchmark do zero. O protocolo completo está em [`METODOLOGIA.md`](../METODOLOGIA.md); as decisões de desenho em [`DECISOES.md`](../DECISOES.md).

## Requisitos

- Node.js 22+ e [pnpm](https://pnpm.io/) 10+
- Pelo menos uma chave de API de provedor de LLM (veja `.env.example`)

## Instalação

```bash
git clone https://github.com/bncc-dev/bncc-benchmark.git
cd bncc-benchmark
pnpm install
cp .env.example .env   # preencha as chaves que for usar
```

Sem nenhuma chave você já consegue rodar testes, gerar itens e explorar os resultados publicados em `resultados/` — as chaves só são necessárias para **executar** modelos e **julgar** respostas.

> **Sobre `pnpm gerar`:** use sempre `pnpm gerar --sem-heldout`. A geração do
> conjunto held-out exige `SEED_HELDOUT`, que só os mantenedores têm — o
> gerador é determinístico, então publicar essa seed equivaleria a publicar o
> próprio held-out (`DECISOES.md` D5). Sem a flag, o comando falha de
> propósito. O banco público que você gera é idêntico ao versionado.

## Verificando a instalação

```bash
pnpm typecheck   # compila sem emitir
pnpm test        # invariantes do gerador, verificadores, manifesto e proveniência
```

## Primeira execução (smoke)

Uma rodada mínima de ponta a ponta, com 10 itens e um modelo barato:

```bash
pnpm gerar --sem-heldout                                   # itens/itens-v1-rc.json (determinístico, mesma seed = mesmo banco)
pnpm executar --rodada smoke --modelos claude-haiku --limite 10
pnpm avaliar --rodada smoke                                # juiz LLM (usa Bedrock por padrão)
pnpm agregar --rodada smoke
pnpm agregar --rodada smoke --verificar                    # o mesmo check de consistência que o CI usa
```

Os artefatos saem em `resultados/<rodada>/`: respostas brutas em JSONL, julgamentos (`juiz.jsonl`), agregados e manifesto com versão do dataset e checksums.

- **Retomada por cache**: execução interrompida pode ser reinvocada com o mesmo comando; respostas já obtidas não são refeitas.
- **Custo**: a rodada smoke acima custa centavos. A bateria oficial completa (17 modelos × 300 itens × repetições) custou ~US$ 115 — não rode sem querer.

## O que NÃO fazer

- Não edite `itens/` à mão: o banco é gerado e congelado (`congelar-itens.ts`); correções entram só na próxima versão (ver `CONTRIBUTING.md`).
- Não altere `resultados/` de rodadas publicadas: releases são imutáveis (`RELEASES.md`, D11).
- Não commite `.env` nem qualquer arquivo `*heldout*` (o `.gitignore` bloqueia, mas não teste a sorte).
