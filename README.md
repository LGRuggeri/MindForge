# MindForge

> Plataforma pessoal de estudo guiada por IA. Você diz o que quer aprender; o MindForge monta a trilha, pesquisa fontes, gera as aulas, tira dúvidas, cria exercícios e simulados e acompanha sua evolução com revisão espaçada e um grafo de competências.

![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-12-E0234E?logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17%20%2B%20pgvector-4169E1?logo=postgresql&logoColor=white)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-blue)

## Por que o MindForge

- **Do objetivo à aula, sem montar tudo à mão.** A partir de um objetivo ("Aprender NestJS", "Concurso de Professor Intérprete de Libras", "AZ-900"), o Planner gera uma trilha com módulos, e cada módulo recebe material didático sintetizado e revisado por IA.
- **Conteúdo com procedência.** Antes de gerar uma aula, o sistema pode pesquisar fontes na web e registrar de onde veio cada referência. Se a busca falhar, a geração continua com a curadoria do próprio modelo e isso fica marcado.
- **Tutor que conhece o seu material.** As dúvidas são respondidas com RAG sobre o conteúdo do próprio módulo (pgvector), com contexto do perfil e histórico da conversa.
- **Prática de verdade.** Exercícios objetivos e discursivos, avaliações compostas e simulados multi-módulo com correção automática, feedback por questão e agenda de revisão SM-2.
- **Progresso visível.** Diário de aprendizagem, grafo de competências interativo e projetos práticos com entregas e feedback iterativo.
- **Provedores trocáveis.** Qualquer endpoint de chat compatível com a API da OpenAI (Gemini, OpenCode, Groq, Ollama...), embeddings em um provedor separado e fallback automático quando o principal falha.
- **Roda na sua máquina.** API, front-end e banco sobem localmente; os dados ficam no seu Postgres.

## Como funciona

```text
 Objetivo ──► Planner ──► Trilha / Módulos
                              │
                              ▼
                  Research (busca web opcional + curadoria)
                              │
                              ▼
            Synthesizer ──► Reviewer ──► Conteúdo + fontes
                              │
                              ▼
          Biblioteca Viva (chunking + embeddings + pgvector)
                              │
        ┌─────────────────────┼──────────────────────┐
        ▼                     ▼                      ▼
   Tutor (RAG)      Exercícios / Simulados     Projetos práticos
        │                     │                      │
        └──────────► Revisão SM-2 · Diário · Knowledge Graph
```

Cada etapa é um agente de IA com contrato próprio (Planner, Researcher, Synthesizer, Reviewer, Teacher, Evaluator). As tarefas longas, como gerar conteúdo, exercícios e embeddings, podem rodar como jobs assíncronos em uma fila [pg-boss](https://github.com/timgit/pg-boss) sobre o próprio Postgres, sem Redis. Toda execução de agente é registrada em `agentes_execucoes` para inspeção.

## Funcionalidades

| Área | O que existe hoje |
|---|---|
| Perfis e objetivos | Perfis de estudo, objetivos com nível e prazo, programas prontos (certificações e grades de concurso) com seleção de módulos |
| Planejamento | Geração e replanejamento de trilhas, módulos e registro de conclusão |
| Pesquisa e conteúdo | Busca web opcional (DuckDuckGo, Serper ou API genérica), procedência das fontes, síntese com revisão automática, modos resumo, aula completa e concurso |
| Atividades na aula | Perguntas extraídas do conteúdo com campo de resposta salvo por perfil |
| Tutor IA | Conversa com contexto do perfil e do módulo, RAG, avaliação das respostas e integração opcional com um `agent_kb` externo |
| Exercícios e simulados | Geração, correção objetiva e por IA, avaliações compostas, simulados multi-módulo com nota e feedback por exercício |
| Revisão e progresso | Agenda SM-2, autoavaliação de lembrança, diário de aprendizagem e grafo de competências (React Flow) |
| Projetos | Propostas geradas por IA, entregas, feedback iterativo e conclusão |
| Mídia | Leitura em voz alta com Edge-TTS (sem chave) e ilustrações via Gemini, com cache em disco |
| Sandbox de código | Execução de Python e JavaScript em containers Docker sem rede, com limites de tempo, memória e processos (opcional, só acesso local) |
| Jobs | Fila pg-boss com acompanhamento de estado, retry e cancelamento |

## Tecnologias

**Backend (`mindforge-api/`)**

| Ferramenta | Uso |
|---|---|
| [NestJS 12](https://nestjs.com/) + TypeScript (strict) | API REST, módulos de domínio |
| [Drizzle ORM](https://orm.drizzle.team/) + Drizzle Kit | Schema declarativo e migrations |
| [PostgreSQL 17](https://www.postgresql.org/) + [pgvector](https://github.com/pgvector/pgvector) | Dados, busca vetorial (HNSW, 768 dimensões) |
| [pg-boss](https://github.com/timgit/pg-boss) | Fila de jobs assíncronos no próprio Postgres |
| SDK [`openai`](https://github.com/openai/openai-node) | Cliente para qualquer endpoint compatível com OpenAI |
| Zod, class-validator, class-transformer | Validação de ambiente e DTOs |
| Edge-TTS (WebSocket) e Gemini | Áudio de pronúncia e imagens ilustrativas |
| Docker | Postgres de desenvolvimento e sandbox de código |
| Jest 30 + ts-jest, ESLint 10, Prettier 3 | Testes, lint e formatação |

**Front-end (`mindforge-web/`)**

| Ferramenta | Uso |
|---|---|
| [Next.js 16](https://nextjs.org/) (App Router) + React 19 | Aplicação web |
| Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com/) | Interface e componentes, com modo escuro |
| TanStack Query + Axios | Dados e cliente HTTP |
| Zustand | Estado do perfil ativo |
| React Flow (`@xyflow/react`) | Visualização do grafo de competências |
| react-markdown + remark-gfm | Renderização das aulas |
| Vitest + Testing Library | Testes de páginas, componentes e hooks |

## Requisitos

- **Node.js 24.15 ou superior** (versão usada no CI; a API, o NestJS 12 e os testes com Jest dependem de módulos ESM) e npm. O front-end também aceita Node 22.22.2 ou superior da linha 22.
- **Docker** com suporte a containers Linux, para o Postgres de desenvolvimento e, se quiser, o sandbox.
- Um **provedor de chat compatível com a API da OpenAI** e sua chave (por exemplo Google Gemini, OpenCode ou um Ollama local).
- Um **provedor de embeddings de 768 dimensões**. O caminho mais simples é o [Ollama](https://ollama.com/) local com `nomic-embed-text`.

## Início rápido

```bash
git clone https://github.com/LGRuggeri/Mindforge.git
cd Mindforge

# 1. Banco de dados (Postgres 17 + pgvector na porta 5433)
cd mindforge-api
docker compose up -d

# 2. Embeddings locais (opcional, mas recomendado)
ollama pull nomic-embed-text

# 3. Configuração da API
cp .env.example .env
# edite o .env: LLM_API_KEY, OPENAI_BASE_URL, LLM_MODEL e, se o chat não for Gemini, IMAGE_API_KEY

# 4. Dependências, migrations e API
npm ci
npm run db:migrate
npm run start:dev          # http://localhost:3000
```

Em outro terminal:

```bash
cd mindforge-web
cp env.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:3000
npm ci
npm run dev -- --port 3001 # http://localhost:3001
```

Abra `http://localhost:3001`, crie um perfil e cadastre o primeiro objetivo.

## Configuração

A API valida todas as variáveis na inicialização (`mindforge-api/src/config/env.validation.ts`) e se recusa a subir com configuração inválida. O modelo completo, sem valores reais, está em [`mindforge-api/.env.example`](mindforge-api/.env.example).

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | Conexão Postgres. Com o Compose: `postgres://postgres:postgres@localhost:5433/mindforge` |
| `LLM_API_KEY` | sim | Chave do provedor de chat |
| `OPENAI_BASE_URL` | não | Endpoint compatível com OpenAI. Ex.: `https://generativelanguage.googleapis.com/v1beta/openai/` |
| `LLM_MODEL` | não | Modelo de chat usado pelos agentes |
| `EMBEDDING_MODEL` | não | Modelo de embeddings; precisa gerar vetores de 768 dimensões |
| `EMBEDDING_BASE_URL` / `EMBEDDING_API_KEY` | não | Provedor de embeddings separado (ex.: `http://localhost:11434/v1` / `ollama`). Se omitidos, usa o provedor de chat |
| `LLM_FALLBACK_BASE_URLS` / `LLM_FALLBACK_API_KEYS` / `LLM_FALLBACK_MODELS` | não | Provedores de reserva, separados por vírgula e na mesma ordem |
| `SEARCH_PROVIDER` | não | `duckduckgo` (padrão, sem chave), `serper` ou `api` |
| `SEARCH_API_URL` / `SEARCH_API_KEY` | para `serper`/`api` | Endpoint e chave da busca web |
| `SEARCH_TIMEOUT_MS` | não | Timeout por busca, de 1 a 60000 ms (padrão 10000) |
| `IMAGE_API_KEY` | condicional | Obrigatória quando o chat **não** é o Gemini, para nunca enviar a chave de outro provedor ao Google |
| `IMAGE_MODEL` / `IMAGE_BASE_URL` | não | Modelo e endpoint de geração de imagem |
| `AUDIO_PROVIDER` | não | `edge-tts` (padrão, gratuito e sem chave) |
| `MIDIA_DIR` | não | Cache das mídias geradas (padrão `./data/midias`) |
| `API_PUBLIC_URL` | não | URL usada nos links de imagem das aulas (padrão `http://localhost:3000`) |
| `FRONTEND_URL` | não | Origem liberada no CORS (padrão `http://localhost:3001`) |
| `SANDBOX_ENABLED` | não | `true` liga o sandbox de código (padrão `false`) |
| `SANDBOX_TEMPO_MS`, `SANDBOX_PYTHON_IMAGE`, `SANDBOX_JAVASCRIPT_IMAGE` | não | Limite de tempo e imagens Docker do sandbox |
| `AGENT_KB_ENABLED`, `AGENT_KB_SCRIPT_PATH`, `AGENT_KB_PROJECT_ID` | não | Integração opcional do Tutor com um script `agent_kb.py` externo |

No front-end, a única variável é `NEXT_PUBLIC_API_URL` ([`mindforge-web/env.example`](mindforge-web/env.example)).

> O `.env` e o `.env.local` são ignorados pelo git. Nunca versione chaves reais.

### Sandbox de código (opcional)

```bash
docker pull python:3.13-slim-bookworm
docker pull node:22-bookworm-slim
# no .env: SANDBOX_ENABLED=true, depois reinicie a API
```

Os containers rodam sem rede, com limites de tempo, memória, processos e saída, e a rota só aceita requisições de `localhost`. Detalhes em [docs/20-sandbox.md](docs/20-sandbox.md).

## Uso no dia a dia

Pela interface web:

1. **Perfis**: crie seu perfil e escolha-o no seletor do topo.
2. **Objetivos**: cadastre um objetivo livre ou escolha um programa pronto e os módulos que quer estudar. A trilha é gerada a partir dele.
3. **Módulo**: gere a aula (com ou sem pesquisa web), responda às atividades, gere exercícios e projetos.
4. **Tutor**: tire dúvidas sobre o módulo selecionado; o botão "Ouvir" lê a resposta em voz alta.
5. **Simulados**, **Revisão**, **Diário** e **Knowledge Graph**: pratique, revise no dia certo e acompanhe as competências.

Pela API REST (exemplos com `curl`):

```bash
# Criar um perfil
curl -X POST http://localhost:3000/perfis \
  -H 'Content-Type: application/json' \
  -d '{"nome": "Ana", "nivelAtual": "iniciante", "objetivosGerais": "Aprender backend"}'

# Criar um objetivo para o perfil
curl -X POST http://localhost:3000/planner/objetivos \
  -H 'Content-Type: application/json' \
  -d '{"perfilId": "<uuid-do-perfil>", "titulo": "Aprender NestJS", "nivelDesejado": "intermediario"}'

# Gerar a trilha do objetivo
curl -X POST http://localhost:3000/planner/trilhas \
  -H 'Content-Type: application/json' \
  -d '{"objetivoId": "<uuid-do-objetivo>"}'

# Gerar a aula de um módulo, pesquisando fontes antes
curl -X POST http://localhost:3000/synthesizer/conteudos \
  -H 'Content-Type: application/json' \
  -d '{"moduloId": "<uuid-do-modulo>", "topico": "Injeção de dependência", "modoEstudo": "completo", "atualizarFontes": true}'

# Perguntar ao tutor
curl -X POST http://localhost:3000/tutor/duvidas \
  -H 'Content-Type: application/json' \
  -d '{"perfilId": "<uuid-do-perfil>", "moduloId": "<uuid-do-modulo>", "pergunta": "Qual a diferença entre provider e module?"}'
```

Principais grupos de rotas:

| Prefixo | Para quê |
|---|---|
| `/perfis` | CRUD de perfis |
| `/planner` | Objetivos, programas prontos, trilhas e módulos |
| `/research` | Fontes pesquisadas por módulo |
| `/synthesizer` | Geração e listagem de conteúdos |
| `/atividades-conteudo` | Respostas às atividades dentro da aula |
| `/biblioteca-viva` | Indexação e busca semântica |
| `/tutor` | Dúvidas, avaliação das respostas e histórico |
| `/exercicios-avaliacoes` | Exercícios, tentativas, avaliações, simulados e revisão SM-2 |
| `/projetos` | Projetos práticos e entregas |
| `/diario` | Diário de aprendizagem |
| `/knowledge-graph` | Competências, relações, progresso e grafo |
| `/midia` | Áudio (`POST /midia/audio`) e imagens geradas |
| `/sandbox` | Execução de código de exercícios (local) |
| `/jobs` | Estado, resultado e cancelamento de jobs |
| `/agentes` | Histórico de execuções dos agentes |

Geração de conteúdo e de exercícios aceita `"async": true`, que devolve `{ jobId, status: "enfileirado" }` para acompanhar em `/jobs`. Erros seguem o formato RFC 7807 (Problem Details).

## Segurança

O MindForge foi pensado para **uso pessoal em `localhost`, com um único usuário**. Não há autenticação nem autorização: todas as rotas são públicas para quem alcança a porta da API. Por isso:

- não exponha a API ou o banco à internet nem a redes compartilhadas sem colocar autenticação na frente;
- a separação por `perfilId` organiza os dados, mas não substitui login;
- as credenciais do `docker-compose.yml` (`postgres`/`postgres`) servem só para desenvolvimento;
- o sandbox vem desligado e, quando ligado, recusa requisições que não venham de `localhost`.

Entradas são validadas nas bordas (`ValidationPipe` com whitelist), as queries são tipadas pelo Drizzle e stack traces não chegam ao cliente. Para reportar uma vulnerabilidade, abra uma issue sem detalhes sensíveis ou fale diretamente com o mantenedor.

## Provedores de IA

O cliente de chat usa o SDK `openai`, então qualquer serviço com API compatível funciona: Google Gemini (endpoint `/v1beta/openai/`), OpenCode, Groq, OpenAI ou um Ollama local. Os embeddings podem vir de outro provedor, o que é útil quando o de chat não expõe `/embeddings`. O `LlmFallbackService` tenta os provedores de reserva quando o principal falha (por exemplo, 503 de alta demanda). Busca web, áudio e imagem são independentes: a busca padrão (DuckDuckGo) e o áudio (Edge-TTS) não exigem chave, e falhas de imagem não impedem a geração da aula.

Os testes automatizados simulam todos os provedores externos, então a suíte roda sem chaves.

## Arquitetura e estrutura de pastas

```text
Mindforge/
├── mindforge-api/                # Backend NestJS
│   ├── src/
│   │   ├── main.ts               # bootstrap, CORS, ValidationPipe, filtro RFC 7807
│   │   ├── app.module.ts         # composição dos módulos
│   │   ├── config/               # validação do ambiente (Zod) e embeddings
│   │   ├── common/               # filtros de erro e contratos/parse de respostas de IA
│   │   ├── database/             # schema Drizzle e migrations
│   │   ├── jobs/                 # fila pg-boss, handlers e rotas de inspeção
│   │   └── modules/              # um diretório por domínio
│   │       ├── perfil/  planner/  research/  synthesizer/  biblioteca-viva/
│   │       ├── tutor/  agent-kb/  exercicios-avaliacoes/  atividades-conteudo/
│   │       ├── projetos/  diario/  knowledge-graph/  agentes/
│   │       └── midia/  sandbox/  estudo-piloto/
│   ├── scripts/                  # preparação do banco de CI e testes de sandbox
│   ├── docker-compose.yml        # Postgres 17 + pgvector (porta 5433)
│   ├── compose.ci.yml            # banco descartável para a suíte completa
│   └── .env.example
├── mindforge-web/                # Front-end Next.js
│   ├── app/                      # rotas: perfis, objetivos, modulos, tutor, pesquisa,
│   │                             # revisao, simulados, projetos, diario, knowledge-graph
│   ├── components/               # shadcn/ui e componentes do domínio
│   ├── lib/                      # cliente Axios, hooks TanStack Query, store Zustand
│   └── test/
├── docs/                         # visão, arquitetura, módulos, ADRs, roadmap e guias
├── .github/workflows/            # CI do backend
├── archive/                      # documentação histórica compactada
└── AGENTS.md                     # guia para agentes de código que trabalham no repo
```

Cada módulo de domínio segue a mesma forma: `controller` (HTTP e DTOs), `service` (regras de negócio) e `repository`, o único arquivo que importa `drizzle-orm`. É uma separação pragmática, sem arquitetura hexagonal completa, que já isola a troca de ORM em um ponto só. As decisões estão registradas em [docs/14-decisoes-arquiteturais.md](docs/14-decisoes-arquiteturais.md).

## Desenvolvimento e testes

| Pasta | Comando | O que faz |
|---|---|---|
| `mindforge-api` | `npm run start:dev` | API em modo watch |
| `mindforge-api` | `npm test` | Suíte rápida (testes com SQL são pulados) |
| `mindforge-api` | `npm run test:ci` | Suíte completa com Postgres real e cobertura; exige `TEST_DATABASE_URL` |
| `mindforge-api` | `npm run test:sandbox` | Cenários de isolamento do sandbox com Docker real |
| `mindforge-api` | `npm run db:generate` / `db:migrate` / `db:studio` | Migrations e inspeção do banco |
| `mindforge-web` | `npm test` | Testes de páginas, componentes e hooks |
| ambas | `npm run build` / `npm run lint` | Compilação e análise estática |

O workflow [Backend CI](.github/workflows/backend-ci.yml) compila, roda o lint, aplica as migrations em um banco vazio, executa a suíte completa, valida o sandbox em Docker e exige **ao menos 80%** de cobertura em linhas, instruções, funções e ramificações. Para reproduzir localmente, siga o [guia de CI](docs/19-ci-backend.md), que usa um banco descartável na porta 5544.

## Documentação

| Documento | Tema |
|---|---|
| [docs/README.md](docs/README.md) | Índice completo e status de cada módulo |
| [00-visao.md](docs/00-visao.md) · [01-filosofia.md](docs/01-filosofia.md) | O que é o MindForge e seus princípios |
| [02-arquitetura.md](docs/02-arquitetura.md) · [03-stack-tecnologica.md](docs/03-stack-tecnologica.md) | Arquitetura e stack |
| [04-modelagem-dados.md](docs/04-modelagem-dados.md) | Schema Postgres + pgvector |
| [05-agentes-ia.md](docs/05-agentes-ia.md) | Contrato dos agentes |
| [06](docs/06-research-engine.md) a [12](docs/12-knowledge-graph.md) | Research, Planner, Synthesizer, RAG, Diário, Avaliações e Knowledge Graph |
| [13-roadmap.md](docs/13-roadmap.md) · [14-decisoes-arquiteturais.md](docs/14-decisoes-arquiteturais.md) | Roadmap e ADRs |
| [16-jobs.md](docs/16-jobs.md) · [17-midia-agent-kb.md](docs/17-midia-agent-kb.md) | Jobs, mídia e agent_kb |
| [19-ci-backend.md](docs/19-ci-backend.md) · [20-sandbox.md](docs/20-sandbox.md) | CI e sandbox |
| [24-programas-por-perfil.md](docs/24-programas-por-perfil.md) · [28-pesquisa-antes-da-geracao.md](docs/28-pesquisa-antes-da-geracao.md) | Programas prontos e pesquisa antes da geração |

## Limitações e próximos passos

- Sem autenticação e sem suporte a múltiplos usuários (ver [Segurança](#segurança)).
- O seletor de módulos do front faz uma chamada por objetivo; falta um endpoint agregado.
- Os testes do front-end ainda não rodam no CI.
- O endpoint do Edge-TTS não é oficial e pode mudar; o provider está isolado para facilitar a troca.

O [roadmap](docs/13-roadmap.md) registra as fases e o que falta.

## Contribuição

Contribuições são bem-vindas.

1. Abra uma issue descrevendo o problema ou a proposta antes de mudanças grandes.
2. Crie uma branch a partir da `main`.
3. Siga as convenções do [AGENTS.md](AGENTS.md): nomes de domínio, mensagens e documentação em português; `service` não importa Drizzle; nada de `console.log` em produção; valide toda entrada nos DTOs.
4. Inclua testes e mantenha a cobertura do backend acima de 80%.
5. Rode `npm run lint`, `npm test` e `npm run build` nas pastas alteradas antes de abrir o PR.
6. Use mensagens de commit no formato [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `docs:`...).

## Licença

Distribuído sob a licença [MIT](LICENSE).

## Agradecimentos

O MindForge foi desenvolvido com apoio de agentes de código de IA, guiados pelas regras em [AGENTS.md](AGENTS.md) e pela documentação em `docs/`.
