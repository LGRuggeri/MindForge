# MindForge

Plataforma pessoal de estudo guiada por IA.

## Pastas

| Pasta | Conteúdo |
|---|---|
| [`docs/`](docs/README.md) | **Documentação única** (visão, arquitetura, módulos, roadmap, ADRs) |
| [`mindforge-api/`](mindforge-api/README.md) | Backend NestJS + Drizzle + Postgres/pgvector |

## Começar

```bash
cd mindforge-api
cp .env.example .env   # DATABASE_URL na porta 5433
docker compose up -d
npm install
npm run db:migrate
npm run start:dev
```

API: `http://localhost:3000`  
Docs: [`docs/README.md`](docs/README.md)

## Status rápido

Implementado e testado: Perfil, Planner, Research, Synthesizer, Diário, Agentes, Biblioteca Viva (busca), Jobs.  
Próximo: chunking pós-síntese → Tutor RAG → Exercícios.
