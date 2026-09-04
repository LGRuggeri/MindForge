# MindForge — Documentação

**Fonte única de verdade.**  
Atualizado em 2026-08-23 após implementação de workers assíncronos no `pg-boss`, abstração de providers de web search e fallback de provedores LLM.

## Como usar

- Núcleo (`00`–`04`): decisões de produto e base técnica.
- Módulos (`05`–`12`): design + **status real de implementação**.
- Planejamento (`13`–`14`): roadmap e ADRs.
- Código: `../mindforge-api`.

## Índice

| Doc | Tema | Status real |
|---|---|---|
| [00-visao.md](00-visao.md) | O que é o MindForge | vigente |
| [01-filosofia.md](01-filosofia.md) | Princípios de design | vigente |
| [02-arquitetura.md](02-arquitetura.md) | Módulos e fluxo de dados | vigente |
| [03-stack-tecnologica.md](03-stack-tecnologica.md) | Stack e decisões de tooling | vigente |
| [04-modelagem-dados.md](04-modelagem-dados.md) | Schema Postgres + pgvector | vigente |
| [05-agentes-ia.md](05-agentes-ia.md) | Contrato dos agentes | parcialmente implementado |
| [06-research-engine.md](06-research-engine.md) | Research Engine | ✅ implementado: curadoria por LLM + web search real opcional via DuckDuckGo |
| [07-planejador.md](07-planejador.md) | Planner | ✅ implementado |
| [08-synthesizer.md](08-synthesizer.md) | Synthesizer | ✅ implementado: geração + reviewer + `conteudo_fontes` + chunking |
| [09-rag-biblioteca-viva.md](09-rag-biblioteca-viva.md) | RAG + Biblioteca Viva | ✅ implementado |
| [10-diario.md](10-diario.md) | Diário de Aprendizagem | ✅ implementado (registro manual + teacher) |
| [11-avaliacoes.md](11-avaliacoes.md) | Exercícios e Avaliações | ✅ implementado |
| [12-knowledge-graph.md](12-knowledge-graph.md) | Knowledge Graph | ✅ implementado |
| [13-roadmap.md](13-roadmap.md) | Roadmap por fases | vigente |
| [14-decisoes-arquiteturais.md](14-decisoes-arquiteturais.md) | ADRs | vigente |

## Matriz de implementação (backend)

| Módulo API | Agente | Status | Rotas principais |
|---|---|---|---|
| `perfil` | — | ✅ | `POST/GET /perfis` |
| `planner` | `planner` | ✅ | `POST /planner/objetivos`, `GET /planner/objetivos/:id`, `GET /planner/perfis/:id/objetivos`, `POST /planner/trilhas`, `GET /planner/modulos/:id` |
| `research` | `researcher` | ✅ implementado: curadoria por LLM + web search real (DuckDuckGo ou API) + async via `pg-boss` | `POST /research/fontes` (aceita `webSearch?: boolean`, `async?: boolean`), `GET /research/modulos/:id/fontes` |
| `synthesizer` | `synthesizer` + `reviewer` | ✅ geração + revisão automática + `conteudo_fontes` + chunking | `POST /synthesizer/conteudos`, `GET /synthesizer/modulos/:id/conteudos` |
| `diario` | `teacher` | ✅ | `POST /diario`, `GET /diario/perfis/:id` |
| `agentes` | orquestração | ✅ | logging em `agentes_execucoes` |
| `jobs` | — | ✅ `pg-boss` sobe e conecta | interno |
| `exercicios-avaliacoes` | `evaluator` | ✅ geração + correção + avaliações compostas + revisão espaçada SM-2 | `POST /exercicios-avaliacoes/exercicios/gerar`, `POST /exercicios-avaliacoes/exercicios/:id/tentativas`, `GET /exercicios-avaliacoes/exercicios?moduloId=`, `GET /exercicios-avaliacoes/exercicios/:id/estatisticas`, `POST /exercicios-avaliacoes/avaliacoes`, `POST /exercicios-avaliacoes/avaliacoes/submeter`, `GET /exercicios-avaliacoes/revisao?data=` |
| `tutor` | `teacher` | ✅ implementado: `teacher` + `agent-kb` + contexto contínuo | `POST /tutor/duvidas`, `POST /tutor/duvidas/:id/avaliar`, `GET /tutor/perfis/:perfilId/historico` |
| `knowledge-graph` | — | ✅ implementado: competências, relações, progresso, extração no Planner/Synthesizer | `GET /knowledge-graph/perfis/:perfilId`, `GET /knowledge-graph/competencias/:id/cadeia`, `POST /knowledge-graph/competencias/:id/progresso` |

## Fluxo validado de ponta a ponta

```text
POST /perfis
  → POST /planner/objetivos
  → POST /planner/trilhas
  → POST /research/fontes
  → POST /synthesizer/conteudos
  → POST /diario
  → POST /tutor/duvidas
  → POST /exercicios-avaliacoes/exercicios/gerar
  → POST /exercicios-avaliacoes/avaliacoes
  → GET /knowledge-graph/perfis/:perfilId
```

## Frontend

Implementado em `../mindforge-web/`:

| Página | Funcionalidade |
|---|---|
| `/` | Dashboard com resumo de objetivos, revisões e próximos passos |
| `/perfis` | Criar e selecionar perfil |
| `/objetivos` | Criar objetivos de aprendizado |
| `/objetivos/[id]` | Visualizar objetivo, gerar/regenerar trilha e listar módulos |
| `/modulos/[id]` | Estudar conteúdo, gerar conteúdo/exercícios e submeter respostas |
| `/tutor` | Conversar com o tutor IA (RAG) |
| `/revisao` | Revisões pendentes e agendadas |
| `/knowledge-graph` | Competências e próximos passos do perfil |

Stack: Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui + TanStack Query + Zustand.

## Próximo passo recomendado

Ver [13-roadmap.md](13-roadmap.md): backend completo e frontend do loop mínimo implementados. Visualização React Flow do grafo já implementada. Próximos: simulados multi-módulo, projetos inteligentes e autenticação (se necessário).

## Infra local

- API: `http://localhost:3000` (`mindforge-api`)
- Postgres (Docker): porta **5433** (evita conflito com PostgreSQL nativo na 5432)
- `DATABASE_URL=postgres://postgres:***@localhost:5433/mindforge`

## O que foi unificado / removido

| Origem | Destino |
|---|---|
| `learning-os-docs/docs/*` | este diretório `docs/` |
| `05-agente-conteudo.md` (raiz) | fundido em `05-agentes-ia.md` + `08-synthesizer.md` + `10-diario.md` |
| `06-research-engine.md` (raiz) | `06-research-engine.md` |
| `12/13/14` duplicados na raiz | `10-diario`, `13-roadmap`, `14-decisoes` |
| status “TODO” desatualizado nos docs antigos | atualizado para o código real |
| numeração confusa (dois “06”) | renumerada e estável |

## Nota operacional: provedores de IA

- **Chat** (Planner/Research/Synthesizer/Diário): OpenCode Go (`OPENAI_BASE_URL`) por padrão. Sujeito a limite semanal de uso por conta. Fallback configurável via `LLM_FALLBACK_BASE_URLS`/`LLM_FALLBACK_API_KEYS`/`LLM_FALLBACK_MODELS` para provedores compatíveis com OpenAI (Groq, Ollama, OpenRouter etc). Ver ADR-019 em [14-decisoes-arquiteturais.md](14-decisoes-arquiteturais.md).
- **Embeddings** (Biblioteca Viva): provedor separado, hoje **Ollama local** (`nomic-embed-text`, 768 dim) — o gateway de chat não expõe `/embeddings`. Ver ADR-016 em [14-decisoes-arquiteturais.md](14-decisoes-arquiteturais.md).
- **Web search**: DuckDuckGo gratuito por padrão (`SEARCH_PROVIDER=duckduckgo`); para maior estabilidade, usar `SEARCH_PROVIDER=api` com `SEARCH_API_URL`/`SEARCH_API_KEY` (Serper, Tavily, Brave etc). Ver ADR-017 e ADR-018 em [14-decisoes-arquiteturais.md](14-decisoes-arquiteturais.md).
