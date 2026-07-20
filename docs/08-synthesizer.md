# 08 — Synthesizer (Gerador de Conteúdo)

**Status:** ✅ geração implementada e testada.  
**Pendente:** `reviewer`, versionamento de regeneração, chunking automático para RAG.  
**Módulo:** `mindforge-api/src/modules/synthesizer`  
**Agente:** `synthesizer`  
**Tabelas:** `conteudos`, `conteudo_fontes` (associação ainda não escrita na geração)

---

## 1. Responsabilidade

Para um `modulo_trilha`, lê `fontes_pesquisa` (se existirem) e produz `conteudos.corpo_markdown` original, didático, em Markdown.

---

## 2. API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/synthesizer/conteudos` | Gera conteúdo |
| `GET` | `/synthesizer/modulos/:moduloId/conteudos` | Lista conteúdos do módulo |

### Entrada

```json
{
  "moduloId": "uuid",
  "topico": "Ownership em Rust",
  "nivelAlvo": "iniciante",
  "instrucoesExtras": "Incluir exemplos curtos"
}
```

### Saída (resumo)

```json
{
  "id": "uuid",
  "titulo": "...",
  "corpoMarkdown": "# ...",
  "status": "rascunho",
  "versao": 1,
  "resumo": "...",
  "palavrasChave": ["..."]
}
```

---

## 3. Fluxo alvo (design) vs atual

```text
fontes_pesquisa
      ↓ Synthesizer (✅)
conteudos.status = rascunho   (✅)
      ↓ Reviewer (⬜)
conteudos.status = revisado | rascunho
      ↓
publicado (⬜)
      ↓
chunking + embeddings (✅) → Biblioteca Viva (✅)
```

Hoje o conteúdo nasce como `rascunho`, é indexado automaticamente na Biblioteca Viva (chunking + embedding) e já pode ser lido/listado. Não há reviewer ainda.

---

## 4. Regras do agente

- Conteúdo autocontido
- Markdown semântico
- Exemplos + desafio mental opcional
- Não copiar fontes; reescrever
- JSON estrito com `titulo`, `corpoMarkdown`, `resumo`, `palavrasChave`

---

## 5. Lacunas conhecidas

- ~~Não grava `conteudo_fontes`~~ → ✅ agora grava ao gerar conteúdo
- ~~Não chama chunking/embedding após gerar~~ → ✅ indexação automática via Biblioteca Viva
- Não versiona regenerações (sempre `versao=1` no insert atual)
- `reviewer` ainda não existe como passo de QA
- Falha de indexação não bloqueia a criação do conteúdo (logada, mas silenciosa para o cliente) — ver `SynthesizerService.gerar`

## 6. Próximos passos

1. Agente `reviewer` antes de `publicado`
2. Regenerar com incremento de `versao`
3. Retornar erro de indexação de forma mais visível na resposta da API (hoje só loga)
