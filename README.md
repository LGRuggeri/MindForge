# MindForge

Plataforma pessoal de estudo guiada por IA.

## Pastas

| Pasta | Conteúdo |
|---|---|
| [`docs/`](docs/README.md) | **Documentação única** (visão, arquitetura, módulos, roadmap, ADRs) |
| [`mindforge-api/`](mindforge-api/README.md) | Backend NestJS + Drizzle + Postgres/pgvector |
| [`mindforge-web/`](mindforge-web/README.md) | Frontend Next.js + Tailwind + shadcn/ui |

## Começar

### Backend

```bash
cd mindforge-api
cp .env.example .env   # DATABASE_URL na porta 5433
docker compose up -d
npm install
npm run db:migrate
npm run start:dev
```

API: `http://localhost:3000`

### Frontend

```bash
cd mindforge-web
cp .env.example .env.local
npm install
npm run dev
```

Web: `http://localhost:3001`

> O frontend espera o backend em `http://localhost:3000`. Ajuste `NEXT_PUBLIC_API_URL` se necessário.

## Status rápido

Backend implementado e testado: Perfil, Planner, Research (com web search e async), Synthesizer, Diário, Agentes, Biblioteca Viva (busca), Jobs (`pg-boss`), Tutor, Exercícios e Avaliações, Revisão Espaçada, Knowledge Graph, fallback de provedor LLM.  
Frontend implementado: dashboard, perfis, objetivos, trilhas, módulos, conteúdo, exercícios, tutor, revisão e knowledge graph (cards/timeline).
