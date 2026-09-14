# 09 — RAG e Biblioteca Viva

**Status:** ✅ pipeline mínimo implementado e validado ponta a ponta (chunking → embedding → indexação → busca).  
**Pendente:** coleta e indexação automática do conteúdo completo de fontes externas. O Tutor já consome RAG por módulo; indexação manual por `fonteId` está disponível.

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
contexto no Tutor   (✅ por módulo)
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
| Indexação de texto fornecido pelo chamador com `fonteId` | ✅ |
| Coleta/indexação automática de páginas externas | ⬜ |
| Tutor montando prompt com chunks do módulo | ✅ |

### Busca

```http
POST /biblioteca-viva/buscar
{ "consulta": "o que é ownership em Rust", "limite": 5 }
```

Score retornado como similaridade (`1 - cosineDistance`).

---

## 4. Chunking (implementado em `biblioteca-viva/chunking.ts`)

- Limite: 2.400 unidades UTF-16 por chunk (~600 tokens; aproximação, não contagem por tokenizer)
- Overlap: 300 unidades UTF-16 (301 se necessário para manter pares substitutos intactos)
- Prefere parágrafos, linhas e palavras na metade final da janela; fallback por tamanho. Cada janela avança sem gerar trechos minúsculos repetidos. Preserva indentação, espaços internos e pares UTF-16.
- Textos curtos (≤ alvo) geram um único chunk, sem overlap

Os tamanhos do teste histórico abaixo antecedem o chunker atual. Em 14/09/2026 foram adicionados testes de reconstrução integral do texto, Unicode, limites e separadores esparsos.

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

1. Ampliar validação da integração com provedores reais quando necessário; Tutor com RAG já está implementado
2. Automatizar a coleta do conteúdo de fontes externas; a API já aceita texto com `fonteId`
3. Quando o limite do provedor de chat resetar (ou outro provedor for configurado), validar o fluxo HTTP completo `research → synthesizer → biblioteca-viva` de ponta a ponta


## 8. Contratos e testes do lote de cobertura (14/09/2026)

- Embedding deve conter exatamente um vetor, índice zero, 768 números finitos e ao menos um componente não zero. Formato inválido ou erro do provider gera 502 sem detalhes privados. Modelos com outra dimensão não são compatíveis com o schema atual.
- Indexação exige exatamente um de `conteudoId` ou `fonteId`, também no modo assíncrono. Falha ao obter job gera 503; texto vazio síncrono não chama o provedor.
- Geração de todos os vetores antecede a inserção em lote: uma falha intermediária não persiste chunks parciais.
- 52 testes focados passam, incluindo HTTP com módulo Nest real e SQL/pgvector em tabelas temporárias. Cobertura do grupo: 100% nas quatro métricas. Suíte global completa: 384 testes, cobertura de linhas em 71,50%.
- Validação determinística, com provider simulado; nenhum material histórico foi reindexado e não foi necessária migration. O plano completo está em [cobertura global](plano-cobertura-80-2026-09-14.md).
