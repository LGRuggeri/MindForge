# MindForge

Plataforma pessoal de estudo guiada por IA. A partir de um objetivo de aprendizado, o MindForge organiza uma trilha, pesquisa fontes, gera material didático e acompanha a prática com tutor, exercícios, simulados e revisão espaçada.

## Estado atual

Atualizado em **14/09/2026**. O ciclo de estudo está implementado para uso pessoal local. A consolidação de testes, o sandbox de código e o feedback após finalizar simulados foram integrados à `main` pela [PR #11](https://github.com/LGRuggeri/Mindforge/pull/11), com [CI aprovado após o merge](https://github.com/LGRuggeri/Mindforge/actions/runs/34891633277).

| Área                     | Recursos disponíveis                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Planejamento             | Perfis, objetivos, geração e replanejamento de trilhas, módulos e registro de conclusão                                               |
| Pesquisa e conteúdo      | Busca web opcional, registro da procedência das fontes, síntese com revisão automática, referências e indexação para busca vetorial   |
| Tutor IA                 | Conversas com contexto do perfil e do módulo, RAG sobre o material de estudo e integração opcional com Agent KB                       |
| Exercícios e simulados   | Geração, correção objetiva e por IA, avaliações compostas e simulados com exercícios de vários módulos                                |
| Resultado do simulado    | Nota, resposta, pontuação e feedback por exercício após finalizar; recuperação ao reabrir e preservação das tentativas usadas na nota |
| Revisão e progresso      | Agenda SM-2, consulta do material, autoavaliação de lembrança, diário e grafo de competências com React Flow                          |
| Projetos                 | Propostas geradas por IA, entregas, feedback iterativo e conclusão                                                                    |
| Mídia                    | Leitura em voz alta com Edge-TTS, ilustrações via Gemini e cache local                                                                |
| Código                   | Execução de Python e JavaScript em Docker, com entrada padrão, saída, erros e limites de recursos                                     |
| Processamento assíncrono | Jobs com pg-boss, acompanhamento de estado, retry e fallback configurável de provedores de IA                                         |

Nos simulados, a correção individual fica oculta durante a resolução. Resultados anteriores à implementação do feedback exibem um histórico identificado como legado: as tentativas usadas na nota antiga não eram registradas.

O frontend inclui dashboard, perfis, objetivos, módulos, tutor, pesquisa, diário, revisão, grafo de competências, projetos e simulados.

**Uso previsto:** ambiente pessoal em localhost. Autenticação e operação pública com múltiplos usuários continuam fora do escopo atual; a separação por `perfilId` não substitui autenticação. O sandbox exige ativação explícita e aceita somente acesso local.

## Stack e organização

- **Backend:** NestJS 11, TypeScript, Drizzle ORM, PostgreSQL 17 com pgvector e pg-boss.
- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand e React Flow.
- **IA:** endpoints de chat compatíveis com OpenAI, embeddings configuráveis separadamente e provedores de busca e mídia.
- **Qualidade:** Jest, testes HTTP e SQL, Vitest/Testing Library e integração com Docker no GitHub Actions.

| Pasta                              | Conteúdo                                                           |
| ---------------------------------- | ------------------------------------------------------------------ |
| [`mindforge-api/`](mindforge-api/) | API REST, regras de negócio, schema, migrations, workers e testes  |
| [`mindforge-web/`](mindforge-web/) | Aplicação web e testes de interface                                |
| [`docs/`](docs/README.md)          | Visão, arquitetura, módulos, roadmap, decisões e guias de operação |

## Executar localmente

Use **Node.js 24**, versão usada no CI, npm e Docker com suporte a containers Linux. Para os recursos de IA, configure um provedor de chat e embeddings compatíveis com o schema do projeto.

Os comandos abaixo partem da raiz do repositório, em terminais separados para API e frontend.

### Backend

```bash
cd mindforge-api
cp .env.example .env
```

Antes de iniciar, edite o `.env` copiado:

| Configuração                                                 | Ajuste necessário                                                                                                                                               |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                               | Para o Compose de desenvolvimento: `postgres://postgres:postgres@localhost:5433/mindforge`. O arquivo de exemplo ainda usa a porta 5432; altere para **5433**.  |
| `LLM_API_KEY`, `OPENAI_BASE_URL`, `LLM_MODEL`                | Chave, endpoint e modelo do seu provedor de chat                                                                                                                |
| `EMBEDDING_MODEL`, `EMBEDDING_BASE_URL`, `EMBEDDING_API_KEY` | O schema exige **768 dimensões**. O modelo padrão do exemplo precisa ser ajustado para um modelo compatível, como o `nomic-embed-text` usado no ambiente local. |
| `IMAGE_API_KEY`                                              | Obrigatória quando o provedor de chat não é o Gemini; com chat Gemini, a API pode reutilizar `LLM_API_KEY`. `IMAGE_MODEL` configura o modelo de imagem.         |
| `FRONTEND_URL`                                               | Origem permitida pelo CORS; padrão `http://localhost:3001`                                                                                                      |

Para embeddings com Ollama local, disponibilize o modelo `nomic-embed-text` no Ollama e configure:

```dotenv
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_BASE_URL=http://localhost:11434/v1
EMBEDDING_API_KEY=ollama
```

O `.env.example` também descreve busca web, fallback de chat, mídia e sandbox. Depois de ajustar o ambiente:

```bash
docker compose up -d
npm ci
npm run db:migrate
npm run start:dev
```

API: `http://localhost:3000`. PostgreSQL de desenvolvimento: porta **5433**. As migrations incluem a persistência do feedback dos simulados; execute `db:migrate` também ao atualizar uma instalação existente.

### Frontend

```bash
cd mindforge-web
npm ci
npm run dev -- --port 3001
```

Web: `http://localhost:3001`. O cliente usa a API em `http://localhost:3000` por padrão. Para outro endereço, crie `mindforge-web/.env.local` com `NEXT_PUBLIC_API_URL=<endereço-da-API>` e ajuste `FRONTEND_URL` no backend se mudar a origem do frontend. Reinicie os processos após alterar suas variáveis.

### Sandbox de código opcional

Na pasta `mindforge-api`, prepare as imagens:

```bash
docker pull python:3.13-slim-bookworm
docker pull node:22-bookworm-slim
```

Defina `SANDBOX_ENABLED=true` no `.env` e reinicie a API. O executor permite testar código em módulos e simulados sem registrar uma tentativa. Usa containers sem rede, com limites de tempo, memória, processos e saída. Preparação, restrições e diagnóstico estão no [guia do sandbox](docs/20-sandbox.md).

## Testes e cobertura

Última validação funcional registrada em **14/09/2026**:

| Verificação                 | Resultado                                                                 |
| --------------------------- | ------------------------------------------------------------------------- |
| Backend com PostgreSQL real | **719 testes em 89 suítes**, sem testes ignorados                         |
| Frontend                    | **84 testes em 18 arquivos**                                              |
| Sandbox com Docker real     | **15 cenários**, medidos separadamente da cobertura Jest                  |
| Builds e lint               | Backend e frontend aprovados; o lint do backend mantém avisos legados     |
| Navegador                   | Fluxos de sandbox e feedback do simulado verificados em desktop e celular |

| Cobertura global do backend, incluindo SQL | Percentual |
| ------------------------------------------ | ---------- |
| Linhas                                     | **93,66%** |
| Instruções                                 | **93,50%** |
| Funções                                    | **86,17%** |
| Ramificações                               | **82,99%** |

O workflow [Backend CI](.github/workflows/backend-ci.yml) compila, verifica lint, aplica migrations em banco vazio, executa a suíte completa e valida o sandbox em Docker. Exige **ao menos 80% nas quatro métricas**, reprova testes ignorados e publica relatórios de cobertura. Os testes do frontend são executados separadamente; ainda não fazem parte desse workflow.

| Pasta           | Comando                          | Finalidade                                                                     |
| --------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| `mindforge-api` | `npm test`                       | Suíte rápida; testes SQL são ignorados por padrão                              |
| `mindforge-api` | `npm run test:ci`                | Suíte completa com SQL e cobertura; exige banco de teste e `TEST_DATABASE_URL` |
| `mindforge-api` | `npm run test:sandbox`           | Cenários de isolamento com Docker e imagens preparadas                         |
| `mindforge-web` | `npm test`                       | Testes de componentes, páginas e hooks                                         |
| Ambas           | `npm run build` / `npm run lint` | Compilação e análise estática                                                  |

Para reproduzir a validação completa, siga o [guia de CI](docs/19-ci-backend.md), que usa um banco descartável na porta **5544**, separado do banco pessoal. Os testes automatizados simulam os provedores externos de IA, busca e mídia.

## Pendências e próximos passos

- Validar os fluxos completos com os provedores configurados no ambiente pessoal, incluindo chat, embeddings, busca, áudio, imagens e fallback.
- Reduzir as requisições da listagem de módulos por perfil: o seletor ainda consulta os objetivos e depois o detalhe de cada objetivo.
- Incluir testes, build e lint do frontend no CI, mantendo a cobertura do backend acima de 80%.
- Tornar o check de backend obrigatório para merge quando o plano do GitHub permitir. Na verificação de 14/09/2026, a proteção de branch deste repositório privado estava indisponível no plano atual.

O sandbox local já foi entregue. Novas linguagens, correção por casos de teste e uso público com autenticação precisam de planejamento próprio. O [roadmap](docs/13-roadmap.md) registra as fases e os limites da validação atual.

## Documentação

- [Índice da documentação](docs/README.md)
- [Visão do produto](docs/00-visao.md) e [arquitetura](docs/02-arquitetura.md)
- [Modelagem de dados](docs/04-modelagem-dados.md) e [decisões arquiteturais](docs/14-decisoes-arquiteturais.md)
- [Roadmap](docs/13-roadmap.md) e [plano de cobertura](docs/plano-cobertura-80-2026-09-14.md)
- [CI e banco de testes](docs/19-ci-backend.md), [sandbox](docs/20-sandbox.md) e [feedback dos simulados](docs/plano-feedback-simulado-2026-09-14.md)
