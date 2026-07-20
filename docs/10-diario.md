# 10 — Diário de Aprendizagem

**Status:** ✅ implementado (registro manual + recomendações via `teacher`).  
**Módulo:** `mindforge-api/src/modules/diario`  
**Tabelas:** `diario_aprendizagem`, `diario_modulos`

---

## 1. Responsabilidade

Um registro por dia (`UNIQUE (perfil_id, data)`): tempo, módulos, dificuldades, conquistas e recomendações da IA. É o log de *como* foi estudar, não só *o que* foi estudado.

---

## 2. API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/diario` | Cria registro e gera recomendações |
| `GET` | `/diario/perfis/:perfilId` | Lista diários do perfil |

### Entrada

```json
{
  "perfilId": "uuid",
  "data": "2026-07-17",
  "tempoInvestidoMin": 45,
  "dificuldades": "Chunking ainda confuso",
  "conquistas": "Entendi embeddings",
  "moduloIds": ["uuid"]
}
```

### Saída (campos extras da IA)

- `recomendacoesIa`
- `proximoFoco`
- `ajustesSugeridos[]`

---

## 3. Decisão de agente

Recomendações usam o agente **`teacher`** (não foi criado um sexto agente).  
Isso fecha o ponto em aberto do design antigo (`05-agentes-ia` original).

---

## 4. Design futuro (ainda não feito)

| Ideia | Status |
|---|---|
| Job diário consolidando atividade automática | ⬜ |
| Inferir tempo/dificuldades de tentativas/exercícios | ⬜ |
| `GET /diario/streak` | ⬜ |
| Dificuldades como tags de competências | ⬜ (não priorizar agora) |

Abordagem atual: **input do usuário na API** — simples e suficiente para uso pessoal.

---

## 5. Uso posterior

O diário deve alimentar:

- replanejamento do Planner (dificuldades recorrentes)
- recomendações do Tutor
- (futuro) sinais para Knowledge Graph

---

## 6. Validado

Fluxo real testado: criar perfil → trilha → `POST /diario` com módulo → recomendações coerentes retornadas e persistidas.
