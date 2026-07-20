# Coding Style Rules — MindForge

## Module Structure

```
src/modules/<dominio>/
  <dominio>.module.ts
  <dominio>.controller.ts
  <dominio>.service.ts
  <dominio>.repository.ts
  dto/
    <nome>.dto.ts
```

- `controller`: routes, DTOs, status codes.
- `service`: business logic. **Never imports `drizzle-orm`.**
- `repository`: Drizzle queries only.
- `dto`: `class-validator` + `class-transformer` decorators.

## File Organization

- Many small files over few large ones.
- 200-400 lines typical, 500 max per file.
- Organize by feature/domain, not by type.
- High cohesion, low coupling.

## TypeScript

- Avoid `any`. Use `unknown` with type guards when needed.
- Prefer `readonly` arrays and immutability.
- Use `strict` mode (already enabled in `tsconfig.json`).

## Error Handling

- Handle errors at every level.
- Use NestJS exceptions (`NotFoundException`, `BadRequestException`).
- Log detailed context server-side with `Logger`.
- Never silently swallow errors.
- Never use `console.log` in production code; use `Logger`.

## Input Validation

- Validate all user input at system boundaries (controllers).
- Use DTOs with `class-validator`.
- Fail fast with clear messages.
- Never trust external data (LLM output included).

## Code Quality Checklist

- [ ] Functions small (<50 lines).
- [ ] Files focused (<500 lines).
- [ ] No deep nesting (>4 levels).
- [ ] Proper error handling.
- [ ] No hardcoded values (use config/env).
- [ ] Readable, well-named identifiers.
