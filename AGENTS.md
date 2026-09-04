# MindForge — Guia para Agentes de Código

Este arquivo é a referência rápida para qualquer agente de IA que vá trabalhar no repositório MindForge. Leia-o antes de fazer mudanças. A linguagem principal dos comentários, documentação e mensagens de erro do projeto é o **português**; artefatos escritos para o repositório devem seguir essa convenção.

## 1. Visão geral do projeto

MindForge é uma plataforma pessoal de estudo guiada por IA. O usuário informa um objetivo de aprendizado e o sistema:

1. Cria uma trilha de estudo (Planner).
2. Pesquisa fontes de conteúdo, com busca web real opcional (Research Engine).
3. Sintetiza o material didático (Synthesizer + Reviewer).
4. Responde dúvidas via RAG (Tutor IA).
5. Gera exercícios e avaliações com correção automática.
6. Registra progresso, diário de aprendizagem e um grafo de competências pessoal.

Este repositório contém **apenas o backend** (`mindforge-api/`) e a documentação (`docs/`). O front-end é documentado como Next.js + Tailwind + shadcn/ui, mas ainda não existe no repositório.

## 2. Layout do repositório

```text
MindForge/
├── docs/                       # Documentação única de verdade (em português)
│   ├── 00-visao.md
│   ├── 02-arquitetura.md
│   ├── 03-stack-tecnologica.md
│   ├── 04-modelagem-dados.md
│   └── ...
├── mindforge-api/              # Backend NestJS + Drizzle + PostgreSQL/pgvector
│   ├── src/
│   │   ├── main.ts             # bootstrap, ValidationPipe global, filtro RFC 7807
│   │   ├── app.module.ts       # composição dos módulos de domínio
│   │   ├── config/             # validação de env com Zod
│   │   ├── database/           # DatabaseModule + schema + migrations
│   │   ├── common/filters/     # ProblemDetailsFilter (RFC 7807)
│   │   ├── jobs/               # fila pg-boss + handlers
│   │   └── modules/            # módulos de domínio
│   ├── .env.example            # modelo de variáveis de ambiente
│   ├── docker-compose.yml      # sobe Postgres 17 + pgvector na porta 5433
│   ├── drizzle.config.ts       # configuração do Drizzle Kit
│   ├── package.json            # scripts e dependências
│   ├── tsconfig.json           # build com strict=true
│   ├── tsconfig.spec.json      # config de testes
│   ├── jest.config.js          # Jest + ts-jest
│   └── eslint.config.js        # ESLint flat config + Prettier
└── archive/                    # arquivos históricos
```

## 3. Stack tecnológica

- **Runtime**: Node.js 20+
- **Framework**: NestJS 11 (REST; GraphQL planejado na documentação)
- **Linguagem**: TypeScript 6.x (strict, decorators, reflect-metadata)
- **ORM**: Drizzle ORM 0.45.x
- **Banco**: PostgreSQL 17 com extensão `pgvector`
- **Fila**: pg-boss 12.x sobre o próprio Postgres
- **Validação**: Zod (env) + class-validator/class-transformer (DTOs)
- **Cliente LLM**: SDK `openai` (OpenAI-compatible), usado com OpenCode Go por padrão
- **Embeddings**: provedor separável; em desenvolvimento usa Ollama local (`nomic-embed-text`, 768 dim)
- **Testes**: Jest 30 + ts-jest + @nestjs/testing
- **Lint/Format**: ESLint 10 (flat config) + Prettier 3

## 4. Convenções de organização do código

### Padrão de módulo

Cada domínio em `src/modules/<dominio>/` segue a estrutura fixa:

```text
<dominio>.module.ts
<dominio>.controller.ts
<dominio>.service.ts
<dominio>.repository.ts
dto/
```

- **Controller**: rotas HTTP, DTOs de entrada e status codes.
- **Service**: regras de negócio. **Nunca importa `drizzle-orm` diretamente.**
- **Repository**: único ponto que importa `drizzle-orm` e executa queries.
- **DTO**: classes com decoradores do `class-validator` + `class-transformer`.

Essa divisão é intencionalmente pragmática (sem hexagonal completo). O serviço depende do repositório, não do ORM, o que já isola a troca futura de ORM num único arquivo.

### Outras regras de estilo

- Nome de arquivos/módulos em português quando representam domínio do negócio (`perfil`, `planner`, `exercicios-avaliacoes`).
- Identificadores e mensagens de erro em português.
- Use `Logger` do NestJS; **não use `console.log`** em código de produção.
- Evite `any`; prefira `unknown` + type guards.
- Funções pequenas, arquivos focados (<500 linhas).
- Valide toda entrada nas bordas do sistema (DTOs + `ValidationPipe` global).
- Não concatene SQL com dados do usuário; use queries tipadas do Drizzle.
- Constantes e configurações vêm de `process.env`, validadas em `src/config/env.validation.ts`.

## 5. Configuração de ambiente

Copie `.env.example` para `.env` dentro de `mindforge-api/`:

```bash
cd mindforge-api
cp .env.example .env
```

Variáveis obrigatórias e observações:

- `DATABASE_URL`: aponte para `localhost:5433/mindforge` (o container Docker mapeia `5433:5432` para não conflitar com Postgres nativo).
- `LLM_API_KEY`: chave do provedor de chat.
- `OPENAI_BASE_URL`: URL do endpoint compatível com OpenAI (padrão: `https://opencode.ai/zen/go/v1`).
- `LLM_MODEL`: modelo de chat (padrão: `grok-4.5`).
- `EMBEDDING_MODEL`: modelo de embeddings (padrão: `text-embedding-3-small`); a dimensão precisa bater com a coluna `embedding` de `conteudo_chunks`.
- `EMBEDDING_API_KEY` / `EMBEDDING_BASE_URL`: opcionais; quando o provedor de chat não expõe `/embeddings`, aponte para Ollama local (`http://localhost:11434/v1`).
- `AGENT_KB_ENABLED`, `AGENT_KB_SCRIPT_PATH`, `AGENT_KB_PROJECT_ID`: opcionais; ligam o agente-kb.

> `.env` está no `.gitignore`. Nunca commite segredos.

## 6. Banco de dados e migrações

- Schema declarativo em `src/database/schema/`.
- Migrações geradas pelo Drizzle Kit em `src/database/migrations/`.
- Tabelas usam UUID como PK (`defaultRandom()`), CHECK constraints ao invés de ENUMs, e HNSW para busca vetorial.
- Relacionamentos declarados via `relations()` em `src/database/schema/index.ts`.

Comandos:

```bash
npm run db:generate   # gera migration a partir de mudanças no schema
npm run db:migrate    # aplica migrations pendentes no DATABASE_URL
npm run db:push       # sincroniza schema sem migration versionada (cuidado)
npm run db:studio     # abre Drizzle Studio para inspeção
```

## 7. Build e execução local

Pré-requisito: Docker e Node.js 20+.

```bash
cd mindforge-api
cp .env.example .env
# ajuste DATABASE_URL para localhost:5433/mindforge
docker compose up -d
npm install
npm run db:migrate
npm run start:dev
```

A API sobe em `http://localhost:3000`.

Outros scripts importantes:

```bash
npm run build          # compila para dist/
npm run start:prod     # node dist/main
npm run start:dev      # watch mode
```

## 8. Testes

- Framework: Jest + ts-jest.
- Arquivos de teste: `**/*.spec.ts`, localizados junto ao código (dentro de `src/`).
- Cobertura mínima esperada: **80%** geral, com foco em services e repositories.
- Tipos: unitários, integração de controllers e, quando crítico, E2E.
- Mocks: use `jest.fn()` para isolar controllers; services/repositories podem usar banco de teste quando apropriado.

Comandos:

```bash
npm run test           # executa todos os testes
npm run test:watch     # modo watch
npm run test:cov       # com relatório de cobertura (coverage/)
```

Status verificado em 2026-08-23:

- `npm run build`: sucesso.
- `npm run test`: 17 suites, 74 testes passando.
- `npm run lint`: sem erros, 12 warnings de formatação Prettier (corrigíveis com `--fix`).

## 9. Segurança

- Variáveis sensíveis (`DATABASE_URL`, `LLM_API_KEY`) vêm exclusivamente do ambiente e são validadas no startup.
- `.env` e arquivos de credenciais nunca devem ser commitados.
- Erros HTTP são normalizados pelo `ProblemDetailsFilter` no formato RFC 7807; stack traces não vazam para o cliente.
- Não há autenticação/autorização implementada no momento; todas as rotas são públicas. Só adicione rotas sensíveis após implementar guards.
- **Decisão (2026-09):** o MindForge é um projeto local de uso pessoal (localhost, usuário único). Guards/autenticação serão implementados apenas na fase de auth, junto com identidade de usuário — guards ad-hoc antes disso seriam complexidade sem ganho real de segurança. Até lá, mitigações sem auth: validação de propriedade (ex.: avaliação pertence ao perfil), escopo de dados sensíveis por `perfilId` e redação de payloads (ex.: endpoints de jobs não retornam `job.data`).
- Prevenção de injeção SQL: use apenas queries tipadas do Drizzle. Não passe input do usuário para `sql.raw()`.
- Valide e sanitize qualquer dado externo, incluindo respostas de LLM, antes de persistir.
- Logs não devem conter segredos nem prompts completos de LLM.

## 10. Agentes de IA e memória

### `.hermes`

O diretório `mindforge-api/.hermes/` contém regras, contextos e planos específicos do projeto, mapeados a partir do antigo `.claude`:

- `.hermes/rules/coding-style.md`: estrutura de módulos, estilo TypeScript, handling de erros.
- `.hermes/rules/testing.md`: cobertura, tipos de teste, workflow TDD.
- `.hermes/rules/security.md`: checklist OWASP, gerenciamento de segredos.
- `.hermes/contexts/dev.md`: comandos, prioridades, caminhos úteis.

Siga esses arquivos ao implementar novos módulos. Eles refletem as mesmas convenções descritas neste `AGENTS.md`.

### `agent_kb` — memória do projeto

Sempre que uma sessão produzir informações relevantes para manter entre execuções (correções de bug, decisões arquiteturais, pendências, comandos de setup, etc.), grave no `agent_kb` do projeto `mindforge`:

```bash
py -3.11 "/opt/agent-kb/agent_kb.py"
```

**Regra de ouro:** antes de retomar uma sessão, consulte o `agent_kb` com `search`/`query` para recuperar o contexto acumulado. Ao final da sessão, ou ao atingir um marco importante, use `memory add` para persistir decisões, correções, pendências e comandos de setup. Isso reduz a dependência do contexto da conversa e mantém o histórico do projeto disponível para futuros agentes.

> **Lembrete para agentes:** nunca inicie uma tarefa complexa sem consultar o `agent_kb` e nunca termine sem salvar o que foi aprendido. A memória do projeto é tão importante quanto o código.

Exemplos do que salvar:
- Correções de bug e a causa raiz.
- Decisões arquiteturais e trade-offs.
- Comandos de setup/ambiente que foram necessários.
- Pendências e próximos passos de uma tarefa interrompida.

## 11. Módulos implementados (status real)

Conforme `docs/README.md` e o código em `src/modules/`:

| Módulo | Status | Observações |
|--------|--------|-------------|
| `perfil` | ✅ implementado | CRUD de referência |
| `planner` | ✅ implementado | cria objetivos e gera trilhas via LLM |
| `research` | ✅ implementado | curadoria por LLM + web search opcional via DuckDuckGo |
| `synthesizer` | ✅ implementado | geração + reviewer + `conteudo_fontes` + chunking |
| `biblioteca-viva` | ✅ implementado | indexação e busca vetorial (RAG) |
| `tutor` | ✅ implementado | `teacher` + `agent-kb` + contexto contínuo |
| `exercicios-avaliacoes` | ✅ implementado | geração, correção, avaliações compostas, revisão espaçada SM-2 |
| `diario` | ✅ implementado | registro manual + teacher |
| `knowledge-graph` | ✅ implementado | competências, relações, progresso, extração no Planner/Synthesizer |
| `agentes` | ✅ implementado | logging de execuções em `agentes_execucoes` |
| `jobs` | ✅ implementado | pg-boss sobe e conecta; handlers registrados |

## 12. Documentação complementar

Para decisões de produto, arquitetura e modelagem de dados, consulte `docs/`:

- `docs/00-visao.md`: o que é o MindForge.
- `docs/02-arquitetura.md`: módulos e fluxo de dados.
- `docs/03-stack-tecnologica.md`: stack e decisões de tooling.
- `docs/04-modelagem-dados.md`: schema Postgres + pgvector.
- `docs/14-decisoes-arquiteturais.md`: ADRs (sem Redis, pg-boss, Drizzle, provedor de embeddings separado, etc.).

## 13. Dicas operacionais

- **Porta do Postgres local**: use `5433` no `DATABASE_URL`, pois o container mapeia `5433:5432` (ADR-014).
- **Dimensão de embeddings**: `conteudo_chunks.embedding` usa 768 dim no repositório (modelo `nomic-embed-text` via Ollama). Se mudar o modelo, gere uma nova migration para recriar a coluna com a dimensão correta.
- **Provedor de chat vs embeddings**: podem ser provedores distintos. O chat usa `OPENAI_BASE_URL`; embeddings podem usar `EMBEDDING_BASE_URL` separado (ADR-016).
- **Web search**: o `WebSearchService` faz scraping do HTML do DuckDuckGo. Pode falhar se o layout mudar; o sistema continua com curadoria baseada no conhecimento interno do LLM (ADR-017).
- **Próximo passo documentado**: Fase 3.2 — workers assíncronos no `pg-boss` e web search real no Research.
