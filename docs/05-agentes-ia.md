# 05 — Agentes de IA

**Status:** parcialmente implementado.  
Infra de execução + logging pronta (`AgentesModule`, `LlmService`, `agentes_execucoes`).  
Agentes com código de domínio: `planner`, `researcher`, `synthesizer`, `teacher` (diário).  
Pendentes de domínio: `teacher` como Tutor conversacional, `evaluator`, `reviewer`.

---

## 1. Mapa agente → módulo

| Agente (`agentes_execucoes.agente`) | Módulo | Responsabilidade | Status |
|---|---|---|---|
| `planner` | `planner` | Gera trilha de estudo | ✅ |
| `researcher` | `research` | Curadoria de fontes | ✅ |
| `synthesizer` | `synthesizer` | Material didático Markdown | ✅ |
| `teacher` | `diario` (hoje) / `tutor` (futuro) | Acompanhamento diário; depois Tutor RAG | ✅ diário / ⬜ tutor |
| `evaluator` | `exercicios-avaliacoes` | Correção e resultados | ⬜ |
| `reviewer` | `synthesizer` (QA) | Revisar conteúdo antes de publicar | ⬜ |

O enum do CHECK inclui:  
`planner | researcher | synthesizer | teacher | evaluator | reviewer`.

---

## 2. Contrato comum

Toda execução passa por `AgentesService.executar()`:

1. Chama o LLM via `LlmService` (OpenAI-compatible / OpenCode Go).
2. Aplica `parser` tipado (JSON seguro).
3. Grava em `agentes_execucoes`: entrada, saída, modelo, tokens, duração, status/erro.
4. Em falha: registra `status=erro` e relança a exceção.

Isso não é opcional — é a única forma de depurar cadeias de agentes.

---

## 3. Síncrono vs assíncrono

| Agente | Hoje | Recomendado |
|---|---|---|
| `planner` | síncrono HTTP | pode migrar para fila se latência incomodar |
| `researcher` | síncrono HTTP | fila (`pg-boss`) se integrar search web real |
| `synthesizer` | síncrono HTTP | fila + `reviewer` em pipeline |
| `teacher` (diário) | síncrono HTTP | manter síncrono |
| `teacher` (tutor) | — | síncrono (interativo) |
| `evaluator` | — | síncrono para 1 exercício; fila para avaliação composta |
| `reviewer` | — | assíncrono após síntese |

`JobsModule` (`pg-boss`) já sobe e conecta no Postgres. Ainda não há workers de domínio registrados.

---

## 4. Configuração LLM

```env
LLM_API_KEY=...
LLM_MODEL=grok-4.5
OPENAI_BASE_URL=https://opencode.ai/zen/go/v1
EMBEDDING_MODEL=text-embedding-3-small
```

---

## 5. Decisões já tomadas na implementação

- **Diário usa `teacher`**, não um sexto agente (`summarizer`). Ver ADR-012.
- **Synthesizer é agente próprio** no enum (além de `reviewer` futuro).
- Parser JSON remove fences ` ```json ` e falha alto se inválido.
- Prompts vivem no código do service de cada módulo (documentação viva: o prompt que roda é o que vale).

---

## 6. Próximos agentes a implementar

1. `teacher` no módulo `tutor` com RAG (`09-rag-biblioteca-viva.md`).
2. `evaluator` em `exercicios-avaliacoes` (`11-avaliacoes.md`).
3. `reviewer` no pipeline do Synthesizer (`08-synthesizer.md`).
