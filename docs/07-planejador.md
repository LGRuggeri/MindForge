# 07 — Planejador (Planner)

**Status:** ✅ implementado e testado.  
**Módulo:** `mindforge-api/src/modules/planner`  
**Agente:** `planner`  
**Tabelas:** `objetivos_estudo`, `trilhas_estudo`, `modulos_trilha`

---

## 1. Responsabilidade

Transforma um objetivo de estudo em trilha versionada com módulos ordenados.  
Define **o quê** estudar e **em que ordem**; não gera o material (isso é o Synthesizer).

---

## 2. API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/planner/objetivos` | Cria objetivo |
| `GET` | `/planner/objetivos/:id` | Busca objetivo (+ trilhas/módulos) |
| `GET` | `/planner/perfis/:perfilId/objetivos` | Lista objetivos do perfil |
| `POST` | `/planner/trilhas` | Gera trilha via LLM |

### Criar objetivo

```json
{
  "perfilId": "uuid",
  "titulo": "Aprender Rust",
  "descricao": "Ownership e borrow checker",
  "nivelDesejado": "iniciante",
  "prazoEstimado": "2026-08-31"
}
```

### Gerar trilha

```json
{ "objetivoId": "uuid" }
```

Saída: trilha + lista de módulos (`ordem`, `titulo`, `objetivoAprendizagem`, `tempoEstimadoMin`).

---

## 3. Regras do agente

- 3 a 8 módulos sequenciais
- Respeita nível desejado
- JSON estrito (sem markdown)
- Temperature 0.7

---

## 4. Versionamento (design + parcialmente no código)

- `trilhas_estudo.versao` e `status` (`ativa | concluida | substituida`) existem no schema.
- Implementação atual sempre cria trilha `ativa` versão 1 (ou a retornada pelo modelo).
- Replanejamento formal (marcar antiga como `substituida`) ainda é TODO.

---

## 5. Pontos em aberto

- Replanejamento a partir de avaliações ruins ou diário com dificuldades recorrentes.
- Usar `competencia_progresso` para não recomeçar do zero (Fase 3).
- Quantidade de módulos vs `tempo_disponivel_semanal_min` do perfil.

---

## 6. Próximos passos

- Endpoint de listagem de trilhas por objetivo
- Replanejar com versionamento real
- Opcional: fila assíncrona se latência do LLM incomodar
