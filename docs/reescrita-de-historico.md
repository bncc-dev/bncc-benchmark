# Reescrita de histórico de 27/jul/2026

O histórico deste repositório foi reescrito uma vez, antes da abertura pública.
Este documento existe para que ninguém precise adivinhar por que os hashes de
commit não batem com referências antigas.

## O que aconteceu

A auditoria pré-abertura constatou que a seed do conjunto held-out estava
versionada no código e no teste. Como o gerador de itens é determinístico,
publicar essa seed equivaleria a publicar o próprio held-out: qualquer pessoa o
reconstruiria item a item a partir do repositório. Ver `DECISOES.md` D5 e
`docs/plano-abertura.md`.

Removê-la apenas do estado atual não bastava — ela permaneceria acessível em
commits antigos, e abrir o repositório publica o histórico inteiro. O valor foi
então substituído em todos os commits com `git filter-repo`.

## O que mudou e o que não mudou

**Não mudou:** o conteúdo dos arquivos no estado atual. A árvore do commit de
topo é byte a byte idêntica à anterior à reescrita — verificado por comparação
de hash de árvore. Nenhum item, resultado ou nota foi alterado.

**Mudou:** os identificadores de 44 dos 46 commits, consequência inevitável de
qualquer reescrita — o hash de um commit deriva do seu conteúdo e de toda a sua
ancestralidade.

## Rastreando uma referência antiga

`mapa-commits-reescrita-2026-07.txt` mapeia hash antigo → hash novo, uma linha
por commit.

Isso importa em particular para os manifestos das rodadas: cada um registra o
`harness_commit` que produziu aquele resultado, e esses valores apontam para
hashes anteriores à reescrita. O manifesto da rodada `oficial-seca-2026-07`, por
exemplo, registra `aacfdb5`, que hoje corresponde a `5f7fdd2`.

Para converter uma referência:

```bash
grep ^<hash-antigo> docs/mapa-commits-reescrita-2026-07.txt
```

Os manifestos foram deixados como estão, com os hashes originais: eles são
registro auditável do que aconteceu na época da medição e reescrevê-los
apagaria justamente a informação que tornam verificável. O mapa é a ponte.
