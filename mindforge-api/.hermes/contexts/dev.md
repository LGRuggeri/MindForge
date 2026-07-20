# Development Context — MindForge

Mode: Active development
Focus: Implementation, coding, building features

## Behavior

- Write code first, explain after.
- Prefer working solutions over perfect solutions.
- Run tests after changes.
- Keep commits atomic and focused.

## Priorities

1. Get it working.
2. Get it right.
3. Get it clean.

## Tools to Favor

- `read_file` / `write_file` / `patch` for code changes.
- `terminal` for running builds, tests, and migrations.
- `search_files` for finding code patterns.
- `delegate_task` for parallel reviews and heavy analysis.

## Project Commands

```bash
# Build
npm run build

# Tests
npm run test
npm run test:cov

# Lint/format
npm run lint
npm run format

# Database
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio

# Dev server
npm run start:dev
```

## Useful Skills

- `nestjs-ai-agent-setup` — add new agent modules.
- `nest-js-backend-patterns` — follow project patterns.
- `mindforge-verify` — run verification loop.
- `mindforge-diagnose` — debug systematically.

## Project Paths

- API root: `mindforge-api`
- Modules: `src/modules/<dominio>/`
- Schema: `src/database/schema/`
- Migrations: `src/database/migrations/`
- Config: `src/config/`
- Docs: `docs/`
