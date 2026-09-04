# 12 — Knowledge Graph Pessoal

**Status:** ✅ implementado e testado. Visualização React Flow do grafo implementada no frontend.
**Tabelas:** `competencias`, `competencia_relacoes`, `competencia_progresso`, `modulo_competencias`

---

## 1. Estrutura

Lista de adjacência simples:

- **Nós:** `competencias`
- **Arestas:** `competencia_relacoes` (`pre_requisito`, `relacionada`, `aprofundamento`)
- **Progresso do usuário:** `competencia_progresso`
- **Ligação trilha ↔ grafo:** `modulo_competencias`

Sem Apache AGE / extensão de grafo — `WITH RECURSIVE` basta na escala pessoal (ADR-007 + modelagem §3.8).

**Status:** ✅ implementado e testado.

---

## 2. Consulta de cadeia (já validada no Postgres)

```sql
WITH RECURSIVE cadeia AS (
    SELECT id, nome, ARRAY[nome] AS caminho
    FROM competencias WHERE nome = 'Rust básico'
    UNION ALL
    SELECT c.id, c.nome, cadeia.caminho || c.nome
    FROM competencia_relacoes r
    JOIN competencias c ON c.id = r.competencia_destino_id
    JOIN cadeia ON cadeia.id = r.competencia_origem_id
)
SELECT * FROM cadeia;
```

---

## 3. Atualização de progresso

1. Módulo concluído/estudado → competências ligadas: `nao_iniciado` → `aprendendo`
2. Exercício correto (nota ≥ 7) → `praticando`; nota ≥ 9 → `dominado`
3. Avaliação forte → `dominado`

Progresso é atualizado via `KnowledgeGraphService.marcarProgressoPorModulo` e acionado automaticamente em `ExerciciosAvaliacoesService.submeterTentativa` e `AvaliacoesService`.

---

## 4. API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/knowledge-graph/perfis/:perfilId` | Grafo completo com progresso do perfil |
| `GET` | `/knowledge-graph/perfis/:perfilId/grafo` | Nós e arestas formatados para visualização |
| `GET` | `/knowledge-graph/competencias/:id` | Competência por ID |
| `GET` | `/knowledge-graph/competencias/:id/cadeia` | Cadeia de pré-requisitos |
| `GET` | `/knowledge-graph/competencias/:id/dependentes` | Competências que dependem desta |
| `POST` | `/knowledge-graph/competencias/:id/progresso` | Atualiza progresso do perfil |

---

## 5. Extração automática

- **Planner:** cada módulo da trilha vira uma competência e cria cadeia de pré-requisitos sequencial.
- **Synthesizer:** palavras-chave do conteúdo viram competências vinculadas ao módulo.

---

## 6. Visualização

Implementada em `mindforge-web/app/knowledge-graph/page.tsx` com React Flow (`@xyflow/react`):

- Nós representam competências, coloridos pelo nível de progresso (`nao_iniciado`, `aprendendo`, `praticando`, `dominado`).
- Arestas representam relações `pre_requisito`.
- Layout automático por profundidade topológica: competências sem pré-requisitos à esquerda, dependentes à direita.
- A página oferece duas abas: **Grafo** (visualização interativa) e **Lista** (visualização anterior em cards).
- Endpoint consumido: `GET /knowledge-graph/perfis/:perfilId/grafo`.
