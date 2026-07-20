# 14 — Decisões Arquiteturais (ADRs)

Registro consolidado. Novas decisões entram **no momento em que forem tomadas** (documentação viva).

---

### ADR-001 — Sem Redis

**Contexto:** stack original incluía Redis.  
**Decisão:** não usar Redis.  
**Alternativas:** Redis + BullMQ.  
**Consequências:** menos infra local; fila sobre Postgres.

---

### ADR-002 — Fila de jobs sobre Postgres

**Contexto:** pesquisa/síntese/correção podem ser longas.  
**Decisão:** `pg-boss` (LISTEN/NOTIFY).  
**Status implementação:** cliente sobe e conecta; workers de domínio ainda não registrados.  
**Alternativas:** BullMQ, RabbitMQ/SQS.

---

### ADR-003 — `TEXT` + `CHECK` em vez de ENUM nativo

**Decisão:** status/tipos como `TEXT` + `CHECK`.  
**Consequências:** migrations simples; validação reforçada nos DTOs.

---

### ADR-004 — UUID como PK

**Decisão:** UUID (`defaultRandom()`).  
**Consequências:** merges fáceis, sem vazar volume; índices um pouco maiores (irrelevante).

---

### ADR-005 — `revisao_espacada` polimórfica

**Decisão:** `item_tipo` + `item_id` sem FK real.  
**Alternativas:** 3 tabelas com FK.  
**Consequências:** menos duplicação; sem integridade referencial automática nessa tabela.

---

### ADR-006 — HNSW para índice vetorial

**Decisão:** HNSW `vector_cosine_ops` (defaults pgvector).  
**Alternativas:** IVFFlat.  
**Consequências:** funciona desde o primeiro chunk, sem treino.

---

### ADR-007 — Postgres único com pgvector

**Decisão:** sem Qdrant.  
**Consequências:** um banco só; escala vetorial “pessoal” é suficiente.

---

### ADR-008 — Drizzle como ORM

**Decisão:** Drizzle (suporte nativo a `vector` + `cosineDistance`).  
**Alternativas:** Prisma (vector fraco), TypeORM.  
**Consequências:** wiring manual no Nest; query vetorial de primeira classe.

---

### ADR-009 — Módulo pragmático controller → service → repository

**Decisão:** sem hexagonal completo.  
**Consequências:** service não importa Drizzle; só repository.

---

### ADR-010 — TypeScript 6.x (não 7.x)

**Decisão:** fixar TS ^6 por compatibilidade com Nest CLI.  
**Revisitar:** quando Nest suportar TS 7.1+.

---

### ADR-011 — Documentação viva

**Decisão:** núcleo primeiro; docs de módulo atualizados quando o código existir.  
**Consequências:** status “TODO” antigo foi substituído por status real na consolidação de 2026-07-17.

---

### ADR-012 — Diário reutiliza agente `teacher`

**Contexto:** design antigo deixava em aberto um sexto agente (`summarizer`) para `recomendacoes_ia`.  
**Decisão:** usar `teacher` no módulo Diário.  
**Alternativas:** criar `summarizer`.  
**Consequências:** enum menor; `teacher` serve acompanhamento e, no futuro, Tutor conversacional.

---

### ADR-013 — Agente `synthesizer` no enum de execuções

**Contexto:** design original listava `reviewer` no synthesizer, sem tipo `synthesizer`.  
**Decisão:** adicionar `synthesizer` ao CHECK de `agentes_execucoes` e ao `AgenteTipo`.  
**Consequências:** logging fiel à geração; `reviewer` permanece reservado para QA.

---

### ADR-014 — Postgres Docker na porta 5433

**Contexto:** Windows com PostgreSQL 18 nativo na 5432; `pg-boss`/API falhavam com senha “errada” por conectar no Postgres errado.  
**Decisão:** mapear container MindForge para `5433:5432` e `DATABASE_URL` na 5433.  
**Consequências:** coexiste com Postgres nativo; docs e `.env` devem usar 5433.

---

### ADR-015 — Research curado por LLM (sem search API na v1)

**Contexto:** Research Engine precisa de fontes para o Synthesizer.  
**Decisão:** v1 gera lista curada via LLM com priorização de docs oficiais; URLs podem ser null.  
**Alternativas consideradas:** Bing/Serp/Tavily search ao vivo.  
**Consequências:** zero chave extra de search; qualidade depende do modelo; upgrade futuro opcional.

---

### ADR-016 — Provedor de embeddings separado do provedor de chat

**Contexto:** o gateway de chat usado pelos agentes (OpenCode Go, via `OPENAI_BASE_URL`) não expõe o endpoint `/embeddings` (retorna 404) — serve apenas chat completions. Além disso, a conta atingiu limite semanal de uso, bloqueando testes de chat.  
**Decisão:** `EmbeddingService` aceita `EMBEDDING_API_KEY`/`EMBEDDING_BASE_URL` opcionais, com fallback para `LLM_API_KEY`/`OPENAI_BASE_URL` se omitidos. Em desenvolvimento local, configurado para usar **Ollama local** (`http://localhost:11434/v1`) com o modelo `nomic-embed-text`.  
**Alternativas consideradas:** forçar um único provedor para chat e embeddings (bloqueava completamente a Biblioteca Viva); usar a OpenAI oficial (exigiria chave paga adicional).  
**Consequências:** dimensão do vetor mudou de 1536 (`text-embedding-3-small`) para **768** (`nomic-embed-text`) — migration `0002_daily_jane_foster.sql` recriou a coluna `conteudo_chunks.embedding`. Pipeline de chunking + indexação + busca semântica validado ponta a ponta sem depender do provedor de chat.
