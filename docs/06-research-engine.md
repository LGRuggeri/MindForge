# 06 — Research Engine

**Status:** ✅ implementado; procedência validada com testes de serviço, interface e PostgreSQL em 14/09/2026.
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
  "limite": 4,
  "webSearch": true
}
```

- `moduloId` obrigatório  
- `topico` opcional (default: título do módulo)  
- `limite` opcional 1–12 (default: 5)
- `webSearch` opcional: habilita busca externa; sem ele, indicações ficam sem URLs confirmadas
- `async` opcional: enfileira a pesquisa e retorna `jobId`

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
      "url": "https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html",
      "origem": "busca_web",
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
├── fontes-pesquisa.ts      # contrato da IA e correspondência de URLs
├── research.repository.ts  # Drizzle apenas aqui
├── web-search.service.ts   # seleciona DuckDuckGo, API genérica ou Serper
└── dto/pesquisar.dto.ts
```

- Tipos válidos: `documentacao_oficial | livro | artigo | video | outro`
- Score estimado pela IA, limitado a 0–1 e persistido como `numeric`; ausência fica `null`. Não comprova confiabilidade factual.
- URL só é mantida se corresponder a um resultado web desta pesquisa; caso contrário fica `null`. `autor` também pode ser `null`.

---

## 4. Limitações deliberadas

- Execução síncrona ou assíncrona com `async: true` via pg-boss.
- As páginas não são abertas ou verificadas integralmente; os resumos são gerados pelo LLM com o contexto da busca.

## 5. Web search real (opcional)

O Research Engine pode enriquecer a curadoria com resultados reais da web usando DuckDuckGo HTML (sem API key).

- Ative com `{ "webSearch": true }` no `POST /research/fontes`.
- O serviço `WebSearchService` busca até 10 resultados e os envia ao agente `researcher` como contexto.
- O LLM sugere e classifica fontes; o código valida a estrutura da resposta e a correspondência das URLs.
- Se o provider de busca falhar ou não retornar resultados utilizáveis, a pesquisa continua com sugestões da IA sem URLs. Erros de IA ou persistência ainda podem encerrar a requisição.

### Entrada com web search

```json
{
  "moduloId": "uuid",
  "topico": "Ownership em Rust",
  "limite": 5,
  "webSearch": true
}
```

### Saída

```json
{
  "moduloId": "...",
  "topico": "Ownership em Rust",
  "estrategia": "...",
  "fontes": [...],
  "resultadosWeb": 8
}
```

**Fontes suportadas:** qualquer domínio indexado pelo DuckDuckGo. O parser extrai título, URL, domínio e resumo do HTML de resultados.

## 6. Integração validada

```text
POST /research/fontes  → 4 fontes salvas
POST /research/fontes (webSearch: true) → fontes salvas com contexto web real
GET  /research/modulos/:id/fontes
POST /synthesizer/conteudos  → usa as fontes do módulo
```

## 7. Próximos passos

- Indexar trechos de fontes em `conteudo_chunks` (fonte_id)
- Fallback para múltiplos motores de busca (Bing, Google Programmable Search) se DuckDuckGo se tornar instável


## 8. Procedência das fontes (14/09/2026)

Migration `0013_fontes_origem.sql` adiciona `origem` com CHECK e default `legado`:

| Origem | Significado |
|---|---|
| `busca_web` | URL HTTP/HTTPS sem credenciais corresponde a um endereço retornado nesta busca |
| `sugestao_ia` | Indicação sem correspondência; persistida sem URL, inclusive com busca desativada/falha |
| `legado` | Registro anterior; não recebe validação retroativa |

A comparação usa URL canônica, remove fragmentos e preserva query/caminho. Não considera páginas diferentes do mesmo domínio equivalentes. Entradas duplicadas são removidas e o limite solicitado é respeitado. O campo `resultadosWeb` conta endereços válidos e únicos disponíveis para a curadoria, não quantas fontes foram escolhidas.

A interface identifica a origem em resultados e fontes salvas, mostra o score como estimativa da IA e não transforma URLs legadas de protocolos inseguros em links. O Synthesizer também recebe essa distinção. Encontrar o link não certifica autor, resumo, classificação ou conteúdo da página.

Validação deste marco não fez chamadas a motores de busca/LLM externos: respostas determinísticas simulam os casos de contrato, falhas e URLs inventadas. PostgreSQL real verificou a migration, preservação de legado, CHECK e gravação/listagem das origens.


## 9. Contratos dos providers e timeout (14/09/2026)

Selecione o motor com `SEARCH_PROVIDER`: `duckduckgo` (padrão), `api` (Bearer) ou `serper` (`X-API-KEY`). Os dois providers JSON enviam `{ q, num }` a `SEARCH_API_URL` e aceitam listas em `organic`, `results` ou `web.results`. Títulos e URLs precisam ser strings válidas; campos opcionais de tipos incorretos são ignorados. Links HTTP/HTTPS sem credenciais e resultados únicos são selecionados antes de aplicar o limite.

DuckDuckGo extrai o destino do parâmetro `uddg` em links relativos ou absolutos, sem decodificá-lo duas vezes. Também aceita variações na ordem dos atributos e nas aspas do HTML. Continua dependente do formato da página pública; os testes não certificam a disponibilidade atual do serviço externo.

`SEARCH_TIMEOUT_MS` limita cada requisição de busca: padrão de 10.000 ms, inteiro de 1 a 60.000, validado no startup. Falhas HTTP, rede, leitura de JSON e cancelamento seguem o fallback existente para sugestões da IA. Logs dos providers registram contagem ou falha genérica/status, sem consulta nem detalhes privados do transporte.

O contrato HTTP rejeita UUID inválido na listagem e entradas inválidas em `PesquisarDto` antes de chamar serviços. Os testes de composição exercitam o módulo Nest real e a factory usada pelo worker, com fila e IA simuladas; os testes SQL verificam contexto módulo → trilha → objetivo e isolamento da listagem em tabelas temporárias.

O lote 3 validou o pg-boss real e corrigiu a saída do processamento: `GET /jobs/research.pesquisar/:id` devolve `resultado` com `moduloId`, `resultadosWeb` e `fontes` (ID e origem) quando concluído. Entrada, prompts e erro bruto não são expostos. Resultados antigos/ausentes e estados não concluídos retornam `resultado: null`. Contrato completo em [Jobs e erros HTTP](16-jobs.md).
