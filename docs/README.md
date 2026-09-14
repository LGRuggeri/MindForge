# MindForge — Documentação

**Fonte única de verdade.**  
Atualizado em 14/09/2026: 719 testes aprovados com SQL, 84 no frontend e 15 cenários reais de Docker. Quatro métricas do backend acima de 80%. O resultado do simulado agora inclui [feedback por exercício após finalizar](plano-feedback-simulado-2026-09-14.md). CI publicado pela [PR #11](https://github.com/LGRuggeri/Mindforge/pull/11), ainda aberta para revisão; execuções e correção do diagnóstico de memória estão registradas em [CI do backend](19-ci-backend.md). O check obrigatório está bloqueado pelo plano atual da conta para este repositório privado.

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
| [plano-cobertura-80-2026-09-14.md](plano-cobertura-80-2026-09-14.md) | Cobertura global ≥80%: baseline, seis lotes e critérios | seis lotes implementados e validados localmente; ativação remota do CI pendente |
| [15-projetos.md](15-projetos.md) | Projetos Inteligentes | ✅ implementado |
| [16-jobs.md](16-jobs.md) | Jobs e erros HTTP | ✅ execução, retry, saída pública e cancelamento validados |
| [17-midia-agent-kb.md](17-midia-agent-kb.md) | Mídia e integração Agent KB | ✅ frames, cache, subprocesso e contratos HTTP validados |
| [18-persistencia-testes.md](18-persistencia-testes.md) | Persistência, transações e concorrência | ✅ rollback, escopo, cascatas e disputas em duas conexões validados |
| [19-ci-backend.md](19-ci-backend.md) | CI, migrations em banco vazio e inicialização | ✅ local e GitHub aprovados; PR #11 aberta; check obrigatório depende do plano GitHub |
| [20-sandbox.md](20-sandbox.md) | Execução local de Python/JavaScript | ✅ módulos e simulados, limites e isolamento validados em Docker real |
| [plano-sandbox-2026-09-14.md](plano-sandbox-2026-09-14.md) | Plano e validação do sandbox | ✅ incremento local concluído |
| [plano-geracao-resultados-2026-09-14.md](plano-geracao-resultados-2026-09-14.md) | Geração e resultados de simulados | ✅ ações persistentes, consulta por perfil e recuperação após recarregar |

## Matriz de implementação (backend)

| Módulo API | Agente | Status | Rotas principais |
|---|---|---|---|
| `perfil` | — | ✅ | `POST/GET /perfis` |
| `sandbox` | — | ✅ execução local isolada; ativação explícita | `POST /sandbox/exercicios/:id/executar` |
| `planner` | `planner` | ✅ | `POST /planner/objetivos`, `GET /planner/objetivos/:id`, `GET /planner/perfis/:id/objetivos`, `POST /planner/trilhas`, `GET /planner/modulos/:id` |
| `research` | `researcher` | ✅ implementado: curadoria por LLM + web search real (DuckDuckGo ou API) + async via `pg-boss` | `POST /research/fontes` (aceita `webSearch?: boolean`, `async?: boolean`), `GET /research/modulos/:id/fontes` |
| `synthesizer` | `synthesizer` + `reviewer` | ✅ geração + revisão automática + `conteudo_fontes` + chunking | `POST /synthesizer/conteudos`, `GET /synthesizer/modulos/:id/conteudos` |
| `diario` | `teacher` | ✅ | `POST /diario`, `GET /diario/perfis/:id` |
| `agentes` | orquestração | ✅ | logging em `agentes_execucoes` |
| `jobs` | — | ✅ ciclo real, retry, saída pública do Research e cancelamento validados | `GET /jobs/filas`, `GET /jobs/:nome/:id`, `GET /jobs/:nome/:id/estado`, `DELETE /jobs/:nome/:id` |
| `exercicios-avaliacoes` | `evaluator` | ✅ geração + correção + avaliações compostas + simulados multi-módulo + revisão espaçada SM-2 | `POST /exercicios-avaliacoes/exercicios/gerar`, `POST /exercicios-avaliacoes/exercicios/:id/tentativas`, `GET /exercicios-avaliacoes/exercicios?moduloId=`, `GET /exercicios-avaliacoes/exercicios/:id/estatisticas`, `POST /exercicios-avaliacoes/avaliacoes`, `POST /exercicios-avaliacoes/avaliacoes/submeter`, `GET /exercicios-avaliacoes/avaliacoes/:id`, `GET /exercicios-avaliacoes/revisao?data=` |
| `projetos` | `evaluator` | ✅ projetos práticos gerados por IA com entregas e feedback iterativo | `POST /projetos`, `POST /projetos/gerar`, `GET /projetos?moduloId=`, `GET /projetos/:id`, `POST /projetos/:id/entregas`, `POST /projetos/:id/concluir` |
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
| `/revisao` | Agenda, consulta do material, autoavaliação de lembrança e reagendamento SM-2 |
| `/knowledge-graph` | Competências e próximos passos do perfil |

Stack: Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui + TanStack Query + Zustand.

## Próximo passo recomendado

Revisar e integrar a [PR #11](https://github.com/LGRuggeri/Mindforge/pull/11), cujo CI foi aprovado; resolver a disponibilidade de proteção de branch no plano da conta para tornar o check obrigatório. Depois, validar os fluxos com os provedores configurados no ambiente pessoal. O [sandbox local](20-sandbox.md) foi concluído; novas linguagens, casos de teste automáticos e ambiente multiusuário exigem planejamento próprio. Autenticação permanece adiada para o uso pessoal local.

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
