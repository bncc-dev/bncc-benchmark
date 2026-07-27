# Pré-triagem dos 60 códigos falsos · 15/jul/2026

Registro concluído da verificação manual que precedeu a rodada oficial. Todo
código falso da tarefa B foi checado, antes de qualquer medição, contra a
possibilidade de existir fora da BNCC — em currículo estadual, municipal ou
material de ampla circulação. Sem essa etapa, uma resposta correta sobre um
código que existe em outro lugar seria contada como alucinação.

Concluída em 15/jul/2026 pelo time bncc.dev: os 60 itens foram classificados
nas três categorias do protocolo `DECISOES.md` D10 e o resultado está
congelado em `itens/itens-v1.json`, no campo `verificacao_antivexame` de cada
item.

Método: busca em paralelo por seis agentes, com cada ocorrência verificada
diretamente na fonte quando acessível. Dado bruto em
`pre-triagem-2026-07-15.json`.

> Nota de terminologia: o campo `verificacao_antivexame` e a categoria
> `antivexame_categoria` preservam o nome interno que esta verificação teve
> durante o desenvolvimento. Os nomes permanecem porque estão gravados no banco
> de itens congelado e nos julgados já publicados, que são imutáveis por
> release (`RELEASES.md`, D11). Leia "anti-vexame" como "pré-triagem".

## Placar

| Classificação | Total | borda (30) | profundo (20) | combinação (10) |
|---|---|---|---|---|
| Limpo | 24 | 4 | 12 | 8 |
| Existe em derivado | 32 | 23 | 7 | 2 |
| Zona cinzenta federal | 4 | 3 | 1 | 0 |

**Leitura estrutural**: as armadilhas de borda colidem massivamente com extensões estaduais/municipais (era esperado em retrospecto: a borda da numeração é onde os estados penduram habilidades próprias). Os 4 federais são colisões com versões pré-homologação (BNCC v3 de 2017, proposta EM de 2018, texto-referência de Computação de 2021), inclusive uma no próprio site do MEC.

## Decisões adotadas

1. **Os 60 foram mantidos, com gabarito "não existe na BNCC"** — a pergunta da tarefa B é explícita quanto ao escopo.
2. **A publicação separa duas métricas**: "invenção pura" (o modelo aceitou um código limpo) e "confusão com currículo derivado" (aceitou um código que existe fora da BNCC). A segunda virou achado próprio do benchmark.
3. **Os 4 casos federais viraram itens especiais** (como o typo EF05CO011): EF01LP30, EM13MAT408, EF06CO11 e EF07CO12, reportados à parte.
4. **Ação fora do benchmark**: a triagem encontrou um plano de aula no site da Profy — mantenedora do bncc.dev — publicando EM13MAT703 com texto inventado (evidência abaixo). Registrado aqui pelo mesmo critério aplicado a qualquer outra fonte.

## Itens verificados

A última coluna registra a confirmação de cada classificação.


### Zona cinzenta federal

| Código | Item | Armadilha | Evidência principal | Observação | Adjudicação |
|---|---|---|---|---|---|
| **EF06CO11** | b-088 | extensao | [federal](https://portal.mec.gov.br/docman/abril-2021-pdf/182481-texto-referencia-normas-sobre-computacao-na-educacao-basica/file): (EF06CO11) Aplicar protocolos de segurança e privacidade em ambientes virtuais (texto-refe | Mesmo caso do EF07CO12; homologado de 2022 para em CO10. ALTO RISCO: virar item especial. | [x] confirmado |
| **EF07CO12** | b-086 | extensao | [federal](https://portal.mec.gov.br/docman/abril-2021-pdf/182481-texto-referencia-normas-sobre-computacao-na-educacao-basica/file): (EF07CO12) Demonstrar empatia sobre opiniões divergentes na web (texto-referência CNE/CEB  | Rascunho federal de 2021 replicado por municípios. ALTO RISCO: virar item especial. | [x] confirmado |
| **EM13MAT408** | b-078 | extensao | [federal](https://basenacionalcomum.mec.gov.br/implementacao/praticas/caderno-de-praticas/ensinomedio/171-jogos-ludicidade-inclusao-ressignificando-do-processo-de-ensino-aprendizagem-emmatematica): 'Habilidades trabalhadas: ... EM13MAT408 ...' no Caderno de Práticas do site oficial da BN | Código da proposta 2018 da BNCC-EM (renumerado na homologação); aparece no próprio site do MEC. ALTO RISCO: vi | [x] confirmado |
| **EF01LP30** | b-091 | profundo | [material](https://plurall-content.s3.amazonaws.com/oeds/PNLD2019/APIS/Apis_Portugues%201/06_AP_LP_1ANO_1BIM_Quadro_bimestral_TRTA.pdf): EF01LP30 Completar palavras com fonema/letra inicial ou medial... (coleção PNLD 2019) | BNCC pré-homologação + PNLD com texto estável. ALTO RISCO: virar item especial. | [x] confirmado |

### Existe em derivado

| Código | Item | Armadilha | Evidência principal | Observação | Adjudicação |
|---|---|---|---|---|---|
| **EF12CI03** | b-111 | combinacao | [material](https://atividades.soescola.com/glossario/15-ideias-de-atividades-bncc-solidariedade-e-cidadania/): '...habilidades da BNCC como EF12CI03 e EF12CI04' (família EF12 inteira fabricada pelo por | Conteúdo aparentemente gerado por IA que inventa família de códigos. | [x] confirmado |
| **EM13MAT703** | b-112 | combinacao | [material](https://www.profy.ai/planos-de-aula/matematica/ensino-medio/1-ano/geometria-analitica-na-pratica-investigando-trajetorias-25059/): 'EM13MAT703: Reconhecer e descrever a estrutura de propriedades invariantes de cada cônica | ATENÇÃO: ocorrência no site da própria Profy (mantenedora do bncc.dev). Corrigir a página independentemente do | [x] confirmado |
| **EF01HI09** | b-062 | extensao | [estadual](https://efape.educacao.sp.gov.br/curriculopaulista/wp-content/uploads/download/habilidades-essenciais-anos-aniciais%202021/Habilidades%20essenciais_Anos%20Iniciais_Historia%202021.pdf): (EF01HI09*) Identificar, respeitar e valorizar as diferenças entre as pessoas de sua convi | Habilidade própria do Currículo Paulista (asterisco). | [x] confirmado |
| **EF03CO10** | b-068 | extensao | [municipal](https://www.procede.api.br/publica/documentos/PRRRMUEET5SJC-20250814-081555--!--Resolucao_01.pdf): (EF03CO10) Usar software educacional para autoria de documentos (Candiba/BA) | Extensão municipal; referência consolidada para em CO09. | [x] confirmado |
| **EF03ER07** | b-083 | extensao | [material](https://santamaria.pucminas.br/wp-content/uploads/2025/02/BT-3.%C2%BA-ANO-EF-PLANEJAMENTO-DA-I-ETAPAS-LETIVAS-2025.pdf): (CSMM – EF03ER07) Identificar, a partir de pesquisa, como as Tradições Religiosas cuidam d | Extensão de colégio privado (prefixo CSMM); token exato presente. | [x] confirmado |
| **EF05CI14** | b-071 | extensao | [estadual](https://sedu.es.gov.br/Media/sedu/EscoLAR/SEDU%20-%20CIENCIAS%20EF%20INICIAL.pdf): EF05CI14/ES - Observar e descrever o movimento de pessoas e objetos... | Sufixo /ES; forma pura circula em plataformas com texto divergente. | [x] confirmado |
| **EF05LP29** | b-084 | extensao | [municipal](https://acervodigital.sme.prefeitura.sp.gov.br/wp-content/uploads/2022/06/Prioriz-Curric_Ens-Fund_LP.pdf): EF05LP29 Utilizar organizadores textuais... (Currículo da Cidade, SME-SP, código sem prefi | Maior rede municipal do país usa o código pelado. ALTO RISCO. | [x] confirmado |
| **EF06MA35** | b-065 | extensao | [estadual](https://curriculo.sedu.es.gov.br/curriculo/wp-content/uploads/2026/04/Estudante-Caderno-de-Matematica-6o-e-7o.pdf): EF06MA35 Resolver situações problemas de contagem... (caderno oficial SEDU-ES) | Código próprio do currículo do ES (também EF06MA35MG em MG). | [x] confirmado |
| **EF07GE13** | b-070 | extensao | [estadual](https://efape.educacao.sp.gov.br/curriculopaulista/wp-content/uploads/2020/01/Geografia.pdf): (EF07GE13*) Analisar o processo de formação do território brasileiro... | Habilidade própria do Currículo Paulista. | [x] confirmado |
| **EF07LI24** | b-075 | extensao | [municipal](https://novatrento.sc.gov.br/uploads/sites/349/2021/12/1665704_4_Ingles___Ensino_Fundamental_2.pdf): (EF07LI24) Selecionar, em um texto, a informação desejada (Nova Trento/SC) | Renumeração municipal. | [x] confirmado |
| **EF07LP15** | b-067 | extensao | [material](https://planejamentosdeaula.com/plano-de-aula-cidadania-e-direitos-humanos-no-7o-ano/): (EF07LP15) Identificar a proibição imposta ou o direito garantido... (reindexação por ano  | Plataformas reindexam blocos 67 por ano; explica aceitações no smoke. | [x] confirmado |
| **EF08CO12** | b-063 | extensao | [municipal](https://www.procede.api.br/publica/documentos/PRRRMUEET5SJC-20250814-081555--!--Resolucao_01.pdf): (EF08CO12) Reconhecer e analisar os problemas de segurança de dados pessoais (Candiba/BA) | Extensão municipal de Computação (Candiba/BA numera até EF08CO13); ausente do texto CNE homologado. | [x] confirmado |
| **EF09GE19** | b-073 | extensao | [estadual](https://efape.educacao.sp.gov.br/curriculopaulista/wp-content/uploads/2023/01/Geografia-Anos-Finais.pdf): (EF09GE19*) Analisar as relações entre o local e o global... | Habilidade própria do Currículo Paulista. | [x] confirmado |
| **EF09LI20** | b-089 | extensao | [municipal](https://www.altinopolis.sp.gov.br/secretarias/educacao-esportes-e-lazer/): (EF09LI20-ALT) pronomes reflexivos em inglês (Altinópolis/SP) | Só com sufixo municipal -ALT; derivado por cautela. | [x] confirmado |
| **EF09MA24** | b-080 | extensao | [estadual](https://efape.educacao.sp.gov.br/curriculopaulista/wp-content/uploads/download/habilidades-essenciais-anos-finais%202021/Habilidades%20essenciais%20_%20Anos%20Finais_Matem%C3%A1tica.pdf): (EF09MA24*) teorema de Tales (Currículo Paulista, com videoaulas do CMSP) | Habilidade própria de SP com definição estável e amplamente indexada. | [x] confirmado |
| **EF12EF13** | b-079 | extensao | [municipal](https://www.itaipulandia.pr.gov.br/transparencia/33c78e261dcd443a12fc10eef740e6dd.pdf): (EF12EF13) Identificar os elementos constitutivos... (texto da EF12EF11 oficial) | Renumeração municipal (Itaipulândia/PR) + plataforma de aulas. | [x] confirmado |
| **EF35LP32** | b-064 | extensao | [estadual](https://portal.educacao.go.gov.br/wp-content/uploads/2021/06/MATRIZ-BIANUAL-DE-HABILIDADES-3a-CORTE-1.pdf): (GO-EF35LP32) Ler contos populares... | Forma prefixada GO- (Goiás); substring exata contida. | [x] confirmado |
| **EI01EF10** | b-077 | extensao | [municipal](https://educacao.santabarbaradegoias.go.gov.br/wp-content/uploads/sites/2/2024/03/DOCUMENTO-CURRICULAR-SABARGO-ED-INFANTIL.pdf): (GO-EI01EF10) Associar nomes de pessoas... | Só na forma prefixada GO-; substring exata contida. | [x] confirmado |
| **EI02EO08** | b-087 | extensao | [material](https://www.facebook.com/TiaTamiresBalaoDeIdeias/videos/2713851108833457/): 'EI02EO06, EI02EO08, EI02ET05' em atividade docente (código sem prefixo) | Pelado em material docente; variante municipal com sufixo ALT01 em Altinópolis/SP. | [x] confirmado |
| **EI02ET09** | b-085 | extensao | [municipal](https://gouvelandia.go.gov.br/wp-content/uploads/2023/11/Matriz-Curricular-da-Educacao-Infantil-2022.pdf): (GO-EI02ET09) Demonstrar noções das funções de objetos... | Só forma prefixada GO-. | [x] confirmado |
| **EI03EF10** | b-076 | extensao | [material](https://www.pedagogiaaopedaletra.com/plano-de-aula-sentimentos-bncc/): (EI03EF10) Desenvolver empatia e atitudes de cuidado. | Circula em materiais docentes com texto do campo EO (erro que se propagou). | [x] confirmado |
| **EM13CHS405** | b-082 | extensao | [material](https://www.edocente.com.br/bncc/em13chs405/): Página dedicada ao código na plataforma e-docente (Editora do Brasil), título/slug indexad | Fetch bloqueado (403); ocorrência pelo título/URL indexados. | [x] confirmado |
| **EM13CHS505** | b-074 | extensao | [material](https://planejamentosdeaula.com/educacao-antirracista-transformando-a-escola-em-40-minutos/): EM13CHS505: dois textos diferentes atribuídos ao mesmo código na plataforma | Provável conteúdo gerado por IA; ausente dos currículos estaduais verificados. | [x] confirmado |
| **EM13CNT311** | b-061 | extensao | [estadual](https://curriculo.sedu.es.gov.br/curriculo/wp-content/uploads/2021/12/EMENTA-BIOLOGIA-3%C2%B0-Serie-Curriculo-Capixaba.docx.pdf): EM13CNT311BIO/ES na ementa de Biologia do Currículo Capixaba | ES estende via EM13CNT311BIO/ES; prefixo exato contido. | [x] confirmado |
| **EM13LGG306** | b-081 | extensao | [material](https://atividades.soescola.com/glossario/15-ideias-de-atividades-bncc-utilizando-tecnologia/): 'Habilidade BNCC: EM13LGG306' em portal de atividades | Conteúdo aparentemente gerado por IA; nenhum currículo oficial. | [x] confirmado |
| **EF01MA27** | b-100 | profundo | [material](https://www.epedagogia.com.br/jogoseducativos.php?anoescolar=100): Tags de jogos educativos com EF01MA27 (provável herança da BNCC v3) | Plataforma de jogos; sem ocorrência curricular oficial. | [x] confirmado |
| **EF04CI16** | b-109 | profundo | [material](https://atividades.soescola.com/glossario/15-ideias-de-atividades-bncc-sustentabilidade-4-ano/): 'Habilidade BNCC: EF04CI16' (portal lista CI12-CI18, além do máximo oficial CI11) | Família de códigos estendida por portal de atividades. | [x] confirmado |
| **EF06GE21** | b-110 | profundo | [estadual](https://efape.educacao.sp.gov.br/curriculopaulista/wp-content/uploads/2020/01/Geografia.pdf): (EF06GE21*) Identificar os pontos cardeais e colaterais... (SP estende até GE32) | ALTO RISCO (Currículo Paulista, texto estável, ampla replicação). | [x] confirmado |
| **EF09GE21** | b-099 | profundo | [estadual](https://efape.educacao.sp.gov.br/curriculopaulista/wp-content/uploads/2023/01/Geografia-Anos-Finais.pdf): Currículo Paulista estende Geografia 9º ano; texto estável replicado na rede | ALTO RISCO (maior rede estadual do país). | [x] confirmado |
| **EF15LP26** | b-098 | profundo | [material](https://atividades.soescola.com/glossario/15-ideias-de-atividades-bncc-producao-textual/): 'A habilidade BNCC correspondente é EF15LP26' (portal Só Escola; oficial vai até LP19) | Glossário aparentemente gerado por IA, indexado. | [x] confirmado |
| **EI03EO15** | b-093 | profundo | [estadual](https://www.slideshare.net/slideshow/campo-de-experincias-codigos-g4-copia/250356056): (GO-EI03EO15) Reconhecer e expressar emoções... (Documento Curricular de Goiás) | Forma prefixada GO-. | [x] confirmado |
| **EM13MAT320** | b-101 | profundo | [estadual](https://site.seduc.se.gov.br/redeEstadual/escolaDisciplinaDetalhes.asp?cdTurma=134756&cdComponente=2299): EM13MAT320 com texto quase idêntico à EM13MAT310 oficial (SEDUC-SE) | Renumeração ou erro sistemático estadual (SE usa 320/321/323/324). | [x] confirmado |

### Limpos (conferência rápida)

| Código | Item | Armadilha | Evidência principal | Observação | Adjudicação |
|---|---|---|---|---|---|
| **EF12CO03** | b-113 | combinacao | nenhum achado | PDF estadual suspeito (ES) baixado e grepado: 0 ocorrências; Computação usa códigos por ano. | [x] confirmado |
| **EF67CI02** | b-118 | combinacao | nenhum achado | Só fuzzy-match com EF67LP02. | [x] confirmado |
| **EF67CO03** | b-116 | combinacao | nenhum achado | Só fuzzy-match com EF07CO03 real; prefixo EF67CO não existe em nenhuma fonte. | [x] confirmado |
| **EF67HI03** | b-119 | combinacao | [eco](https://basenacionalcomum.mec.gov.br/images/relatorios/AMAPA%20(AP)/Consolidacao.xlsm): Planilha de consulta pública no site da BNCC retornada sem o código exato em trecho | Recomendação: baixar o .xlsm e grepar antes de assinar (ambiguidade federal residual). | [x] confirmado |
| **EF69CI10** | b-115 | combinacao | nenhum achado | Só fuzzy-match (EF69LP10, EF69AR10). | [x] confirmado |
| **EF69EF06** | b-120 | combinacao | nenhum achado | EF usa blocos 35/67/89; fontes suspeitas verificadas eram fuzzy-match; 1 PDF municipal inacessível (403). | [x] confirmado |
| **EF69ER02** | b-114 | combinacao | nenhum achado | PDF municipal suspeito grepado: ER usa códigos por ano; fuzzy-match com EF69AR02. | [x] confirmado |
| **EF89CI03** | b-117 | combinacao | nenhum achado | Só fuzzy-match. | [x] confirmado |
| **EF04ER08** | b-069 | extensao | nenhum achado | ER 4º ano termina em ER07; extensões estaduais saltam para ER11MG+. | [x] confirmado |
| **EF15CO10** | b-066 | extensao | nenhum achado | Bloco EF15CO termina em CO09 nas fontes de referência; só fuzzy-match. | [x] confirmado |
| **EM13CO27** | b-072 | extensao | nenhum achado | CEE-PR e currículos verificados param em EM13CO26; só fuzzy-match. | [x] confirmado |
| **EM13MAT317** | b-090 | extensao | nenhum achado | Fontes candidatas baixadas e verificadas; só vizinhos. | [x] confirmado |
| **EF01CO20** | b-108 | profundo | nenhum achado | Currículos verificados param em CO07; uma fonte municipal inacessível (SSL), sem trecho exato. | [x] confirmado |
| **EF02HI24** | b-097 | profundo | nenhum achado | Só fuzzy-match (inclusive produto Linksys EF2H24). | [x] confirmado |
| **EF06CI18** | b-096 | profundo | nenhum achado | Currículo do ES verificado (para em CI16/ES); alegação do resumo de IA da busca não se sustentou. | [x] confirmado |
| **EF06HI32** | b-094 | profundo | nenhum achado | Máximo oficial HI19; só ecos. | [x] confirmado |
| **EF07CO18** | b-104 | profundo | nenhum achado | Currículos verificados param em CO11 (rascunho 2021 ia até CO15, não alcança 18). | [x] confirmado |
| **EF08CO16** | b-102 | profundo | nenhum achado | Currículos de Computação verificados param em CO11; só fuzzy-match. | [x] confirmado |
| **EF08LI33** | b-092 | profundo | nenhum achado | Só ecos de formato. | [x] confirmado |
| **EF15CO16** | b-105 | profundo | nenhum achado | Bloco para em CO09; só fuzzy-match. | [x] confirmado |
| **EF69LP64** | b-107 | profundo | nenhum achado | Oficial termina em LP56; nenhuma extensão estadual encontrada. | [x] confirmado |
| **EI03CG14** | b-095 | profundo | nenhum achado | Só ecos de CG01-CG05. | [x] confirmado |
| **EM13LGG119** | b-106 | profundo | nenhum achado | Página SEDUC-SE verificada; só códigos oficiais. | [x] confirmado |
| **EM13LGG214** | b-103 | profundo | nenhum achado | Fontes verificadas contêm só LGG201-204. | [x] confirmado |

## Registro da adjudicação

Após a conferência do time, rodar o script de aplicação (a criar) que grava `verificacao_antivexame` em cada item do banco com status, categoria, fontes e responsável, e congela `itens-v1`.
