# 02 — Arquitetura

## Visão geral

```text
Next.js
   ↓
NestJS API (REST + GraphQL)
   ↓
Drizzle ORM
   ↓
PostgreSQL + pgvector
   ↓
Agentes de IA (Planner, Researcher, Teacher, Evaluator, Reviewer)
   ↓
API de LLM (GPT-5.5)
```

Diagrama completo em [`diagrams/arquitetura.mmd`](diagrams/arquitetura.mmd).

Uma diferença importante em relação à v2 original: o vetor de embeddings
não vive num banco separado (Qdrant). Ele vive como coluna `vector` dentro do
próprio PostgreSQL, via extensão pgvector. Um único banco para operar
localmente — ver a justificativa em `01-filosofia.md`, princípio de
simplicidade.

## Módulos do sistema

Cada módulo abaixo corresponde a um grupo de tabelas descrito em
`04-modelagem-dados.md`, seção 3.

| Módulo | Responsabilidade | Tabelas principais |
|---|---|---|
| **Perfil de Aprendizagem** | Nível atual, tempo disponível, preferências do usuário. | `perfil_aprendizagem` |
| **Planner** | Transforma um objetivo em trilha de estudo com módulos ordenados. | `objetivos_estudo`, `trilhas_estudo`, `modulos_trilha` |
| **Research Engine** | Pesquisa documentação oficial, livros, artigos e outras fontes online. | `fontes_pesquisa` |
| **Synthesizer** | Transforma pesquisa em conteúdo didático original. | `conteudos`, `conteudo_fontes` |
| **Tutor IA** | Explica conceitos, responde dúvidas, adapta exemplos — consome RAG. | `conteudo_chunks` |
| **Exercícios e Avaliações** | Questões, desafios, projetos, simulados e correção. | `exercicios`, `tentativas_exercicio`, `avaliacoes`, `resultados_avaliacao` |
| **Biblioteca Viva** | Todo conhecimento estudado, pesquisável via busca vetorial. | `conteudo_chunks`, `fontes_pesquisa` |
| **Diário de Aprendizagem** | Registro diário de estudos, dificuldades e tempo investido. | `diario_aprendizagem`, `diario_modulos` |
| **Knowledge Graph Pessoal** | Mapa de competências adquiridas e lacunas. | `competencias`, `competencia_relacoes`, `competencia_progresso`, `modulo_competencias` |

## Fluxo de dados entre módulos

1. O usuário registra um objetivo (`objetivos_estudo`).
2. O **Planner** gera uma trilha (`trilhas_estudo`) dividida em módulos
   ordenados (`modulos_trilha`).
3. Para cada módulo, o **Research Engine** busca fontes online e as registra
   (`fontes_pesquisa`).
4. O **Synthesizer** lê as fontes e produz conteúdo didático
   (`conteudos`), quebrado em chunks vetorizados (`conteudo_chunks`) para uso
   futuro em RAG.
5. O **Tutor IA** usa busca por similaridade sobre `conteudo_chunks` para
   responder dúvidas com contexto relevante, mesmo de módulos antigos —
   é isso que torna a Biblioteca Viva "viva".
6. O módulo de **Exercícios e Avaliações** gera questões ligadas ao módulo,
   registra tentativas com feedback (`tentativas_exercicio`) e, quando
   agrupadas em uma avaliação, produz um resultado consolidado com pontos
   fortes e fracos (`resultados_avaliacao`).
7. Itens de conteúdo, exercício ou competência entram na fila de
   **revisão espaçada** (`revisao_espacada`), que decide quando devem
   reaparecer para o usuário.
8. Ao fim de cada sessão, um registro é adicionado ao **Diário**
   (`diario_aprendizagem`), citando os módulos estudados.
9. O progresso do usuário atualiza o **Knowledge Graph**
   (`competencia_progresso`), que também expõe pré-requisitos e lacunas via
   `competencia_relacoes`.

## Execução assíncrona

Pesquisa online, síntese de conteúdo e geração/correção de exercícios são
operações longas — não devem bloquear a resposta HTTP. Rodam em background
via `pg-boss` ou `graphile-worker`, ambos implementados sobre o próprio
Postgres (fila de jobs com retry, agendamento e concorrência controlada, sem
subir um serviço novo).

## Observabilidade dos agentes

Toda execução de agente (Planner, Researcher, Teacher, Evaluator, Reviewer)
é registrada em `agentes_execucoes`: entrada, saída, modelo usado, tokens,
duração e status. Isso é o que permite depurar por que um plano saiu ruim ou
uma correção ficou incoerente — essencial num sistema onde múltiplos agentes
de IA tomam decisões em cadeia sem supervisão humana em cada etapa.
