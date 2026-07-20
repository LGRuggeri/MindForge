# MindForge — Documentação

**Fonte única de verdade.**  
Atualizado em 2026-07-17 após consolidação de `learning-os-docs` + docs da raiz + implementação real em `mindforge-api`.

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
| [06-research-engine.md](06-research-engine.md) | Research Engine | ✅ implementado |
| [07-planejador.md](07-planejador.md) | Planner | ✅ implementado |
| [08-synthesizer.md](08-synthesizer.md) | Synthesizer | ✅ implementado (sem reviewer/chunking) |
| [09-rag-biblioteca-viva.md](09-rag-biblioteca-viva.md) | RAG + Biblioteca Viva | parcialmente implementado |
| [10-diario.md](10-diario.md) | Diário de Aprendizagem | ✅ implementado (registro manual + teacher) |
| [11-avaliacoes.md](11-avaliacoes.md) | Exercícios e Avaliações | ⬜ esqueleto |
| [12-knowledge-graph.md](12-knowledge-graph.md) | Knowledge Graph | ⬜ esqueleto |
| [13-roadmap.md](13-roadmap.md) | Roadmap por fases | vigente |
| [14-decisoes-arquiteturais.md](14-decisoes-arquiteturais.md) | ADRs | vigente |

## Matriz de implementação (backend)

| Módulo API | Agente | Status | Rotas principais |
|---|---|---|---|
| `perfil` | — | ✅ | `POST/GET /perfis` |
| `planner` | `planner` | ✅ | `POST /planner/objetivos`, `POST /planner/trilhas` |
| `research` | `researcher` | ✅ | `POST /research/fontes`, `GET /research/modulos/:id/fontes` |
| `synthesizer` | `synthesizer` | ✅ | `POST /synthesizer/conteudos` |
| `diario` | `teacher` | ✅ | `POST /diario`, `GET /diario/perfis/:id` |
| `biblioteca-viva` | — | ✅ busca + chunking + embeddings (Ollama local) | `POST /biblioteca-viva/buscar` |
| `agentes` | orquestração | ✅ | logging em `agentes_execucoes` |
| `jobs` | — | ✅ `pg-boss` sobe e conecta | interno |
| `tutor` | `teacher` | ⬜ esqueleto | — |
| `exercicios-avaliacoes` | `evaluator` | ⬜ esqueleto | — |
| `knowledge-graph` | — | ⬜ esqueleto | — |
| reviewer / chunking / revisão espaçada | `reviewer` | ⬜ | — |

## Fluxo validado de ponta a ponta

```text
POST /perfis
  → POST /planner/objetivos
  → POST /planner/trilhas
  → POST /research/fontes
  → POST /synthesizer/conteudos
  → POST /diario
```

## Infra local

- API: `http://localhost:3000` (`mindforge-api`)
- Postgres (Docker): porta **5433** (evita conflito com PostgreSQL nativo na 5432)
- `DATABASE_URL=postgres://postgres:postgres@localhost:5433/mindforge`

## O que foi unificado / removido

| Origem | Destino |
|---|---|
| `learning-os-docs/docs/*` | este diretório `docs/` |
| `05-agente-conteudo.md` (raiz) | fundido em `05-agentes-ia.md` + `08-synthesizer.md` + `10-diario.md` |
| `06-research-engine.md` (raiz) | `06-research-engine.md` |
| `12/13/14` duplicados na raiz | `10-diario`, `13-roadmap`, `14-decisoes` |
| status “TODO” desatualizado nos docs antigos | atualizado para o código real |
| numeração confusa (dois “06”) | renumerada e estável |

## Próximo passo recomendado

Ver [13-roadmap.md](13-roadmap.md): **chunking + indexação** já implementados e validados (ver [09-rag-biblioteca-viva.md](09-rag-biblioteca-viva.md)). Próximo: **Tutor IA com RAG**.

## Nota operacional: provedores de IA

- **Chat** (Planner/Research/Synthesizer/Diário): OpenCode Go (`OPENAI_BASE_URL`). Sujeito a limite semanal de uso por conta.
- **Embeddings** (Biblioteca Viva): provedor separado, hoje **Ollama local** (`nomic-embed-text`, 768 dim) — o gateway de chat não expõe `/embeddings`. Ver ADR-016 em [14-decisoes-arquiteturais.md](14-decisoes-arquiteturais.md).
