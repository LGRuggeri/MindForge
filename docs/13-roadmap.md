# 13 — Roadmap

Atualizado em **2026-08-23** com o estado real do `mindforge-api`.

---

## Fase 1 — Fundamentos (quase fechada no backend)

| Item | Status |
|---|---|
| Modelagem de dados (21 tabelas) | ✅ |
| Scaffold NestJS + Drizzle | ✅ |
| Perfil CRUD | ✅ |
| Objetivos + Planner | ✅ |
| Research Engine | ✅ |
| Synthesizer (geração) | ✅ |
| Diário + teacher | ✅ |
| Agentes + logging | ✅ |
| Jobs (`pg-boss` sobe) | ✅ |
| Biblioteca Viva (busca) + EmbeddingService | ✅ (Ollama local: `nomic-embed-text`, 768 dim) |
| Chunking automático pós-síntese | ✅ implementado e validado |
| Tutor IA com RAG | ✅ implementado: `teacher` + `agent-kb` + contexto contínuo |
| Autenticação | ⬜ (adiável: projeto pessoal single-user) |
| Dashboard frontend | ✅ implementado: Next.js + shadcn/ui cobrindo perfis, objetivos, trilhas, módulos, tutor, revisão e knowledge graph |

**Critério de conclusão Fase 1 (ajustado):**  
usuário registra objetivo → trilha → pesquisa → conteúdo → conversa com Tutor usando chunks reais da Biblioteca Viva.

---

## Fase 2 — Conteúdo e prática

| Item | Status |
|---|---|
| Reviewer no pipeline do Synthesizer | ✅ implementado: agente `reviewer` com nota 1–5, reescrita até 2 tentativas |
| `conteudo_fontes` na geração | ✅ implementado: `conteudo_fontes` é preenchido automaticamente |
| Exercícios (geração + correção) | ✅ implementado: agente `evaluator` + Biblioteca Viva + correção objetiva automática e dissertativa via LLM |
| Avaliações compostas | ✅ implementado: criação, submissão, resultado e disparo de revisão |
| Revisão espaçada (lógica SM-2) | ✅ implementado: algoritmo SM-2 + endpoint de revisões do dia |
| Workers assíncronos de domínio no `pg-boss` | ✅ implementado: Synthesizer, Exercícios, Biblioteca Viva e Research suportam `async` via jobs |
| Search web real no Research (opcional) | ✅ implementado: DuckDuckGo + provider genérico de API (Serper/Tavily/Brave) via `SEARCH_PROVIDER` |

**Critério de conclusão Fase 2:**  
loop completo pesquisa → síntese → estudo → exercício → feedback → revisão, sem intervenção manual nas etapas de IA.

---

## Fase 3 — Inteligência de longo prazo

| Item | Status |
|---|---|
| Knowledge Graph (nós, arestas, progresso) | ✅ implementado: `competencias`, `competencia_relacoes`, `competencia_progresso`, `modulo_competencias` |
| Extração de competências no Planner | ✅ implementado: competência por módulo + cadeia de pré-requisitos |
| Extração de competências no Synthesizer | ✅ implementado: palavras-chave do conteúdo viram competências vinculadas ao módulo |
| Progresso automático em exercícios/avaliações | ✅ implementado: nota ≥ 7 dispara progresso `praticando`/`dominado` |
| Visualização React Flow | ✅ implementado: endpoint `/perfis/:id/grafo` + componente React Flow no frontend |
| Simulados multi-módulo | ✅ implementado: criação por trilha com sorteio automático de exercícios + progresso multi-módulo |
| Projetos inteligentes | ✅ implementado: módulo `projetos` com geração por IA, entregas e feedback iterativo |
| Sandbox para exercícios de código | ⬜ |

---

## Ordem sugerida agora

Dado o que **já funciona**, a sequência de maior valor é:

1. ~~**Chunking + indexação** no Synthesizer~~ → ✅ feito e validado (`docs/09-rag-biblioteca-viva.md §6`)
2. ~~**Tutor IA** (`teacher` + RAG)~~ → ✅ feito
3. ~~**Exercícios + evaluator**~~ → ✅ feito
4. ~~**Revisão espaçada**~~ → ✅ feito
5. ~~**Reviewer** no conteúdo~~ → ✅ feito
6. ~~**Knowledge Graph**~~ → ✅ feito: extração no Planner/Synthesizer, progresso automático por exercícios/avaliações
7. ~~**Workers assíncronos no `pg-boss`**~~ → ✅ feito
8. ~~**Search web real no Research**~~ → ✅ feito
9. ~~**Frontend/dashboard**~~ → ✅ feito
10. ~~**Visualização React Flow do Knowledge Graph**~~ → ✅ feito
11. ~~**Simulados multi-módulo**~~ → ✅ feito
12. ~~**Projetos inteligentes**~~ → ✅ feito

Autenticação multi-user **não** é prioridade (filosofia: sistema pessoal).

**Nota operacional:**
- O provedor de chat (OpenCode Go) pode atingir limite semanal de uso. Agora é possível configurar fallback LLM via `LLM_FALLBACK_BASE_URLS`, `LLM_FALLBACK_API_KEYS` e `LLM_FALLBACK_MODELS` (endpoints compatíveis com OpenAI, ex: Groq, Ollama, OpenRouter).
- O pipeline de RAG (chunking/embedding/busca) não depende de chat e pode ser validado independentemente com Ollama local.
- Web search suporta `SEARCH_PROVIDER=duckduckgo` (gratuito, frágil) ou `SEARCH_PROVIDER=api` com `SEARCH_API_URL`/`SEARCH_API_KEY` (Serper, Tavily, Brave etc).

---

## Fluxo já validado

```text
POST /perfis
POST /planner/objetivos
POST /planner/trilhas
POST /research/fontes
POST /synthesizer/conteudos
POST /diario
POST /tutor/duvidas
POST /exercicios-avaliacoes/exercicios/gerar
POST /exercicios-avaliacoes/exercicios/:id/tentativas
POST /exercicios-avaliacoes/avaliacoes
POST /exercicios-avaliacoes/avaliacoes/submeter
GET /exercicios-avaliacoes/revisao?data=AAAA-MM-DD
GET /knowledge-graph/perfis/:perfilId
```
