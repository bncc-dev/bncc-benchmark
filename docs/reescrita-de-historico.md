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

**A reescrita não foi suficiente sozinha.** Depois do force-push, verificou-se
que o GitHub continua servindo os commits órfãos por SHA direto: a seed antiga
seguia recuperável pela API. Por isso o held-out foi **regerado com seed nova**
de origem criptográfica, o que torna o valor exposto irrelevante — ele abre um
conjunto que não é mais o held-out. Essa é a razão de esta limpeza não depender
de coleta de lixo do lado do GitHub.

## O que mudou e o que não mudou

**Não mudou:** o conteúdo dos arquivos no estado atual. A árvore do commit de
topo é byte a byte idêntica à anterior à reescrita — verificado por comparação
de hash de árvore. Nenhum item público, resultado ou nota foi alterado.

**Mudou:** os identificadores de 44 dos 46 commits, consequência inevitável de
qualquer reescrita — o hash de um commit deriva do seu conteúdo e de toda a sua
ancestralidade.

## Rastreando uma referência antiga

Os manifestos das rodadas registram o `harness_commit` que produziu cada
resultado, com os hashes da época. Foram deixados como estão de propósito: são
registro auditável do que aconteceu na medição, e reescrevê-los apagaria
justamente a informação que os torna verificáveis.

| Manifesto registra | Commit correspondente hoje |
|---|---|
| `aacfdb5` | `5f7fdd2` |
| `a594f50` | `767687c` |
| `65cb6b8` | `598eeeb` |

O mapa completo dos 46 commits existe, mas **não é versionado**: publicá-lo
seria publicar um índice dos objetos órfãos que o GitHub ainda serve por SHA.
Está com os mantenedores; peça por canal privado se precisar converter um hash
fora da tabela acima.
