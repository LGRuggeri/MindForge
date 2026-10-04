# MindForge — Cronograma de Sequência de Desenvolvimento

> **For Hermes:** Use subagent-driven-development ou execução direta para implementar as fases abaixo, uma a uma.

**Objetivo:** manter o roadmap executável sem perder o fio das prioridades, fechando o loop de estudo (pergunta → prática → revisão → progresso).

**Estado atual (2026-07-20):**
- ✅ Perfil, Planner, Research, Synthesizer, Diário, Agentes, Jobs, Biblioteca Viva, chunking, embeddings, Tutor IA com RAG.
- ⬜ Exercícios/Avaliações, Revisão Espaçada, Reviewer no Synthesizer, Knowledge Graph, Frontend, Autenticação.

**Stack:** NestJS + Drizzle ORM + Postgres/pgvector + pg-boss + Ollama (embeddings) + OpenCode Go (chat).

---

## Fase 2 — Conteúdo e Prática (próximas 4–6 semanas)

### Sprint 2.1 — Exercícios e Avaliações (semanas 1–2)

**Meta:** usuário pode gerar exercícios, submeter tentativas e receber feedback do agente `evaluator`.

| # | Tarefa | Arquivos principais | Critério de pronto |
|---|--------|---------------------|-------------------|
| 2.1.1 | Criar DTOs de exercício e tentativa (`CriarExercicioDto`, `SubmeterTentativaDto`) | `src/modules/exercicios-avaliacoes/dto/*.ts` | DTOs validados com `class-validator`, cobrem tipos: objetiva, dissertativa, código, projeto. |
| 2.1.2 | Implementar repositório de exercícios e tentativas | `src/modules/exercicios-avaliacoes/exercicios-avaliacoes.repository.ts` | CRUD + listagem por módulo + estatísticas básicas. |
| 2.1.3 | Implementar geração de exercício via agente `evaluator` | `src/modules/exercicios-avaliacoes/exercicios-avaliacoes.service.ts` | Recebe `moduloId` + `tipo` + `dificuldade`, busca chunks na Biblioteca Viva, chama `AgentesService` com prompt estruturado, persiste. |
| 2.1.4 | Implementar submissão e correção de tentativa | `src/modules/exercicios-avaliacoes/exercicios-avaliacoes.service.ts` | Objetiva: correção automática. Dissertativa/código: correção via LLM com critérios. Projeto: feedback heurístico inicial. |
| 2.1.5 | Expor rotas REST | `src/modules/exercicios-avaliacoes/exercicios-avaliacoes.controller.ts` | `POST /exercicios`, `GET /exercicios?moduloId=`, `POST /exercicios/:id/tentativas`, `GET /exercicios/:id/estatisticas`. |
| 2.1.6 | Testes unitários do service e controller | `src/modules/exercicios-avaliacoes/exercicios-avaliacoes.service.spec.ts`, `*.controller.spec.ts` | Cobrir geração, correção objetiva e caminho de erro com mocks de `AgentesService` e Biblioteca Viva. |
| 2.1.7 | Atualizar docs (`11-avaliacoes.md`, `README.md`, `13-roadmap.md`) | `docs/11-avaliacoes.md`, `docs/README.md`, `docs/13-roadmap.md` | Status real refletido; fluxo validado inclui exercícios. |

**Validação de fim de sprint:**
```bash
cd mindforge-api
npm run lint
npm run test -- exercicios-avaliacoes
npm run build
```

---

### Sprint 2.2 — Avaliações Compostas e Revisão Espaçada (semanas 3–4)

**Meta:** montar avaliações (diagnóstica, formativa, somativa, simulado) e disparar revisão espaçada SM-2 a partir do desempenho.

| # | Tarefa | Arquivos principais | Critério de pronto |
|---|--------|---------------------|-------------------|
| 2.2.1 | Criar DTOs de avaliação e resultado | `src/modules/exercicios-avaliacoes/dto/avaliacao*.dto.ts` | Criar avaliação, adicionar exercícios, submeter resultado. |
| 2.2.2 | Implementar montagem e aplicação de avaliação | `src/modules/exercicios-avaliacoes/avaliacoes.service.ts` (novo) | Seleciona N exercícios por módulo/tipo, aplica, calcula fortes/fracos. |
| 2.2.3 | Implementar revisão espaçada SM-2 | `src/modules/exercicios-avaliacoes/revisao-espacada.service.ts` (novo) | Algoritmo SM-2 padrão: `intervalo`, `repeticao`, `fator_facilidade`, `data_revisao`. Atualiza em tentativa. |
| 2.2.4 | Integrar avaliação → diário e replanejamento | `src/modules/diario/diario.service.ts`, `src/modules/planner/planner.service.ts` | Resultado de avaliação gera entrada no diário e, se fraco, sugere replanejamento. |
| 2.2.5 | Expor rotas de avaliação e revisão | `src/modules/exercicios-avaliacoes/exercicios-avaliacoes.controller.ts` | `POST /avaliacoes`, `POST /avaliacoes/:id/iniciar`, `POST /avaliacoes/:id/resultados`, `GET /revisao?perfilId=`. |
| 2.2.6 | Testes unitários e de integração leve | `src/modules/exercicios-avaliacoes/*.spec.ts` | SM-2 cobre acerto, erro e reset. Avaliação cobre cálculo de resultado. |
| 2.2.7 | Atualizar docs | `docs/11-avaliacoes.md`, `docs/13-roadmap.md` | Status da revisão espaçada como implementado. |

**Validação de fim de sprint:**
```bash
npm run lint
npm run test -- avaliacoes
npm run build
```

---

### Sprint 2.3 — Reviewer no Synthesizer e `conteudo_fontes` (semanas 5–6)

**Meta:** o Synthesizer revisa o próprio conteúdo antes de persistir e registra quais fontes foram usadas.

| # | Tarefa | Arquivos principais | Critério de pronto |
|---|--------|---------------------|-------------------|
| 2.3.1 | Adicionar tabela/link `conteudo_fontes` no schema | `src/database/schema/index.ts` | Relação N:N entre `conteudos` e `fontes`. |
| 2.3.2 | Persistir fontes usadas na síntese | `src/modules/synthesizer/synthesizer.service.ts` | Após gerar conteúdo, insere IDs de fontes relevantes em `conteudo_fontes`. |
| 2.3.3 | Implementar agente `reviewer` | `src/modules/synthesizer/synthesizer.service.ts` ou novo `reviewer.service.ts` | Prompt pede nota 1–5 em clareza, factualidade, adequação ao nível; se nota < 3, solicita reescrita (máx 2 tentativas). |
| 2.3.4 | Integrar revisão no pipeline de síntese | `src/modules/synthesizer/synthesizer.service.ts` | Conteúdo só é salvo após aprovação do reviewer. |
| 2.3.5 | Testes do pipeline com reviewer | `src/modules/synthesizer/synthesizer.service.spec.ts` | Mocka aprovação e rejeição; valida persistência de `conteudo_fontes`. |
| 2.3.6 | Atualizar docs | `docs/08-synthesizer.md`, `docs/13-roadmap.md` | Status do reviewer e `conteudo_fontes` como implementados. |

**Validação de fim de sprint:**
```bash
npm run lint
npm run test -- synthesizer
npm run build
```

---

## Fase 3 — Inteligência de Longo Prazo (semanas 7–10)

### Sprint 3.1 — Knowledge Graph (semanas 7–8)

**Meta:** progresso automático de competências a partir de módulos e exercícios; endpoints de nós/arestas.

| # | Tarefa | Arquivos principais | Critério de pronto |
|---|--------|---------------------|-------------------|
| 3.1.1 | Criar seeds de competências no schema | `src/database/schema/index.ts` ou migration | Inserir competências de exemplo (ex: "Rust básico", "Ownership", "Borrowing"). |
| 3.1.2 | Implementar repositório do grafo | `src/modules/knowledge-graph/knowledge-graph.repository.ts` (novo) | CRUD de competências e relações; consulta recursiva de pré-requisitos. |
| 3.1.3 | Implementar atualização automática de progresso | `src/modules/knowledge-graph/knowledge-graph.service.ts` | Módulo concluído → `aprendendo`; exercício correto → `praticando`; avaliação forte → `dominado`. |
| 3.1.4 | Expor rotas REST do grafo | `src/modules/knowledge-graph/knowledge-graph.controller.ts` | `GET /knowledge-graph/perfis/:perfilId`, `GET /competencias/:id/cadeia`, `POST /competencias/:id/progresso`. |
| 3.1.5 | Testes unitários | `src/modules/knowledge-graph/knowledge-graph.service.spec.ts` | Progresso evolui corretamente; cadeia de pré-requisitos retorna ordem certa. |
| 3.1.6 | Atualizar docs | `docs/12-knowledge-graph.md`, `docs/13-roadmap.md` | Status como implementado. |

**Validação de fim de sprint:**
```bash
npm run lint
npm run test -- knowledge-graph
npm run build
```

---

### Sprint 3.2 — Workers Assíncronos no `pg-boss` e Search Web Real (semanas 9–10)

**Meta:** tarefas pesadas (geração de conteúdo, avaliação, embeddings) podem rodar async; research pode buscar na web.

| # | Tarefa | Arquivos principais | Critério de pronto |
|---|--------|---------------------|-------------------|
| 3.2.1 | Definir jobs de domínio (síntese, avaliação, embedding) | `src/jobs/*.handler.ts` (novos) | Handlers idempotentes com logging e retry. |
| 3.2.2 | Disparar jobs a partir dos serviços | `src/modules/synthesizer/synthesizer.service.ts`, `src/modules/exercicios-avaliacoes/exercicios-avaliacoes.service.ts` | Serviços enfileiram tarefas pesadas em vez de executar sync quando apropriado. |
| 3.2.3 | Implementar search web real opcional no Research | `src/modules/research/research.service.ts` | Integração com search API (ex: Serper, Brave) como fallback/ complemento ao conteúdo curado. |
| 3.2.4 | Monitoramento básico de jobs | `src/jobs/jobs.module.ts` | Endpoint ou log de jobs falhos/pendentes. |
| 3.2.5 | Testes dos handlers | `src/jobs/*.spec.ts` | Mock de pg-boss; valida idempotência. |
| 3.2.6 | Atualizar docs | `docs/06-research-engine.md`, `docs/13-roadmap.md` | Status de workers e search web real. |

**Validação de fim de sprint:**
```bash
npm run lint
npm run test -- jobs
npm run build
```

---

## Fase 4 — Frontend e Experiência (semanas 11–14, paralelizável)

### Sprint 4.1 — Dashboard Mínimo

**Meta:** interface web para acompanhar trilhas, estudar com o tutor, fazer exercícios e ver revisões.

| # | Tarefa | Arquivos principais | Critério de pronto |
|---|--------|---------------------|-------------------|
| 4.1.1 | Escolher stack frontend e scaffold | novo diretório `mindforge-web/` | Next.js ou React+Vite; decisão documentada em ADR. |
| 4.1.2 | Tela de perfil e objetivos | `mindforge-web/src/app/perfis/*` | CRUD de perfil; lista de objetivos/trilhas. |
| 4.1.3 | Tela de estudo com Tutor | `mindforge-web/src/app/tutor/*` | Chat com histórico, avaliação de respostas, citações de chunks. |
| 4.1.4 | Tela de exercícios e revisão | `mindforge-web/src/app/exercicios/*` | Gerar exercício, responder, ver resultado e próximas revisões. |
| 4.1.5 | Visualização do Knowledge Graph | `mindforge-web/src/app/grafo/*` | React Flow com nós/arestas e progresso do perfil. |
| 4.1.6 | Atualizar docs | `docs/13-roadmap.md`, novo `docs/15-frontend.md` | Status do dashboard. |

**Validação de fim de sprint:**
```bash
cd mindforge-web
npm run lint
npm run build
```

---

## Fase 5 — Autenticação e Multi-user (futuro, baixa prioridade)

**Decisão:** adiável. Quando for necessário:

1. Escolher estratégia (JWT + bcrypt ou OAuth).
2. Adicionar tabela `usuarios` e vincular a `perfis`.
3. Proteger rotas com Guard do NestJS.
4. Atualizar ADR e docs.

---

## Ordem de execução recomendada

```
2.1 → 2.2 → 2.3 → 3.1 → 3.2 → 4.1 → 5
```

**Não pule 2.1/2.2** — exercícios são a base para revisão espaçada e knowledge graph.

---

## Ritmo sugerido

- **1 sprint = 2 semanas** (ajustável conforme disponibilidade).
- **1 tarefa por vez**, com testes e commit.
- **Revisão ao final de cada sprint:** rodar `npm run lint && npm run test && npm run build`.
- **Atualizar docs junto com o código** — nunca deixar o roadmap desatualizado.

---

## Riscos e mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Limite semanal do provedor de chat (OpenCode Go) | Alto | Foco em módulos que não dependem de chat (SM-2, repositórios, rotas) quando atingir limite. Cachear respostas de LLM em dev. |
| Ollama offline para embeddings | Médio | Testes de Biblioteca Viva mockam embeddings; validação manual quando Ollama estiver ativo. |
| Schema crescendo sem migrações limpas | Médio | Cada tarefa que altera schema gera migration com `npm run db:generate`. |
| Frontend atrasando backend | Baixo | Frontend só começa após Fase 3 estabilizada. |

---

## Próximo passo imediato

Iniciar **Sprint 2.1 — Tarefa 2.1.1** (DTOs de exercício e tentativa).
