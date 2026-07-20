# 12 — Knowledge Graph Pessoal

**Status:** ⬜ esqueleto de módulo. Modelo de dados validado (consulta recursiva testada no schema).  
**Tabelas:** `competencias`, `competencia_relacoes`, `competencia_progresso`, `modulo_competencias`

---

## 1. Estrutura

Lista de adjacência simples:

- **Nós:** `competencias`
- **Arestas:** `competencia_relacoes` (`pre_requisito`, `relacionada`, `aprofundamento`)
- **Progresso do usuário:** `competencia_progresso`
- **Ligação trilha ↔ grafo:** `modulo_competencias`

Sem Apache AGE / extensão de grafo — `WITH RECURSIVE` basta na escala pessoal (ADR-007 + modelagem §3.8).

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

## 3. Atualização de progresso (design, ⬜)

1. Módulo concluído → competências ligadas: `nao_iniciado` → `aprendendo`  
2. Exercício correto → `praticando`  
3. Avaliação forte → `dominado`

Depende de exercícios/avaliações (`11-avaliacoes.md`) antes de automatizar.

---

## 4. Visualização

- Frontend previsto: React Flow  
- Endpoint de nós/arestas ainda não existe (REST ou GraphQL — a decidir na implementação)

---

## 5. Lacunas

- Quem cria competências ao gerar trilha? Provavelmente o Planner — não decidido  
- Nenhuma semente real de competências no banco de uso  
- Sem API pública ainda

---

## 6. Quando implementar

Fase 3 do roadmap — depois de existir prática (exercícios) com dados reais de progresso.
