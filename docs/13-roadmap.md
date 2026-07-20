# 13 — Roadmap

Atualizado em **2026-07-17** com o estado real do `mindforge-api` (não o scaffold inicial).

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
| Tutor IA com RAG | ⬜ |
| Autenticação | ⬜ (adiável: projeto pessoal single-user) |
| Dashboard frontend | ⬜ |

**Critério de conclusão Fase 1 (ajustado):**  
usuário registra objetivo → trilha → pesquisa → conteúdo → conversa com Tutor usando chunks reais da Biblioteca Viva.

---

## Fase 2 — Conteúdo e prática

| Item | Status |
|---|---|
| Reviewer no pipeline do Synthesizer | ⬜ |
| `conteudo_fontes` na geração | ⬜ |
| Exercícios (geração + correção) | ⬜ |
| Avaliações compostas | ⬜ |
| Revisão espaçada (lógica SM-2) | ⬜ |
| Workers assíncronos de domínio no `pg-boss` | ⬜ |
| Search web real no Research (opcional) | ⬜ |

**Critério de conclusão Fase 2:**  
loop completo pesquisa → síntese → estudo → exercício → feedback → revisão, sem intervenção manual nas etapas de IA.

---

## Fase 3 — Inteligência de longo prazo

| Item | Status |
|---|---|
| Knowledge Graph (progresso automático) | ⬜ |
| Visualização React Flow | ⬜ |
| Simulados multi-módulo | ⬜ |
| Projetos inteligentes | ⬜ |
| Sandbox para exercícios de código | ⬜ |

---

## Ordem sugerida agora

Dado o que **já funciona**, a sequência de maior valor é:

1. ~~**Chunking + indexação** no Synthesizer~~ → ✅ feito e validado (`docs/09-rag-biblioteca-viva.md §6`)
2. **Tutor IA** (`teacher` + RAG) → fecha o loop de estudo
3. **Exercícios + evaluator** → prática e feedback
4. **Revisão espaçada**
5. **Reviewer** no conteúdo
6. **Knowledge Graph**
7. Frontend/dashboard quando o backend do loop mínimo estiver estável

Autenticação multi-user **não** é prioridade (filosofia: sistema pessoal).

**Nota operacional:** o provedor de chat (OpenCode Go) pode atingir limite semanal de uso — nesse caso, testes de Planner/Research/Synthesizer (que dependem de chat) ficam bloqueados até o reset. O pipeline de RAG (chunking/embedding/busca) não depende de chat e pode ser validado independentemente com Ollama local.

---

## Fluxo já validado

```text
POST /perfis
POST /planner/objetivos
POST /planner/trilhas
POST /research/fontes
POST /synthesizer/conteudos
POST /diario
```
