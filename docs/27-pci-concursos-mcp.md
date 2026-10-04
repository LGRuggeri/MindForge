# PCI Concursos: avaliação do MCP e proposta de integração

Verificação em 03/10/2026. **Status: investigação e teste externo de leitura concluídos; integração com as telas e serviços do MindForge ainda proposta.** Não foram alterados configuração de MCP do usuário, dependências, ambiente da aplicação ou banco pessoal.

Atualização em 04/10/2026: o MCP foi [configurado no Codex para este projeto](29-pci-codex-configuracao.md), com cinco ferramentas e consulta real validada. A preferência confirmada é usar consultas pelo Codex primeiro; integração com Objetivos permanece futura. A declaração acima descreve a investigação inicial de 03/10.

A PCI pode apoiar concursos de diferentes cargos e localidades. O uso recomendado combina descoberta pelo MCP, programa conferido no edital e estudo próprio de cada perfil. O acervo de provas e simulados do site exige uma integração adicional: não é disponibilizado pelas ferramentas MCP encontradas nesta verificação.

## O que foi conferido

- [Página oficial do MCP](https://www.pciconcursos.com.br/mcp-e-gpt): beta pública, anunciada como gratuita; endpoint `https://mcp.pciconcursos.com.br/mcp`.
- `initialize`, `notifications/initialized` e `tools/list` executados com sucesso. Servidor `Concursos Públicos Brasil`, versão `1.0.0`; protocolo negociado `2025-06-18`. A chamada de teste não exigiu chave.
- `tools/call` de `buscar_por_cargo`, com `{ cargo: "intérprete de libras", uf: "sc" }`, retornou dois concursos, sem erro de ferramenta. O retorno contém metadados, cargos, formação, UF/região, datas e notícia com link. Não contém o programa completo do edital ou questões.
- [Acervo de provas](https://www.pciconcursos.com.br/provas/) e [provas de Intérprete de Libras](https://www.pciconcursos.com.br/provas/interprete-de-libras): listagens por cargo, ano, órgão e organizadora.
- [Simulados do site](https://www.pciconcursos.com.br/simulados/): categorias de Libras, Língua Portuguesa, Legislação, Raciocínio Lógico e outras áreas. A existência dessas categorias não demonstra disponibilidade por API ou MCP.

O teste é uma amostra de disponibilidade e contrato na data consultada. Não certifica completude do acervo, cobertura de todos os editais nem disponibilidade futura.

## Ferramentas efetivamente expostas

| Ferramenta | Entrada observada | Utilidade |
|---|---|---|
| `listar_concursos` | `regiao` e `professores` opcionais | Descoberta por região e área docente |
| `pesquisar_concursos` | `termo` obrigatório, `uf` opcional | Busca livre por órgão, cargo ou título |
| `buscar_por_cargo` | `cargo` obrigatório, `uf` opcional | Concursos para uma função |
| `buscar_por_cidade` | `cidade` e `uf` obrigatórios | Concursos numa localidade |
| `buscar_apostilas` | `termo` obrigatório | Catálogo comercial; não fornece o conteúdo do PDF comprado |

O servidor não listou ferramentas de provas, questões, gabaritos ou execução de simulados. O campo `uf` das buscas por cargo/termo também inclui a macro-região e concursos nacionais, conforme o contrato do servidor. A interface futura deve explicar essa abrangência ou aplicar um filtro exato após a busca. Não apresentar todos os resultados como exclusivos do estado informado.

A documentação diz que as buscas de concursos consideram inscrições abertas. Por isso, o MCP não deve ser a única forma de localizar um edital antigo, um concurso já escolhido ou provas de concursos encerrados. Manter entrada manual e importação do PDF.

## Comparação com a estrutura atual

| Necessidade | Hoje no MindForge | Integração necessária |
|---|---|---|
| Descobrir concursos | Catálogo revisado de programas prontos | Serviço especializado de consulta ao PCI MCP |
| Criar programa de outro edital | Grade do catálogo ou trilha livre por IA | Importar edital, separar cargo e núcleos comuns, revisar a grade antes de criar |
| Consultar fontes | Research com DuckDuckGo, API genérica ou Serper | Incorporar referências encontradas pela PCI sem substituir a pesquisa de fontes didáticas |
| Estudar por perfil | Objetivos, trilhas, módulos e respostas vinculados ao perfil | Reutilizar esse fluxo para o concurso escolhido |
| Resolver provas reais | Exercícios autorais, avaliações e seleção de alternativas | Importação de prova e gabarito com procedência e revisão da extração |
| Identificar lacunas | Tentativas, feedback, progresso e grafo existentes | Relacionar erro ao tópico e módulo, para orientar revisão e depois replanejamento |

`SearchProvider` retorna resultados de pesquisa de fontes, enquanto o MCP retorna registros de concursos. Colocá-lo diretamente como substituto global de `SEARCH_PROVIDER` confundiria essas responsabilidades e prejudicaria pesquisas de outros assuntos. A proposta é um adaptador especializado, usado pelo fluxo de concursos; o Research continua buscando o material necessário às aulas.

O schema atual de exercícios possui módulo, enunciado, gabarito, comentário, dificuldade e finalidade. O comentário aceita fontes, mas não substitui os metadados de uma prova externa, como banca, ano, cargo, número da questão e versão do gabarito.

## Entregas sugeridas

### 1. Descoberta e escolha do concurso

Adicionar uma opção **Buscar concursos** no fluxo de Objetivos, com cargo/termo, UF, cidade e região. Mostrar os resultados com órgão, cargos, prazo, abrangência e link da fonte. Permitir escolher o cargo concreto num resultado com vários cargos.

No backend, criar módulo de concursos com controller, service, repository e adaptador PCI isolado. Usar cliente MCP com suporte ao protocolo negociado, validação de retornos, timeout e cache curto. Chamadas explícitas às ferramentas de leitura; descrições e textos externos são dados, não comandos para o agente.

Escolher o concurso prepara seu contexto; não inventa uma grade a partir do título da notícia. A primeira entrega deve apresentar o próximo passo de obter o edital, e permitir seguir com PDF ou URL oficial informados pelo estudante. Sem cadastro automático de objetivos ao listar resultados.

**Aceite:** busca real funcional para diferentes cargos, seleção do cargo e origem visível; falha do conector não impede abrir estudos já salvos; nenhum resultado é gravado como estudo de outro perfil.

### 2. Do edital à grade revisada

Importar o PDF do edital e anexos, registrar origem/data e identificar órgão, banca, cargo, escolaridade e programa. Separar núcleo comum e conhecimentos específicos. Mostrar a grade proposta com os assuntos e trechos/localizadores que a sustentam, antes de criar o estudo no perfil selecionado.

Depois de conferida, reutilizar a criação transacional de objetivo, trilha, módulos e fontes, com retrato da grade na metadata. O Synthesizer, Reviewer e exercícios recebem os tópicos obrigatórios de cada módulo, como ocorre no concurso de Libras. Preservar versões e resultados anteriores ao atualizar o edital.

**Aceite:** incluir todos os blocos pertinentes ao cargo; permitir seleção parcial; não misturar exigências de cargos diferentes nem restringir o núcleo comum ao específico.

### 3. Provas anteriores e avaliação

Começar com indicação de links de provas e simulados relevantes e importação de PDFs escolhidos pelo usuário. Antes de transformar em exercícios, conferir extração de enunciados, alternativas, imagens e correspondência com o gabarito. Acesso ao acervo é uma etapa separada do MCP investigado.

Registrar prova, banca, ano, órgão/cargo, origem, número da questão, assunto e versão do gabarito. Identificar questões anuladas ou sem resposta confirmada; não completar o gabarito oficial com uma resposta inventada pela IA. Separar questão importada de questão autoral e comentário oficial de explicação produzida por IA.

Usar os fluxos atuais de alternativas e finalização: correção baseada no gabarito conferido, resultado salvo no perfil. Associar erros aos módulos pertinentes e propor atividades de revisão. A composição por assuntos e replanejamento automático podem vir depois desse vínculo verificável.

**Aceite:** resolver e reabrir um pequeno conjunto de questões verificadas, preservando fonte, alternativas e resultado; produzir uma indicação de revisão apoiada nos erros reais. Ampliar após validar essa primeira importação.

## Prioridade recomendada

Implementar primeiro **descoberta de concursos + escolha do cargo + entrada do edital**, com um fluxo reutilizável para qualquer concurso. Depois, desenvolver a extração e revisão da grade. A importação de provas deve vir com seu próprio controle de procedência e gabarito; conectar o MCP sozinho não entrega essa capacidade.

Os registros técnicos de teste ficam em `.cache/pci-mcp/`; a [evidência resumida](assets/pci-mcp/verificacao.json) mantém data, ferramentas e forma do retorno observado. Não foi executada geração de IA, compra de apostila, importação em lote de questões ou gravação no banco pessoal.
