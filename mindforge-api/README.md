# MindForge — API

Backend do MindForge: NestJS + Drizzle ORM + PostgreSQL/pgvector.

Plataforma pessoal de estudo guiada por IA: você solicita o conteúdo, e a IA
planeja, pesquisa, sintetiza materiais, gera exercícios, avaliações e aponta
o que precisa melhorar.

Este scaffold foi gerado e **validado de ponta a ponta** antes da entrega:
schema Drizzle → migration gerada → aplicada num Postgres 16 + pgvector 0.6.0
real → projeto compilado sem erros → API subida e testada via HTTP real
(criação de perfil, listagem, validação de DTO e formato de erro RFC 7807).

## Pré-requisitos

- Node.js 20+
- PostgreSQL local com a extensão `pgvector` instalada (ver
  `docs/04-modelagem-dados.md` §2 no repositório de documentação)

## Setup

```bash
cp .env.example .env
# edite .env com sua DATABASE_URL local e LLM_API_KEY

npm install
npm run db:migrate    # aplica a migration já gerada em src/database/migrations
npm run start:dev
```

A API sobe em `http://localhost:3000`.

## Estrutura

```
src/
├── main.ts                  # bootstrap, ValidationPipe, filtro de exceções
├── app.module.ts             # composição de todos os módulos de domínio
├── config/                   # validação de variáveis de ambiente (zod)
├── database/
│   ├── database.module.ts    # provider do client Drizzle (@Global)
│   ├── schema/                # definição das 21 tabelas
│   └── migrations/            # geradas via `npm run db:generate`
├── common/filters/            # ProblemDetailsFilter (RFC 7807)
├── jobs/                      # fila de jobs assíncronos (pg-boss)
└── modules/
    ├── perfil/                 # ✅ implementado — referência de módulo CRUD padrão
    ├── biblioteca-viva/        # ✅ implementado — referência de busca vetorial (RAG)
    ├── planner/                 # ✅ implementado — cria objetivo e gera trilha via LLM
    ├── agentes/                  # ✅ implementado — cliente LLM + logging
    ├── research/                 # esqueleto — TODO
    ├── synthesizer/               # esqueleto — TODO
    ├── tutor/                      # esqueleto — TODO
    ├── exercicios-avaliacoes/       # esqueleto — TODO
    ├── diario/                       # esqueleto — TODO
    └── knowledge-graph/               # esqueleto — TODO
```

## Padrão de módulo

Cada módulo de domínio segue a mesma forma, deliberadamente simples —
**sem** camadas hexagonais completas (domain/application/infrastructure),
porque isso seria overengineering para um projeto solo. O que se mantém do
espírito de Clean Architecture é a inversão de dependência mínima que
realmente paga seu custo aqui: o `service` nunca importa `drizzle-orm`
diretamente, só o `repository`.

```
modules/<dominio>/
├── <dominio>.module.ts
├── <dominio>.controller.ts   # HTTP: rotas, DTOs de entrada, status codes
├── <dominio>.service.ts      # regra de negócio — não conhece Drizzle
├── <dominio>.repository.ts   # único ponto que importa drizzle-orm
└── dto/
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run start:dev` | sobe a API com watch mode |
| `npm run db:generate` | gera uma nova migration a partir de mudanças no schema |
| `npm run db:migrate` | aplica migrations pendentes no banco configurado em `DATABASE_URL` |
| `npm run db:studio` | abre o Drizzle Studio para inspecionar o banco |
| `npm run test` | executa os testes com Jest |
| `npm run lint` | executa o ESLint |
| `npm run format` | formata o código com Prettier |
