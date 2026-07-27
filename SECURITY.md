# Política de segurança

## O que reportar por canal privado

Não abra issue pública para:

- Credenciais expostas no repositório ou no histórico (chaves de provedor de
  LLM, tokens de CI, qualquer segredo).
- **Suspeita de vazamento ou reconstrução do conjunto held-out.** Este é o
  ativo mais sensível do projeto: se o held-out se tornar derivável a partir do
  material público, o benchmark perde a capacidade de distinguir aprendizado de
  memorização. Trate como vulnerabilidade, não como bug.
- Qualquer defeito que permita alterar notas publicadas sem que o check de
  consistência do CI reprove.

## Como reportar

Use **[Security advisories](https://github.com/bncc-dev/bncc-benchmark/security/advisories/new)**
do GitHub (privado, visível só aos mantenedores).

Inclua: o que observou, como reproduzir, e o impacto que enxerga. Respondemos
em até 5 dias úteis com um plano e um prazo.

Pedimos que não divulgue publicamente antes da correção estar disponível.
Creditamos quem reporta, salvo pedido em contrário.

## O que não é vulnerabilidade

- Um item com gabarito errado ou ambíguo — isso é uma issue normal, ver
  `CONTRIBUTING.md`.
- Um modelo tirar nota que você considera injusta — as respostas cruas e os
  julgamentos estão publicados em `resultados/`; aponte os itens específicos
  numa issue e abrimos adjudicação.
