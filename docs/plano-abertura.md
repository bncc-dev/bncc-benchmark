# Plano de abertura do repositório

Análise e estratégia para tornar público o `bncc-dev/bncc-benchmark`, registrada em 2026-07-23 e **revisada por auditoria pré-flip em 2026-07-26**. Irmão do [plano de abertura do bncc-dados](https://github.com/bncc-dev/bncc-dados/blob/main/docs/plano-abertura.md) e alinhado ao compromisso da divisão aberto/comercial firmada lá.

> **Nota de higiene deste documento.** Ele descreve como o held-out era derivável, mas **nunca cita os valores**. Qualquer edição futura deve manter essa regra: um plano de abertura que publica o segredo que ele mesmo protege é pior que não ter plano.

## Situação em 2026-07-27: A-1 fechado

O bloqueador crítico foi resolvido. A sequência, e o que ela ensinou:

1. Seed saiu do código para `SEED_HELDOUT` no `.env`; teste deixou de codificar a fórmula; geração do held-out virou opt-in (`--com-heldout`).
2. Histórico reescrito com `git filter-repo` e force-push. A árvore do topo ficou byte a byte idêntica — nada do conteúdo atual mudou.
3. **A reescrita não bastou.** Verificação pós-push mostrou que o GitHub continua servindo commits órfãos por SHA direto: a seed antiga seguia recuperável pela API, e o mapa de commits que havia sido versionado funcionava como índice desses objetos.
4. **Held-out regerado com seed nova** de origem criptográfica. Como ele nunca havia sido usado em medição (todas as rodadas apontam para `itens/itens-v1.json`), o custo foi um comando e nenhuma comparabilidade perdida. A seed exposta hoje abre um conjunto que não é mais o held-out.
5. Mapa completo saiu do versionado; `docs/reescrita-de-historico.md` publica só os três hashes que os manifestos citam.

Lição para futuras limpezas: **force-push não apaga nada no GitHub.** Objetos órfãos seguem servidos por SHA até uma coleta de lixo que só ocorre a pedido do suporte. Qualquer remediação que dependa só de reescrita de histórico é incompleta; a que invalida o segredo (rotação/regeneração) não depende de terceiros.

Continua verdadeira a ressalva de fundo: nada disso responde se alguém copiou os objetos antes. A regeneração é o que torna essa pergunta irrelevante.

## Veredito da auditoria (2026-07-26) — registro histórico

> As duas seções seguintes preservam o diagnóstico original, incluindo a parte que se mostrou incompleta (a suposição de que reescrever o histórico bastaria). Ficam como estão porque o erro é a parte instrutiva. O estado atual é o da seção acima.

**Não abrir ainda — e o bloqueador não é um segredo commitado.** A varredura saiu limpa: nenhum `.env` jamais entrou no histórico, nenhuma chave literal em nenhum dos 41 commits, nenhum arquivo de held-out em nenhuma árvore, nenhuma PII nas 15.300 respostas.

O bloqueador é estrutural: **o held-out é reconstruível byte a byte a partir do código do repositório**. O gerador é determinístico e a seed do held-out está literal no código e no teste. Enquanto o repositório é privado isso é um risco contido; no instante do flip, o "conjunto privado" deixa de ser privado.

A boa notícia, e ela muda o custo do conserto: **como nada vazou, o held-out atual continua válido.** Não é preciso regerar os 300 itens. Basta tirar a seed do repositório *e do histórico* antes de abrir. O que era retrabalho de geração vira uma limpeza de histórico.

## Achados

### 🔴 Crítico

**A-1 · O held-out é derivável do repositório.** — ✅ **RESOLVIDO em 27/jul/2026** (ver seção de situação, no topo). O relato abaixo é o do achado original.

Evidência: `harness/gerar-itens.ts:18-19` fixa a seed pública e o deslocamento que produz a seed do held-out, com o comentário explicando a fórmula; `test/gerador.test.ts:89` refaz a conta literalmente — o teste chamado *"held-out não vaza"* é o mapa mais direto para derivá-lo. O gerador (`harness/lib/gerador.ts:374`) é puro e determinístico sobre um PRNG seedado.

Verificado empiricamente: gerando o banco com a seed derivada, usando apenas código do repositório, e comparando com `~/Dev/bncc-benchmark-heldout/itens-heldout-v1-rc.json`, os 300 itens são **idênticos** (comparação profunda: `true`).

Consequência se aberto como está: qualquer pessoa — inclusive um provedor com interesse no ranking — reproduz o held-out em um comando. Perde-se a propriedade que justifica ele existir (D5): distinguir aprendizado real de memorização do teste publicado. As proteções atuais (diretório externo + `.gitignore`) protegem o *arquivo*, não a *derivação*: são defesa contra commit acidental, não contra reconstrução.

Superfície pequena: `git log -S` sobre o deslocamento retorna **dois commits** (`d8368dc`, que o introduziu, e o commit desta auditoria). Nenhum outro artefato versionado o contém.

#### Método de correção (recomendado)

Quatro operações, nesta ordem. Código e docs primeiro; histórico depois, para que a limpeza varra um estado já correto.

**1 · Seed sai do código, valor permanece.** O deslocamento deixa de ser constante e passa a vir do `.env` (já ignorado, já com carregador em `harness/lib/env.ts`), com falha explícita se ausente:

```ts
const seedHeldout = Number(carregarEnv().SEED_HELDOUT);
if (!args['sem-heldout'] && !Number.isFinite(seedHeldout)) {
  throw new Error('SEED_HELDOUT ausente no .env — held-out não pode ser gerado.');
}
```

Guardar no `.env` a **seed inteira**, não o deslocamento: assim o esquema "pública + primo" também sai do repositório — hoje o comentário entrega o método, não só o valor. O `.env.example` ganha `SEED_HELDOUT=` vazio, mesmo padrão das chaves de API: avisa que a variável existe sem revelar nada.

A seed **não muda de valor**. É o que preserva o held-out atual.

**2 · Teste para de codificar a fórmula.** A propriedade verificada em `test/gerador.test.ts:88-96` é genérica — "seeds diferentes produzem bancos diferentes" — e não precisa das seeds reais. Duas seeds arbitrárias (`gerarBanco(1)` × `gerarBanco(2)`) provam o mesmo, e o CI segue rodando sem acesso ao segredo.

**3 · Limpeza do histórico com `git filter-repo`.** Arquivo de substituições cobrindo o deslocamento e a seed derivada, aplicado a todos os commits. Preferível a criar repositório novo: preserva mensagens, datas, autoria e a sequência de decisões — num projeto cujo argumento é auditabilidade, a linha do tempo tem valor, e um squash em commit único a destrói.

**Custo inevitável, em qualquer das duas rotas: todos os hashes de commit mudam.** Os manifestos apontam para `"harness_commit": "aacfdb5"`, que deixa de existir. O `filter-repo` emite um `commit-map` (antigo → novo); **versionar esse arquivo** preserva a ponte de proveniência dos resultados publicados.

**4 · Higienização documental.** Varrer comentários, `DECISOES.md` e este plano por menções ao método de derivação. Sem isso, limpar o histórico não adianta: o segredo continua no estado atual.

Verificação de saída: `git log -S` sobre os valores, em todos os commits, deve voltar vazio. Depois, force-push e **reclone obrigatório por todo o time** — clones antigos ainda contêm a seed e podem reintroduzi-la num push distraído. Forks internos, espelhos e backups precisam do mesmo tratamento.

#### Alternativa mais robusta (custo G)

Held-out curado à mão em repositório privado, fora do pipeline generativo. Não depende de manter um número em segredo para sempre — não há fórmula a vazar. Mais caro: alguém precisa construir os itens. Vale considerar quando o banco for para v2.

#### Ressalva sobre a força do segredo

O esquema `seed_pública + deslocamento` é fraco por desenho: um atacante pode varrer deslocamentos pequenos. Hoje isso não leva a nada, porque ele não tem como *reconhecer* o acerto. Mas **notas publicadas por item do held-out virariam gabarito de conferência**, permitindo confirmar palpites. Duas consequências: publicar do held-out apenas agregados, nunca itens ou respostas item a item; e, numa eventual regeneração, usar seed aleatória de alta entropia em vez de derivada da pública.

### 🟡 Médio

**A-2 · Caminho absoluto do home do mantenedor nos manifestos.** `resultados/*/manifesto.json` gravava `"itens": "/Users/<usuário>/Dev/..."` em 23 ocorrências. Identificador, não segredo — expõe usuário e topologia local. **Corrigido nesta branch**: manifestos passados para caminho relativo e `harness/executar.ts:86` agora grava relativo à raiz. O manifesto não participa do check de consistência (`harness/lib/manifesto.ts:7`); nenhuma nota foi afetada.

**A-3 · Ordem de abertura amarrada ao bncc-dados.** `dados-vendorizados/computacao-2022/computacao.json` é cópia de um repositório **ainda privado** (`PROVENIENCIA.md`: commit `5d3f413` do bncc-dados). CC BY 4.0 permite redistribuir, então não há problema jurídico — mas publicar aqui expõe conteúdo do dataset antes do release dele. O gate do README (`dados-v1.0.0`) é real, não formalidade.

**A-4 · Documentos internos versionados.** `docs/anti-vexame/` e `docs/revisoes/2026-07-13-revisao-pre-bateria.md` têm tom de deliberação interna ("para o time ratificar", adjudicação nominal), incluem custo estimado de baterias pagas e apontam erro de conteúdo **no site da Profy, mantenedora do bncc.dev** (`docs/anti-vexame/2026-07-15-planilha-adjudicacao.md:20,41`; mesma nota em `itens/itens-v1.json:4350`). Recomendação:

- **Manter o anti-vexame.** É evidência metodológica de primeira: mostra que os 60 códigos falsos foram triados antes da medição. Vale ajustar o tom deliberativo para registro concluído.
- **Manter a menção à Profy, explicitando o conflito de interesse no README.** O benchmark apontar erro no site da própria mantenedora é ativo de credibilidade, não passivo. Esconder seria pior se alguém descobrisse depois.
- **Avaliar tirar `docs/revisoes/`** do versionado público, ou reescrever sem os valores de custo — é runbook de engenharia interna, não documentação de contribuidor.

### 🟢 Baixo

**A-5 · Sem `LICENSE` canônico.** `LICENSE-CODIGO.md` (MIT) e `LICENSE-DADOS.md` (CC BY 4.0) estão corretos e coerentes com o split código/dado, mas o GitHub não detecta licença sem um arquivo `LICENSE`. Um `LICENSE` curto apontando para os dois resolve. Esforço P.

**A-6 · Workflows duplicados.** `ci.yml` e `validacao.yml` rodavam o mesmo trio typecheck/test/consistência, com o badge do README apontando só para o segundo e um deles sem pin do pnpm. **Corrigido nesta branch**: `ci.yml` removido, `validacao.yml` com pin, `permissions: contents: read` e loop genérico sobre todas as rodadas. Nenhum token ou identificador hardcoded — nada a parametrizar.

### ✅ Verificado e limpo

| Checagem | Resultado |
|---|---|
| `.env` no histórico | Nunca commitado (`git log --all -- .env` vazio); gitignorado desde sempre; `.env.example` com valores vazios |
| Chaves literais em 41 commits | Nenhuma (`sk-*`, `AKIA*`, `ghp_*`, `Bearer`, `api_key=`) — só nomes de variáveis (`envKey`) |
| Held-out no histórico | Nenhum arquivo `*heldout*` em nenhuma árvore de nenhum commit |
| `cache/` | Nunca versionado; ausente do histórico |
| `resultados/` (15.300 respostas) | Sem PII, sem credenciais, sem headers de auth. Campos: prompt, resposta, custo, tokens, proveniência. Seguro publicar |
| Emails / dados pessoais | Nenhum no código ou nos dados |
| Links para repos privados | Só o gate conhecido do bncc-dados |
| Blobs grandes | Maiores são `julgados.jsonl` (6,3 MB) e `juiz.jsonl` (6,1 MB) — aceitável, sem LFS |

## O que abrir e o que não abrir

O desenho tem duas metades e elas não se contradizem.

**Publicar o conjunto público inteiro — prompt, resposta crua, julgamento — é o objetivo, não um risco tolerado.** É o que torna o benchmark auditável: qualquer pessoa confere por que um modelo tirou a nota que tirou. Linkar os JSONs na plataforma é exatamente o uso pretendido. O custo é conhecido e aceito: uma vez no ar, o conteúdo pode ser raspado e entrar em treino.

**O held-out existe para que esse custo não comprometa a medição.** Como nunca foi publicado, não entra em treino nenhum e serve de contraprova: melhora nos dois conjuntos indica aprendizado; melhora só no público indica memorização. Por isso ele **nunca** é aberto, nem sob pedido — e por isso a proteção precisa cobrir a derivação, não só o arquivo (A-1).

Consequência operacional para a plataforma: servir apenas artefatos de `resultados/`, jamais algo derivado do held-out. O exportador já é explícito nisso (`harness/exportar-site.ts:10-11`). Do held-out publicam-se agregados, nunca itens ou respostas item a item (ver ressalva em A-1).

Fora isso, nada a esconder: chaves vivem em `.env` (ignorado desde sempre) e o `cache/` não é versionado.

## Checklist go/no-go

### Mínimo para abrir (bloqueadores)

- [x] **A-1.1 ·** Seed do held-out sai do código para `SEED_HELDOUT` no `.env`; `.env.example` atualizado.
- [x] **A-1.2 ·** `test/gerador.test.ts` deixa de codificar a fórmula (seeds arbitrárias).
- [x] **A-1.3 ·** Higienizar documentos e comentários que descrevam a derivação (inclusive este plano).
- [x] **A-1.4 ·** `git filter-repo` sobre todo o histórico; verificação `git log -S` vazia no remoto e no clone local.
- [x] **A-1.5 ·** Force-push + limpeza do clone local (reflog expirado, `gc --prune`). Sem forks e sem branch protection — nada mais a coordenar.
- [x] **A-1.6 ·** Held-out regerado com seed criptográfica, porque o GitHub segue servindo os commits órfãos por SHA. Mapa completo fora do versionado.
- [ ] **A-3 ·** Release `dados-v1.0.0` do bncc-dados publicada (gate de redistribuição do vendorizado).
- [x] `CONTRIBUTING.md` com a regra de instrumento de medição.
- [x] `CODE_OF_CONDUCT.md` (Contributor Covenant pt-BR, mesmo texto do bncc-dados).
- [x] `SECURITY.md` com canal privado — vazamento do held-out tratado como vulnerabilidade.
- [x] Templates de issue (`item-com-problema`, `modelo-proxima-rodada`, `config.yml`).
- [x] CI consolidado, validando PRs externos.
- [x] **A-2 ·** Caminhos absolutos removidos dos manifestos.

### Desejável antes de abrir

- [ ] **A-4 ·** Decidir sobre `docs/revisoes/` e ajustar o tom de `docs/anti-vexame/`.
- [ ] **A-4b ·** README declara que a Profy mantém o bncc.dev (conflito de interesse explícito).
- [ ] **A-5 ·** `LICENSE` canônico apontando para os dois.
- [ ] Nota de redistribuição em `resultados/`: origem (modelo, data, ToS do provedor à época) e aviso de que o reuso está sujeito aos termos de cada provedor. Prática padrão (HELM, LMSYS); risco baixo, restrições recaem sobre o reusuário.
- [ ] Trocar "Estado: em construção, privado" no README pelo texto de lançamento.
- [ ] Documentar na `METODOLOGIA.md` que do held-out se publicam apenas agregados.

## Sequência de flip coordenada

1. **A-1 completo** (seed → `.env`, teste, docs, `filter-repo`, reclone) — é o caminho crítico; tudo mais é rápido.
2. Merge da branch de auditoria (comunidade + CI + higienização).
3. Itens desejáveis (A-4, A-5, nota de redistribuição, README).
4. **Gate:** release `dados-v1.0.0` do bncc-dados publicada.
5. Flip do bncc-dados → flip do bncc-benchmark (junto ou logo depois).
6. Anúncio conjunto: dataset + benchmark + leaderboard.

A ordem importa duplamente: o passo 1 antes de qualquer flip, porque publicar o histórico é irreversível; e o passo 4 antes do 5, porque o benchmark redistribui dado vendorizado de um repositório ainda privado.

## Estratégia de comunidade

- **Abertura casada com o bncc-dados**: dataset aberto + benchmark aberto + held-out privado como garantia de integridade. O trio é raro e é o diferencial de comunicação — e é por isso que A-1 vem antes: a narrativa desmorona se o held-out for reproduzível em um comando.
- **Públicos naturais**: labs e provedores de LLM (querem aparecer bem no leaderboard), edtechs avaliando modelos, pesquisadores de avaliação de LLMs em português.
- **Good first issues**: relatar itens ambíguos, propor novos modelos para a próxima rodada, melhorias nos exportadores do site.
- **Narrativa de lançamento**: primeiro benchmark de alucinação sobre a BNCC; metodologia e respostas cruas 100% públicas; held-out privado contra contaminação; leaderboard vivo em bncc.dev.
- **Gestão diária**: ver `docs/guia-comunidade.md`.

## O que não foi possível verificar

- **Quem teve acesso ao repositório privado até aqui** (colaboradores, forks internos, integrações com acesso de leitura, backups). A conclusão "nada vazou" vale para o repositório; a superfície de acesso é decisão de quem administra a organização. Se houver dúvida sobre esse conjunto, a alternativa robusta de A-1 (held-out curado) passa a ser a escolha certa.
- **Se o held-out já foi compartilhado fora do repositório** (mensagem, backup, drive, outra máquina). A auditoria cobre o repositório; não alcança o que saiu dele.
- **ToS dos provedores de LLM** quanto à redistribuição de outputs: avaliado por prática de mercado (HELM, LMSYS publicam respostas cruas), não por leitura dos contratos vigentes dos 17 modelos. Se houver assessoria jurídica, vale uma passada.
- **Conteúdo integral das 15.300 respostas**: inspecionadas por amostragem e por varredura de padrões (credenciais, email, PII). Respostas de modelo podem conter texto inesperado que varredura por padrão não pega.
- **Configuração do GitHub** (branch protection, secrets do Actions, colaboradores, forks): fora do alcance do repositório local.
