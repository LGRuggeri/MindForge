# Conteúdo aprofundado e preparação para Professor Intérprete de Libras

Data da análise: 03/10/2026. Este documento preserva o diagnóstico e o desenho originais. Parte da proposta já foi implementada: [profundidade e primeira versão](22-estudo-aprofundado-libras.md) e [11 aulas dos conhecimentos específicos, treino e avaliação separados](23-percurso-libras-edital.md). As propostas e o diagnóstico abaixo devem ser lidos como registro anterior às entregas; os núcleos comuns e o simulado integral continuam pendentes.

## 1. Resultado esperado

O MindForge deve transformar o programa da prova em aulas que ensinem cada assunto, atividades que exijam aplicação e avaliações que indiquem o que revisar. A abrangência deve ser conferida por item do programa. O tamanho do texto, isoladamente, não demonstra qualidade.

O primeiro caso de uso é Professor Intérprete de Libras, processo seletivo da Educação de Balneário Piçarras/SC, edital 02/2026, IBAM. O arquivo informado foi encontrado em `an3.psedu26.pdf`. Foram extraídas e inspecionadas visualmente as páginas 1, 5 e 6: núcleo comum e programa específico de Libras. O anexo lista assuntos e referências; não contém as aulas necessárias para aprendê-los.

O anexo local foi confrontado com o [Anexo III publicado pelo IBAM](https://www.ibam-concursos.org.br/documento/an3.psedu26.pdf). O [Anexo II](https://www.ibam-concursos.org.br/documento/an2.psedu26.pdf) estabelece:

| Núcleo | Questões | Pontos por questão | Mínimo por núcleo |
| --- | ---: | ---: | ---: |
| Conhecimento técnico profissional | 10 | 10 | 50 |
| Português | 10 | 10 | 50 |
| Legislação e raciocínio lógico | 10 | 10 | 50 |

O [edital de abertura, item 5.2.1](https://www.ibam-concursos.org.br/documento/edit.psedu26.pdf) prevê prova em 01/11/2026, às 9h para essa função, com 2h30 de duração. Datas e regras devem ser conferidas novamente quando houver retificações. O número de alternativas não foi identificado nos trechos examinados; quatro alternativas na amostra são uma escolha didática, não uma atribuição ao formato oficial.

Consequência para o estudo: o desempenho precisa ser acompanhado nos três núcleos. Uma nota total elevada pode coexistir com um núcleo abaixo do mínimo. Os 19 itens específicos de Libras não representam todo o programa da prova.

## 2. Diagnóstico do código atual

| Parte | Evidência no checkout | Consequência |
| --- | --- | --- |
| Síntese | `synthesizer.service.ts`, `montarSystemPrompt`: pede material autocontido, exemplos e um desafio opcional | Não há exigência explícita de desenvolver subtemas, explicar diferenças, demonstrar aplicação ou verificar cobertura |
| Pesquisa | `research.service.ts`: persiste títulos, URLs e resumos de 1–2 frases; o Synthesizer recebe esses registros | Descobrir uma URL não equivale a ler e verificar o documento; o gerador não recebe automaticamente os textos integrais das referências |
| Revisão | `reviewer.service.ts`: avalia clareza, aparência de correção e estrutura; recebe um contexto com título, nível, tópico e quantidade de fontes | Faltam o programa detalhado, os requisitos da aula e evidências para conferir as afirmações |
| Aprovação | `synthesizer.service.ts`: nota 3/5 permite status `revisado`; até duas reescritas | Um texto superficial pode satisfazer critérios genéricos. Elevar a nota mínima sem mudar os critérios não resolve isso |
| Planejamento livre | `planner.service.ts`: prompt e contrato limitam a trilha livre a 3–8 módulos | Um edital extenso pode ser comprimido em títulos genéricos. O catálogo guiado já permite um caminho determinístico separado |
| Exercícios | `exercicios-avaliacoes.service.ts`: recupera até cinco chunks e pede um exercício genérico | Não garante variedade cognitiva, cobertura dos subtemas, alternativas plausíveis ou fundamentação do gabarito |
| Correção objetiva | `corrigirResposta`: compara resposta e gabarito; devolve “Resposta correta!” ou informa a resposta correta | O aluno recebe a classificação, mas não aprende por que errou |
| Simulados | `avaliacoes.service.ts`: sorteia candidatos com `Math.random()` e quantidade padrão de dez | Não reproduz automaticamente os três núcleos deste edital nem assegura cobertura dos assuntos |
| Imagens | Synthesizer injeta até três imagens via `ImageService`; há cache e degradação em falhas | A integração existe; faltam critérios mais específicos de utilidade e fidelidade didática |
| Leitura | `MarkdownViewer` exibe imagens, tabelas e respostas recolhíveis com sanitização | A amostra usa recursos já compatíveis. Não há renderizador de Mermaid nesse componente |

Não foi possível medir a extensão ou examinar os conteúdos persistidos: a conexão de leitura ao Postgres local retornou `ECONNREFUSED`. Portanto, esta análise demonstra lacunas na implementação, não atribui a superficialidade a um modelo específico nem comprova o tamanho das respostas reais.

Há mudanças anteriores em Planner, catálogo guiado, frontend e documentação. Este trabalho acrescenta documentos próprios e preserva essas alterações.

## 3. Abordagens possíveis

| Abordagem | Ganho | Limite | Complexidade |
| --- | --- | --- | --- |
| Reforçar apenas os prompts | Melhoria rápida na organização e profundidade | Não garante cobertura do edital ou verificação das fontes | Baixa |
| Aulas com requisitos verificáveis e piloto orientado pelo edital | Une conteúdo, fontes, questões comentadas e cobertura; permite validar uma aula concreta | Exige trabalho também nos contratos, revisão e correção | Média; recomendada |
| Importação de editais, calendário adaptativo e banco de provas completo | Automatiza uma preparação mais extensa | Amplia bastante o escopo antes de validar a qualidade da aula | Alta; evolução posterior |

Recomendação: validar primeiro aulas e questões completas com o programa de Libras, mantendo o desenho de cobertura de toda a prova. A implementação deve separar a melhoria geral do gerador das informações específicas desse edital.

## 4. Contrato pedagógico de uma aula completa

Cada aula deve trabalhar um recorte estudável, com tópicos declarados antes da geração. Quando o assunto for extenso, deve ser dividido em aulas, com indicação clara das partes cobertas e pendentes.

1. **Objetivos observáveis:** o que o aluno deve conseguir explicar, comparar ou resolver.
2. **Pré-requisitos e contexto:** vocabulário indispensável e relação com o programa.
3. **Desenvolvimento por subtema:** conceito, explicação, exemplo, aplicação e limites. Um título seguido apenas de uma definição não conta como desenvolvimento suficiente.
4. **Comparações:** conceitos próximos, diferenças relevantes e consequências práticas.
5. **Fundamentação:** fontes consultadas e, em normas, dispositivo e versão usados. Não inventar artigos, datas ou trechos literais.
6. **Caso resolvido:** situação concreta, análise e justificativa do encaminhamento.
7. **Apoio visual:** tabela, esquema ou ilustração que esclareça uma relação do conteúdo.
8. **Atividades:** recuperação da memória, comparação e aplicação; soluções separadas da pergunta.
9. **Questões comentadas:** resposta correta, motivo e análise dos distratores, após a tentativa.
10. **Revisão:** síntese, perguntas de autoexplicação e pontos a retomar.

O modo de estudo proposto distingue **resumo**, **aula completa** e **preparação para prova**. Iniciante continua a receber explicações acessíveis, com conteúdo suficiente; o nível ajusta vocabulário e pré-requisitos, não autoriza omitir assuntos necessários.

A [amostra de aula](amostra-aula-libras-educacao-bilingue.md) apresenta uma comparação, atividades e comentários de alternativas. É uma demonstração editorial de um recorte; não representa uma apostila completa ou uma saída validada do pipeline.

## 5. Cobertura dos 19 itens específicos

Os identificadores abaixo são uma organização autoral dos itens do programa colado pelo usuário e conferido no anexo local. As propostas de aplicação não são previsões de incidência da banca.

| Item | Assunto do programa | Bloco proposto | Evidência de aprendizagem |
| --- | --- | --- | --- |
| E01 | Política e Rede Nacional previstas no Decreto 12.686/2025 e alterações | B02 – Política nacional | Comparar responsabilidades, apoios e organização previstos no texto atualizado |
| E02 | Política de Educação Especial de SC de 2018 | B03 – Santa Catarina | Relacionar público, serviços e responsabilidades conforme o documento indicado |
| E03 | Resolução 100/2016/CEE | B03 | Resolver situações usando dispositivos identificados da resolução |
| E04 | Currículo Base catarinense, subitem 1.7 | B03 | Explicar consequências para planejamento, acesso e participação |
| E05 | LDB, capítulo V | B01 – Fundamentos legais | Distinguir direitos, organização e recursos do capítulo |
| E06 | Lei Brasileira de Inclusão | B01 | Aplicar conceitos e garantias educacionais a situações concretas |
| E07 | Histórico legislativo de 1988 à atualidade | B01 | Construir linha do tempo e distinguir texto histórico de redação vigente |
| E08 | História do tradutor e intérprete de língua de sinais | B05 – Profissão | Relacionar trajetória profissional e marcos de regulamentação |
| E09 | Libras: conceito, história e concepções | B04 – Libras e comunidade surda | Explicar as concepções estudadas e comparar suas implicações |
| E10 | Código de ética do intérprete | B06 – Ética | Justificar decisões em dilemas com base no código identificado |
| E11 | Regulamento para atuação | B05 | Distinguir atribuições, formação e regras nos atos pertinentes |
| E12 | Intérprete educacional | B07 – Atuação educacional | Analisar situações de comunicação e colaboração na escola |
| E13 | Modelos de tradução e interpretação | B07 | Comparar modelos referenciados e explicar uma escolha em um caso |
| E14 | Cultura e identidade surda | B04 | Analisar diversidade cultural e identitária sem generalizações |
| E15 | Aquisição e aprendizagem de Libras | B08 – Aprendizagem e ensino | Comparar processos, condições de acesso e exemplos |
| E16 | Ensino de Libras para surdos e ouvintes | B08 | Elaborar propostas adequadas aos diferentes públicos |
| E17 | Língua portuguesa para surdos | B09 – Educação bilíngue | Analisar uma atividade de leitura e produção escrita |
| E18 | Tecnologia assistiva para deficientes auditivos | B10 – Acessibilidade | Selecionar recursos para uma barreira e justificar limites de uso |
| E19 | Portaria MEC 588/2026 – PNEBS | B09 | Relacionar a política, a modalidade e suas fontes normativas |

Os dez blocos devem conter aulas menores conforme diagnóstico e tempo disponível. Não se recomenda pedir à IA uma única resposta que explique todos os 19 itens.

### Núcleo comum

Organizar também trilhas de Português e de legislação/raciocínio lógico. A decomposição deve preservar os seguintes grupos da página 1:

- Português: compreensão, inferência, recursos linguísticos e características textuais; tipos e gêneros; sentido de palavras; coesão e coerência; ideias e ponto de vista; funções da linguagem e figuras; classes gramaticais; formação de palavras, prefixos e sufixos; flexão; colocação pronominal; sintaxe; concordância; regência; crase; pontuação; acentuação; porquês e ortografia.
- Legislação: Constituição, títulos I–III; princípios da Administração Pública; acesso à informação; improbidade administrativa; Lei Orgânica municipal; LDB; diretrizes nacionais da Educação Básica; política de educação especial indicada no núcleo comum; BNCC; LC municipal 87/2013; ECA.
- Raciocínio lógico: operações com inteiros e racionais; porcentagem; regras de três; razão e proporção; sistema métrico; gráficos e tabelas; média aritmética; conjuntos; situações-problema.

LDB e educação especial aparecem em mais de um contexto: compartilhar referências e conteúdos pertinentes, preservando o vínculo da questão com o núcleo em que ela está sendo avaliada. Não confundir Português do núcleo comum com ensino de português para surdos do programa específico.

## 6. Fontes, legislação e imagens

### Evidência antes da geração

A pesquisa precisa fornecer trechos realmente lidos, com documento, página ou artigo, URL e data de consulta. Guardar também a identificação da versão normativa. Snippets de busca e resumos de IA continuam úteis para localizar documentos; não devem ser promovidos a evidência de vigência ou conteúdo.

O [Decreto 12.686/2025 no Planalto](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12686.htm) contém alterações pelo Decreto 12.773/2025. Para esse tópico, trabalhar o texto compilado e explicar separadamente os marcos históricos solicitados.

A [LDB compilada](https://www.planalto.gov.br/ccivil_03/leis/l9394.htm) também contém o capítulo V-A, relevante ao contexto de educação bilíngue de surdos. O capítulo V pedido pelo programa deve permanecer explicitamente coberto. A [Lei 12.319/2010 compilada](https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12319.htm) contém alterações pela Lei 14.704/2023 e é referência para a regulamentação profissional.

Para a Portaria 588/2026, o [endereço oficial do DOU](https://www.in.gov.br/web/dou/-/portaria-mec-n-588-de-2-de-julho-de-2026-716744462) não pôde ser aberto pela ferramenta. Foi lida uma [cópia da página do DOU disponibilizada pela UERJ](https://gedh-uerj.pro.br/wp-content/uploads/tainacan-items/14757/103926/2026_BRASIL_PORTARIA_MEC_588_Educacao_Bilingue_DOU.pdf), com identificação do ato. Atenção: o outro PDF ligado na mesma página, sem o sufixo `_DOU`, contém a Portaria 524/2026, sobre outro assunto. Esse arquivo não deve integrar o material de PNEBS. Esta leitura não substitui uma conferência completa de vigência e alterações até a data de corte do certame.

Outras referências localizadas para curadoria:

- [Política de Educação Especial de SC de 2018, cópia no domínio da UDESC](https://www.udesc.br/arquivos/faed/id_cpmenu/4487/Caderno___Pol_tica_de_Educa__o_Especial___NEESP_15841042403847_4487.pdf).
- [Resolução 100/2016 no CEE/SC](https://www.cee.sc.gov.br/index.php/downloads/comissoes/educacao-basica/educacao-especial/resolucoes-13/1606-resolucao-2016-100-cee-sc/file).
- [Currículo Base no portal da SED/SC](https://www2.sed.sc.gov.br/legislacoes-estadual-e-federal/curriculo-base-sc/8018-curriculo-base-ed-infantil-e-ens-fundamental-de-sc/file), com foco na seção indicada pelo anexo.
- [Publicação do MEC sobre o tradutor e intérprete de Libras/Língua Portuguesa](https://portal.mec.gov.br/secretaria-de-educacao-continuada-alfabetizacao-diversidade-e-inclusao/192-secretarias-112877938/seesp-esducacao-especial-2091755988/12677-o-tradutor-e-interprete-de-lingua-brasileira-de-sinais-e-lingua-portuguesa), referência a conferir para história, ética e modelos. Material histórico não comprova a legislação profissional atual.
- [Recursos educacionais do INES](https://debasi.ines.gov.br/), ponto de partida para selecionar vídeos e materiais em Libras.

Os três documentos catarinenses e os materiais acadêmicos ainda precisam de leitura detalhada para elaboração das respectivas aulas. O programa não identifica edição de um código de ética ou uma bibliografia específica de modelos: registrar essa pendência, identificar a fonte adotada e distinguir código associativo, literatura e legislação.

### Recursos visuais

| Recurso | Aplicação | Forma recomendada |
| --- | --- | --- |
| Linha do tempo | Marcos legislativos e profissionais | Dados e rótulos conferidos; cada marco associado à fonte |
| Quadro comparativo | Modalidades, funções, modelos e conceitos próximos | Tabela acessível, acompanhada de explicação |
| Fluxo | Preparação, interpretação e revisão; articulação de apoios | Diagrama construído a partir de conteúdo validado |
| Ilustração de contexto | Organização visual de uma situação escolar | Imagem gerada opcional, com legenda que explicite o que observar |
| Demonstração de sinais | Movimento, expressões e execução linguística | Vídeos de fontes identificadas, com contexto e referência temporal |

Para diagramas com datas, artigos ou definições, preferir composição determinística com dados conferidos. Imagens geradas podem auxiliar a contextualização; não usar uma mão ou um sinal inventado pela IA como demonstração linguística. A informação central deve existir também em texto, com descrição acessível. Falha de geração mantém a aula utilizável.

O frontend já suporta imagens e tabelas. Um renderizador de diagramas seria uma melhoria nova, com validação, sanitização e alternativa textual; escrever um bloco `mermaid` hoje não o transforma automaticamente em diagrama na tela.

## 7. Atividades, avaliações e feedback

Cada questão deve identificar núcleo, item do programa, objetivo, dificuldade e material de fundamentação. A correção objetiva deve continuar determinística: comparar a alternativa marcada com a alternativa correta. A explicação deve ficar em campo separado do gabarito para não quebrar a comparação e não depender de nova geração a cada tentativa.

O comentário esperado contém: conceito avaliado, motivo da resposta correta, erro de cada distrator e indicação do ponto a revisar. Nos simulados, revelar os comentários somente após finalização, preservando o comportamento atual que oculta gabaritos e feedback durante a prova.

Sequência proposta:

1. Diagnóstico curto por núcleo, identificado como amostra limitada.
2. Atividades de aula: explicar sem consultar, preencher comparação, resolver caso.
3. Avaliação de assunto: questões diferentes das atividades resolvidas.
4. Revisão: novas questões dos assuntos errados e itens ainda não avaliados.
5. Simulado completo: 30 questões, dez por núcleo, sessão de até 150 minutos e relatório de desempenho por núcleo.

Um simulado de dez questões específicas não cobre todos os 19 itens simultaneamente. A cobertura deve ser distribuída entre sessões e visível no relatório. Pesos internos dos tópicos e quantidade de alternativas dependem de evidência da banca; não inventar frequências de cobrança. Não produzir um simulado completo se faltarem questões em qualquer núcleo: mostrar a insuficiência e permitir uma avaliação parcial explicitamente identificada.

O relatório deve separar: assuntos apenas lidos, avaliados, errados, ainda sem evidência e revisados. Um acerto isolado ou uma média alta não comprova domínio de todos os tópicos.

## 8. Plano de implementação e aceite

### Entrega 1 — Validar a qualidade de duas aulas

Recortes sugeridos: fundamentos de educação bilíngue e regulamentação/atuação do intérprete. As duas aulas devem ter objetivos, fontes identificadas, desenvolvimento, comparação, caso resolvido, apoio visual e oito questões comentadas no conjunto. A avaliação é parcial, com identificação dos itens atendidos.

Arquivos envolvidos: Synthesizer, Reviewer, contratos de IA, DTO de geração, exercício/correção e tela do módulo. O contexto do Reviewer deve incluir objetivo completo, instruções e requisitos de cobertura. O parecer precisa avaliar profundidade, aplicação, alinhamento e fundamentação, além da clareza. Uma boa formatação não pode compensar ausência dos assuntos exigidos.

Para a explicação persistida de questões, revisar schema, migration, DTOs e respostas públicas. Preservar registros anteriores, permitindo comentário ausente em questões legadas, sem inventar retroativamente uma fundamentação.

Aceite: o aluno consegue estudar o recorte e resolver uma questão de aplicação usando a aula; os distratores têm explicação; afirmações normativas apontam evidência; fonte indisponível é indicada; imagem com falha não remove a explicação central; rejeição de qualidade não aparece como aula revisada. A amostra editorial deste documento é a referência inicial de revisão humana, não um teste automatizado de veracidade.

### Entrega 2 — Cobertura integral do programa

Preservar identificadores dos tópicos em módulos, aulas e questões. O catálogo guiado atual pode ser aproveitado, com evolução explícita dos contratos. Não basta aumentar o limite de oito módulos e confiar que a IA não omitiu nenhum item.

Acrescentar núcleo comum, referências catarinenses e sequência de aulas por blocos. Construir banco com variedade de assuntos e dificuldade. Aceite: cada item do programa possui aula e atividade previstas; lacunas documentais ficam pendentes; cobertura não é inferida apenas por palavras-chave.

### Entrega 3 — Simulado do edital e revisão orientada por erros

Adicionar configuração de três núcleos, cotas de questões, duração e mínimo de pontos, além de relatório por núcleo/tópico. Garantir amostragem sem duplicação e diversidade entre sessões. Preservar tentativas e resultados existentes.

Aceite: gerar 10 + 10 + 10 quando houver banco suficiente; sinalizar banco incompleto; esconder soluções durante a sessão; apresentar os três resultados e lacunas; direcionar revisão aos erros sem excluir assuntos ainda não estudados.

### Validação técnica e pedagógica

Testes devem verificar comportamento: requisitos transmitidos ao Reviewer; tratamento de fonte ausente; comparação objetiva com comentário separado; manutenção de sigilo do gabarito durante o simulado; seleção por núcleo; preservação de questões antigas; imagens e legendas no frontend. Testes que apenas procuram palavras no prompt não comprovam qualidade pedagógica.

Após implementar, executar testes dos módulos afetados, build e lint pertinentes. Validar também uma geração real no modelo configurado e, se utilizado, no fallback. Registrar tempo, custo quando disponível, abrangência, correções do Reviewer e leitura humana da aula. Nesta etapa documental, nenhum teste de implementação ou geração paga foi executado.

## 9. Uso do período até a prova

O tempo disponível por dia ainda não foi informado. A sequência abaixo é provisória, com base na data do edital, sem presumir horas de estudo ou nível atual:

| Período | Foco específico | Rotina nos três núcleos |
| --- | --- | --- |
| 03–09/10 | Diagnóstico, bases legais e política nacional | Português e legislação/lógica desde o início; corrigir erros diariamente |
| 10–16/10 | Santa Catarina, Libras, história e profissão | Continuar núcleo comum e revisar fundamentos |
| 17–23/10 | Ética, interpretação, ensino, PNEBS e acessibilidade | Avaliações por assunto; preencher lacunas de cobertura |
| 24–31/10 | Recuperação dos erros e pontos pendentes | Simulados completos quando o banco estiver suficiente; revisão dos três resultados |

O diagnóstico deve ajustar essa sequência. Não reservar todo o núcleo comum para a última semana. O mínimo oficial é referência de habilitação, não meta suficiente de preparação ou garantia de classificação.

## 10. Limites desta entrega

Foram produzidos este diagnóstico, a matriz do programa, o plano de melhoria e uma amostra de aula. Não houve mudanças no pipeline, migrations, criação de objetivo/trilha no banco ou geração de imagens. Falta conferir detalhadamente todas as fontes de cada aula e validar a qualidade com saídas reais do MindForge. A data de consulta das referências é 03/10/2026; a data de corte normativa aplicável à prova precisa ser confirmada nas regras e retificações do certame.
