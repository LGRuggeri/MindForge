# 06 — Research Engine

**Status:** ✅ implementado e testado de ponta a ponta.  
**Módulo:** `mindforge-api/src/modules/research`  
**Agente:** `researcher`  
**Tabela:** `fontes_pesquisa`

---

## 1. Responsabilidade

Curar fontes confiáveis para um módulo e gravá-las em `fontes_pesquisa`, alimentando o Synthesizer (e, no futuro, a Biblioteca Viva).

Prioridade (filosofia do projeto):

1. Documentação oficial  
2. Livros técnicos  
3. Artigos  
4. Vídeos  
5. Outros  

---

## 2. API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/research/fontes` | Pesquisa e grava fontes |
| `GET` | `/research/modulos/:moduloId/fontes` | Lista fontes do módulo |

### Entrada

```json
{
  "moduloId": "uuid",
  "topico": "Ownership em Rust",
  "limite": 4
}
```

- `moduloId` obrigatório  
- `topico` opcional (default: título do módulo)  
- `limite` opcional 1–12 (default: 5)

### Saída (resumo)

```json
{
  "moduloId": "...",
  "topico": "Ownership em Rust",
  "estrategia": "Priorizar documentação oficial...",
  "fontes": [
    {
      "tipo": "documentacao_oficial",
      "titulo": "The Rust Programming Language - Understanding Ownership",
      "url": "...",
      "confiabilidadeScore": "1.00",
      "resumo": "..."
    }
  ]
}
```

---

## 3. Implementação

```
research/
├── research.module.ts
├── research.controller.ts
├── research.service.ts      # prompt + normalização + AgentesService
├── research.repository.ts  # Drizzle apenas aqui
└── dto/pesquisar.dto.ts
```

- Tipos válidos: `documentacao_oficial | livro | artigo | video | outro`
- Score clampado em 0–1 e persistido como `numeric`
- URL/`autor` podem ser `null` se o modelo não tiver certeza

---

## 4. Limitações deliberadas

- Curadoria baseada no conhecimento do LLM (não scraping/search API ao vivo).
- Request síncrona (ok para uso pessoal; migrar para `pg-boss` se latência ou search web real entrarem).

---

## 5. Integração validada

```text
POST /research/fontes  → 4 fontes salvas
GET  /research/modulos/:id/fontes
POST /synthesizer/conteudos  → usa as fontes do módulo
```

## 6. Próximos passos

- Search web real (opcional)
- Indexar trechos de fontes em `conteudo_chunks` (fonte_id)
- Job assíncrono se o pipeline ficar pesado
