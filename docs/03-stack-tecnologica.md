# 03 — Stack Tecnológica

## Front-end

- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **React Query** — cache e sincronização de estado de servidor
- **Zustand** — estado local leve
- **React Flow** — renderização interativa do Knowledge Graph pessoal

Sem mudanças em relação à v2 original — essas escolhas já eram adequadas ao
escopo do projeto.

## Back-end

- **NestJS** — API REST + GraphQL
- **PostgreSQL** (com extensão **pgvector**) — banco único, local
- **Drizzle ORM** — ver decisão detalhada abaixo
- **pg-boss** ou **graphile-worker** — fila de jobs assíncronos (pesquisa,
  síntese, correção), implementada sobre o próprio Postgres via
  `LISTEN/NOTIFY`

## Decisões descartadas

| Item | Por quê |
|---|---|
| **Redis** | Cache distribuído e pub/sub não trazem ganho perceptível para um único usuário local. O único caso de uso real (fila de jobs) é coberto por `pg-boss`/`graphile-worker` sem novo serviço. |
| **Qdrant** (banco vetorial dedicado) | Consolidado em pgvector dentro do próprio Postgres — um componente de infraestrutura a menos para operar, ao custo de uma escala de busca vetorial que o projeto não precisa. |

## ORM: Drizzle

A tabela mais consultada do sistema (`conteudo_chunks`, base do RAG e da
Biblioteca Viva) é vetorial — não é um caso periférico, é central ao
funcionamento do Tutor IA. Isso pesou na escolha do ORM:

- **Prisma** ainda não tem suporte nativo ao tipo `vector`: exige declarar a
  coluna como `Unsupported("vector(1536)")` e usar SQL raw ou TypedSQL para
  qualquer operação vetorial. Prisma Studio nem consegue exibir essas
  colunas corretamente.
- **TypeORM** ganhou suporte nativo recentemente (a partir da 0.3.27), com
  tipos de coluna `vector`/`halfvec`.
- **Drizzle** tem suporte de primeira classe desde a v0.31: tipo `vector()`
  nativo na definição da tabela, funções de distância tipadas
  (`l2Distance`, `cosineDistance`, produto interno) integradas ao query
  builder, e suporte a índices HNSW/IVFFlat direto no schema.

Como a coluna vetorial é usada com frequência (toda resposta do Tutor IA
passa por uma busca de similaridade), faz sentido que o ORM trate isso como
cidadão de primeira classe, não como exceção via SQL cru. Para as demais 16
tabelas — CRUD relacional comum — a API `db.query.tabela.findMany({ with:
{...} })` do Drizzle cobre bem os relacionamentos modelados em
`04-modelagem-dados.md`.

**Custo assumido:** o Drizzle não tem um módulo oficial `@nestjs/drizzle`
como o TypeORM tem `@nestjs/typeorm` — é preciso registrar o client como
provider manualmente no `DatabaseModule` do Nest. Custo único de setup, não
recorrente.

**Migrações:** `drizzle-kit` gera migrations SQL versionadas a partir de
mudanças no schema declarativo — mesmo papel que o Prisma Migrate cumpriria,
com a vantagem de que o SQL gerado é legível e editável diretamente quando
necessário (por exemplo, para os `CHECK` constraints do modelo de dados, que
não têm uma API declarativa dedicada no Drizzle e são adicionados via SQL
customizado na migration).

## IA

- **GPT-5.5** (ou modelo equivalente definido pelo usuário) — completions
  dos agentes
- **RAG sobre pgvector** — ver `04-modelagem-dados.md`, seção 3.4, para
  estratégia de chunking e configuração de índice
- **Agentes especializados**: Planner, Researcher, Teacher, Evaluator,
  Reviewer — cada execução logada em `agentes_execucoes` (ver
  `02-arquitetura.md`)
