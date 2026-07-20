# 09 — RAG e Biblioteca Viva

**Status:** ✅ pipeline mínimo implementado e validado ponta a ponta (chunking → embedding → indexação → busca).  
**Pendente:** Tutor consumindo RAG, indexação de `fontes_pesquisa` brutas.

---

## 1. Por que RAG

O Tutor precisa responder com o que *você* já estudou (módulos e trilhas anteriores), não só com o conhecimento geral do modelo. A Biblioteca Viva é esse repositório vivo.

---

## 2. Pipeline

```text
fontes_pesquisa     (Research ✅)
      ↓
conteudos           (Synthesizer ✅)
      ↓
chunking + embedding (✅ automático via SynthesizerService.gerar)
      ↓
conteudo_chunks     (schema + index HNSW ✅)
      ↓
busca cosseno       (Biblioteca Viva ✅)
      ↓
contexto no Tutor   (⬜)
```

---

## 3. O que existe no código

| Peça | Status |
|---|---|
| Schema `conteudo_chunks` + HNSW | ✅ |
| `BibliotecaVivaRepository` (similaridade + indexação em lote) | ✅ |
| `POST /biblioteca-viva/buscar` | ✅ |
| `EmbeddingService` (OpenAI-compatible, provider configurável) | ✅ |
| Chunker (`chunking.ts`) — 500–800 tokens / overlap 50–100 | ✅ |
| `BibliotecaVivaService.indexarTexto()` | ✅ |
| Chamado automaticamente pelo `SynthesizerService.gerar()` | ✅ |
| `conteudo_fontes` gravado ao gerar conteúdo | ✅ |
| Indexação de `fontes_pesquisa` brutas (não só `conteudos`) | ⬜ |
| Tutor montando prompt com chunks | ⬜ |

### Busca

```http
POST /biblioteca-viva/buscar
{ "consulta": "o que é ownership em Rust", "limite": 5 }
```

Score retornado como similaridade (`1 - cosineDistance`).

---

## 4. Chunking (implementado em `biblioteca-viva/chunking.ts`)

- Alvo: ~2400 caracteres por chunk (~600 tokens, aproximação 1 token ≈ 4 chars)
- Overlap: ~300 caracteres (~75 tokens) entre chunks consecutivos
- Quebra por parágrafos quando possível; fallback por tamanho com corte em fronteira de palavra/frase
- Textos curtos (≤ alvo) geram um único chunk, sem overlap

Validado com texto real (~4.400 caracteres) → 2 chunks (2281 e 675 chars).

---

## 5. Provedor de embeddings: decisão ADR-016

O gateway de chat usado pelos agentes (`OPENAI_BASE_URL`, OpenCode Go) **não expõe `/embeddings`** (404). Por isso o `EmbeddingService` aceita configuração **separada**:

```env
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_BASE_URL=http://localhost:11434/v1   # Ollama local, endpoint OpenAI-compatible
EMBEDDING_API_KEY=ollama-local                  # qualquer valor não vazio; Ollama não valida
```

Se `EMBEDDING_BASE_URL`/`EMBEDDING_API_KEY` não forem definidos, cai no fallback de `OPENAI_BASE_URL`/`LLM_API_KEY` (comportamento anterior, útil se o provedor de chat também servir embeddings).

**Dimensão do vetor:** `nomic-embed-text` retorna **768** dimensões (não 1536 como `text-embedding-3-small`). `conteudo_chunks.embedding` foi migrado para `vector(768)` (migration `0002_daily_jane_foster.sql`). Trocar de modelo de embedding no futuro exige nova migration.

---

## 6. Validação realizada (sem depender do LLM de chat)

Como o provedor de chat estava indisponível no momento do teste (OpenCode Go com limite semanal esgotado; modelo local Ollama de 36B sem VRAM suficiente), o pipeline foi validado inserindo dados via SQL direto (perfil → objetivo → trilha → módulo → conteúdo) e chamando `BibliotecaVivaService.indexarTexto()` diretamente:

```
Chunks indexados: 2 em 2073ms
  [0] ordem=0 tamanho=2281 chars, dim embedding=768
  [1] ordem=1 tamanho=675 chars, dim embedding=768

Busca "O que é ownership em Rust?" → similaridade=0.8129 (chunk relevante)
Busca "Receita de bolo de chocolate" → similaridade=0.4510 (não relacionado)
```

A diferença de similaridade (0.81 vs 0.45) confirma que a busca vetorial discrimina corretamente.

---

## 7. Próximo passo concreto

1. Implementar `TutorService` usando `BibliotecaVivaService.buscar` + agente `teacher`
2. Indexar trechos de `fontes_pesquisa` brutas (hoje só `conteudos` é indexado)
3. Quando o limite do provedor de chat resetar (ou outro provedor for configurado), validar o fluxo HTTP completo `research → synthesizer → biblioteca-viva` de ponta a ponta
