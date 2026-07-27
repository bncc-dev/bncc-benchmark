# Plano de abertura do repositório

Análise e estratégia para tornar público o `bncc-dev/bncc-benchmark`, registrada em 2026-07-23 e **revisada por auditoria pré-flip em 2026-07-26**. Irmão do [plano de abertura do bncc-dados](https://github.com/bncc-dev/bncc-dados/blob/main/docs/plano-abertura.md) e alinhado ao compromisso da divisão aberto/comercial firmada lá.

## Veredito da auditoria (2026-07-26)

**Não abrir ainda — há um bloqueador, e ele não é um segredo commitado.** A varredura de segredos saiu limpa: nenhum `.env` jamais entrou no histórico, nenhuma chave literal em nenhum dos 41 commits, nenhum arquivo de held-out em nenhuma árvore. O histórico completo pode ser publicado sem reescrita. O problema é outro e é estrutural: **o held-out é reconstruível byte a byte a partir do código público**. O gerador é determinístico e a seed do held-out está literal no repositório, então o "conjunto privado" deixa de ser privado no instante do flip. Resolvido isso (mais três pendências de comunidade já endereçadas nesta branch), o repositório está pronto.

## Achados

### 🔴 Crítico

**A-1 · O held-out é derivável do repositório público.**

Evidência: `harness/gerar-itens.ts:18-19` fixa `SEED_PUBLICA = 20260712` e `DESLOCAMENTO_HELDOUT = 104729`, com o comentário explicando a fórmula; `test/gerador.test.ts:89` chama `gerarBanco(20260712 + 104729)` diretamente. O gerador (`harness/lib/gerador.ts:374`) é puro e determinístico sobre um PRNG seedado.

Verificado empiricamente: rodando `gerarBanco(20260712 + 104729)` apenas com o código do repositório e comparando com `~/Dev/bncc-benchmark-heldout/itens-heldout-v1-rc.json`, os 300 itens são **idênticos** (comparação profunda dos itens: `true`).

Consequência: qualquer pessoa — inclusive um provedor de LLM com interesse no ranking — reproduz o held-out em um comando depois da abertura. Perde-se exatamente a propriedade que justifica o held-out existir (D5): distinguir aprendizado real de memorização do teste publicado. As proteções atuais (diretório externo + `.gitignore`) protegem o *arquivo* e não a *derivação*; são defesa contra commit acidental, não contra reconstrução.

Correção — **decisão do time**, nenhuma é gratuita:

- **(a) Seed secreta.** O deslocamento do held-out vira variável de ambiente (`SEED_HELDOUT`), fora do repo, e o held-out é **regerado** com ela. Os 300 itens atuais viram lixo e o held-out precisa ser regenerado antes de qualquer medição futura contra ele. Esforço M. É a opção mínima e a recomendada.
- **(b) Held-out curado fora do pipeline.** Itens do held-out deixam de ser gerados pela mesma gramática e passam a ser construídos em repositório privado. Mais robusto (não depende do sigilo de um número), mais caro. Esforço G.
- **(c) Aceitar como risco.** Só é defensável se o held-out for reclassificado publicamente como "conjunto de controle reproduzível", o que o esvazia. Não recomendado.

Em qualquer caso, o `test/gerador.test.ts` precisa parar de codificar a fórmula: o teste de "held-out não vaza" hoje é justamente o que documenta como derivá-lo.

### 🟡 Médio

**A-2 · Caminho absoluto do home do mantenedor nos manifestos publicados.** `resultados/*/manifesto.json` gravava `"itens": "/Users/marcosbeto/Dev/bncc-benchmark/itens/itens-v1.json"` em 23 ocorrências. Identificador, não segredo — expõe o nome de usuário e a topologia local. **Corrigido nesta branch**: caminhos passados para relativos nos manifestos existentes e `harness/executar.ts:86` agora grava relativo à raiz. O manifesto não participa do check de consistência (`harness/lib/manifesto.ts:7`), então nenhuma nota foi afetada.

**A-3 · Ordem de abertura amarrada ao bncc-dados.** `dados-vendorizados/computacao-2022/computacao.json` é cópia de um repositório **ainda privado** (`PROVENIENCIA.md`: commit `5d3f413` do bncc-dados). A licença é CC BY 4.0 e permite redistribuir, então não há problema jurídico — mas publicar aqui expõe conteúdo do dataset antes do release dele. Gate já reconhecido no README ("publicação gateada na release `dados-v1.0.0`"); a auditoria confirma que o gate é real e não formalidade.

**A-4 · Documentos internos versionados.** `docs/anti-vexame/` e `docs/revisoes/2026-07-13-revisao-pre-bateria.md` têm tom de deliberação interna ("para o time ratificar", "adjudicada por Marcos Beto"), incluem custo estimado de baterias pagas e apontam um erro de conteúdo **no site da Profy, mantenedora do bncc.dev** (`docs/anti-vexame/2026-07-15-planilha-adjudicacao.md:20,41`; mesma nota em `itens/itens-v1.json:4350`). Decisão do time, com recomendação:

- **Manter o anti-vexame.** É evidência metodológica de primeira: mostra que os 60 códigos falsos foram triados antes da medição. Vale editar o tom deliberativo para registro concluído.
- **Manter a menção à Profy, explicitando o conflito de interesse.** O benchmark apontar erro no site da própria mantenedora é um ativo de credibilidade, não um passivo — desde que o README diga que a Profy mantém o bncc.dev. Esconder seria pior se alguém descobrisse depois.
- **Avaliar tirar `docs/revisoes/`** do versionado público, ou reescrever sem os valores de custo — é runbook de engenharia interna, não documentação de contribuidor.

### 🟢 Baixo

**A-5 · Sem `LICENSE` canônico.** Existem `LICENSE-CODIGO.md` (MIT) e `LICENSE-DADOS.md` (CC BY 4.0), corretos e coerentes com o split código/dado, mas o GitHub não detecta licença sem um arquivo `LICENSE`. Sugestão: um `LICENSE` curto que aponte para os dois. Esforço P.

**A-6 · Workflows duplicados.** `ci.yml` e `validacao.yml` rodavam o mesmo trio typecheck/test/consistência, com o badge do README apontando só para o segundo e um dos dois sem pin de versão do pnpm. **Corrigido nesta branch**: `ci.yml` removido, `validacao.yml` ficou com o pin, `permissions: contents: read` e o loop genérico sobre todas as rodadas. Sem tokens ou identificadores hardcoded em nenhum dos dois — nada a parametrizar.

### ✅ Verificado e limpo

| Checagem | Resultado |
|---|---|
| `.env` no histórico | Nunca commitado (`git log --all -- .env` vazio); gitignorado desde sempre; `.env.example` presente e com valores vazios |
| Chaves literais em 41 commits | Nenhuma (`sk-*`, `AKIA*`, `ghp_*`, `Bearer`, `api_key=`) — só nomes de variáveis (`envKey`) |
| Held-out no histórico | Nenhum arquivo `*heldout*` em nenhuma árvore de nenhum commit |
| `cache/` | Nunca versionado; ausente do histórico |
| `resultados/` (15.300 respostas) | Sem PII, sem credenciais, sem headers de auth. Campos: prompt, resposta, custo, tokens, proveniência. Seguro publicar |
| Emails / dados pessoais | Nenhum no código ou nos dados |
| Links para repos privados | Só o gate conhecido do bncc-dados; nenhum link quebrado para repositório pessoal |
| Blobs grandes | Maiores são `julgados.jsonl` (6,3 MB) e `juiz.jsonl` (6,1 MB) — aceitável, sem LFS |

## O que NÃO abrir

- **O conjunto held-out — nunca.** É o único segredo real do benchmark e sua razão de existir: discriminar, em re-medições futuras, aprendizado real (melhora nos itens públicos E no held-out) de memorização do teste publicado (melhora só nos públicos). **Atenção: hoje a proteção é insuficiente — ver A-1.** Proteger o arquivo não basta; é preciso proteger a derivação.
- Nada mais. Chaves de API vivem em `.env` (ignorado desde sempre) e o `cache/` de respostas não é versionado.

## Checklist go/no-go

### Mínimo para abrir (bloqueadores)

- [ ] **A-1 · Fechar a derivação do held-out** (seed secreta ou curadoria externa) e **regerar o held-out**. Sem isto, abrir destrói o instrumento.
- [ ] **A-1b · Remover a fórmula do held-out de `test/gerador.test.ts`** — o teste passa a comparar contra a seed vinda do ambiente.
- [ ] **A-3 · Confirmar a release `dados-v1.0.0` do bncc-dados** antes do flip (gate de redistribuição do vendorizado).
- [x] `CONTRIBUTING.md` com a regra de instrumento de medição.
- [x] `CODE_OF_CONDUCT.md` (Contributor Covenant pt-BR, mesmo texto do bncc-dados).
- [x] `SECURITY.md` com canal privado — incluindo suspeita de vazamento do held-out como vulnerabilidade reportável.
- [x] Templates de issue (`item-com-problema`, `modelo-proxima-rodada`, `config.yml`).
- [x] CI ligado e consolidado, validando PRs externos.
- [x] **A-2 ·** Caminhos absolutos removidos dos manifestos.

### Desejável antes de abrir

- [ ] **A-4 ·** Decidir sobre `docs/revisoes/` e ajustar o tom de `docs/anti-vexame/`.
- [ ] **A-4b ·** README declara que a Profy mantém o bncc.dev (conflito de interesse explícito).
- [ ] **A-5 ·** `LICENSE` canônico apontando para os dois.
- [ ] Nota de redistribuição em `resultados/`: origem (modelo, data, ToS do provedor à época) e aviso de que o reuso está sujeito aos termos de cada provedor. Prática padrão (HELM, LMSYS); risco baixo, as restrições recaem sobre o reusuário.
- [ ] Trocar "Estado: em construção, privado" no README pelo texto de lançamento.

## Sequência de flip coordenada

1. Fechar A-1 (seed secreta + regeneração do held-out) — **é o caminho crítico**, tudo mais é rápido.
2. Merge desta branch de auditoria (comunidade + CI + higienização).
3. Itens desejáveis (A-4, A-5, nota de redistribuição, README).
4. **Gate:** release `dados-v1.0.0` do bncc-dados publicada.
5. Flip do bncc-dados → flip do bncc-benchmark (junto ou logo depois).
6. Anúncio conjunto: dataset + benchmark + leaderboard.

A ordem importa: o benchmark redistribui dado vendorizado do bncc-dados, então abrir o benchmark antes do dataset publicaria fragmento de um repositório ainda privado.

## Estratégia de comunidade

- **Abertura casada com o bncc-dados**: dataset aberto + benchmark aberto + held-out privado como garantia de integridade. O trio é raro e é o diferencial de comunicação — e é exatamente por isso que A-1 precisa ser resolvido antes: a narrativa desmorona se o held-out for reproduzível em um comando.
- **Públicos naturais**: labs e provedores de LLM (querem aparecer bem no leaderboard), edtechs avaliando modelos, pesquisadores de avaliação de LLMs em português.
- **Good first issues**: relatar itens ambíguos, propor novos modelos para a próxima rodada, melhorias nos exportadores do site.
- **Narrativa de lançamento**: primeiro benchmark de alucinação sobre a BNCC; metodologia e respostas cruas 100% públicas; held-out privado contra contaminação; leaderboard vivo em bncc.dev.
- **Gestão diária**: ver `docs/guia-comunidade.md`.

## O que não foi possível verificar

- **ToS dos provedores de LLM** quanto à redistribuição de outputs: avaliado por prática de mercado (HELM, LMSYS publicam respostas cruas), não por leitura dos contratos vigentes de cada um dos 17 modelos. Se houver assessoria jurídica, vale uma passada.
- **Se o held-out já foi compartilhado fora do repositório** (mensagem, backup, drive, outra máquina). A auditoria cobre o repositório; não alcança o que saiu dele.
- **Conteúdo integral das 15.300 respostas**: inspecionadas por amostragem e por varredura de padrões (credenciais, email, PII). Respostas de modelo podem conter texto inesperado que uma varredura por padrão não pega.
- **Configuração do GitHub** (branch protection, secrets do Actions, colaboradores, forks internos): fora do alcance do repositório local.
