# Dados vendorizados · proveniência

## computacao-2022/computacao.json

- **Origem canônica:** repositório bncc-dados (github.com/bncc-dev/bncc-dados),
  arquivo `dados/computacao-2022/computacao.json`, commit `5d3f413`,
  checkout limpo, copiado em 12/jul/2026.
- **SHA-256:** `7863d5a4bc21236e285e3f7d30f0f06182c50573bc61694899cc2f9207b65ad3`
- **Licença:** CC BY 4.0 (mesma do dataset).
- **Por que vendorizado:** o `@bncc/dados@0.2.0` publicado no npm (09/jul/2026)
  antecede a extração de Computação (11/jul/2026) e não embute o arquivo.
  O módulo entra na API tipada do pacote na versão 1.0; quando isso acontecer,
  este diretório deve ser removido e o `harness/lib/gabarito.ts` deve voltar a
  ler tudo do pacote. Ver DECISOES.md D4.
- **Guarda:** o teste `test/gabarito.test.ts` fixa o SHA-256 acima; qualquer
  alteração no arquivo sem atualizar esta proveniência quebra o CI.
