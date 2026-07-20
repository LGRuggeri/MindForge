# 01 — Filosofia

## Princípios de Design

Este documento existe para que, daqui a um ano ou cinco, ao revisitar uma
decisão técnica antiga, seja possível entender *por que* ela foi tomada —
não só *o que* foi decidido.

### Não é produto comercial

Este é um sistema pessoal. Isso não é um detalhe incidental — é uma restrição
de design. Decisões que fariam sentido para um produto multi-usuário
(autenticação robusta multi-tenant, cache distribuído, filas de alta
concorrência) são deliberadamente adiadas ou simplificadas aqui, porque o
custo de mantê-las não se paga para um único usuário.

### Simplicidade antes de escalabilidade

Toda dependência nova precisa justificar sua presença contra o cenário real
de uso: uma pessoa, localmente, sem alto volume de requisições. Exemplos já
aplicados:

- **Sem Redis.** Cache distribuído e pub/sub não fazem diferença perceptível
  para um usuário único. Para fila de jobs assíncronos (pesquisa, síntese,
  correção), `pg-boss` ou `graphile-worker` resolvem sobre o próprio
  Postgres via `LISTEN/NOTIFY`, sem novo serviço para manter.
- **`TEXT` + `CHECK` em vez de `ENUM` nativo do Postgres** no modelo de
  dados — ver `04-modelagem-dados.md`, seção 4. Um ENUM nativo é mais rígido
  de alterar ao longo dos anos; um `CHECK` dá a mesma garantia de integridade
  com migração trivial.
- **Um único Postgres com pgvector**, em vez de um banco relacional mais um
  banco vetorial dedicado (Qdrant). Menos peças móveis para operar
  localmente, ao custo de uma escala de busca vetorial menor — irrelevante
  para uma biblioteca pessoal.

A pergunta padrão antes de adicionar qualquer peça de infraestrutura é: "isso
resolve um problema que eu tenho hoje, ou um problema que um produto
comercial teria?"

### Documentação viva em vez de especificação antecipada

A documentação técnica completa (arquitetura, banco de dados, agentes,
prompts) não é escrita de uma vez, antes do código existir. O núcleo — visão,
filosofia, arquitetura, stack, modelo de dados — é escrito primeiro porque dá
direção suficiente para começar a Fase 1. Os documentos de cada módulo
(Planner, RAG, Tutor IA, Knowledge Graph) são escritos quando o módulo é
efetivamente implementado, documentando o que *de fato* funcionou — não uma
hipótese que provavelmente vai mudar ao ver o sistema rodando.

Decisões pontuais (ex: "por que Drizzle e não Prisma") são registradas como
ADRs resumidos dentro do documento do módulo relevante, no momento em que são
tomadas — não como uma especificação de centenas de páginas escrita antes de
testar nada.

### Documentação oficial como fonte primária

O Research Engine prioriza documentação oficial, depois livros e artigos
técnicos, e só então outras fontes. Isso vale tanto para o que a IA pesquisa
para o usuário quanto para as decisões de engenharia deste próprio projeto.

### Arquitetura modular

Cada módulo (Planner, Research Engine, Synthesizer, Tutor IA, Exercícios e
Avaliações, Biblioteca Viva, Diário, Knowledge Graph) tem responsabilidade
única e fronteiras de dados claras — ver `02-arquitetura.md`. Isso permite
substituir a implementação de um módulo (por exemplo, trocar o provedor de
embeddings) sem reescrever os demais.

### Evolução incremental

Nenhuma fase do roadmap depende de acertar tudo de antemão. A Fase 1 entrega
valor real (planejamento + Tutor IA) sem depender de RAG, revisão espaçada ou
Knowledge Graph — recursos que só são adicionados quando o núcleo já está
rodando e validado no uso real.

### Todo conhecimento deve ser reutilizável

Cada conteúdo sintetizado, cada fonte pesquisada, cada chunk indexado no RAG
passa a compor a Biblioteca Viva. Nada estudado uma vez deve precisar ser
pesquisado do zero de novo — esse é o motivo de existir da tabela
`conteudo_chunks` e da própria arquitetura de RAG.
