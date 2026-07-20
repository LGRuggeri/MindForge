# Security Rules — MindForge

## Before ANY Commit

- No hardcoded secrets (API keys, passwords, tokens, connection strings).
- All user inputs validated and sanitized.
- SQL injection prevention: only typed Drizzle queries; no raw SQL with user input.
- Authentication/authorization verified on every sensitive endpoint.
- Error messages do not leak stack traces or internal paths.

## Secret Management

- `DATABASE_URL` and `LLM_API_KEY` are read from environment only.
- `.env` files are in `.gitignore` and never committed.
- Validate required secrets at startup via `src/config/env.validation.ts`.

## OWASP Quick Check

1. **Injection** — Drizzle placeholders; no string concatenation in queries.
2. **Broken Auth** — use guards; validate JWT; never trust body for identity.
3. **Sensitive Data** — HTTPS in prod; logs sanitized; PII handled with care.
4. **Broken Access** — protect all routes by default; explicit public decorators.
5. **Misconfiguration** — env validated at startup; no debug defaults in prod.
6. **XSS** — not applicable to pure JSON API; sanitize if HTML is ever returned.
7. **IDOR** — validate resource ownership against authenticated user.

## Patterns to Flag Immediately

| Pattern | Severity | Fix |
|---------|----------|-----|
| Hardcoded secret in code | CRITICAL | Move to env |
| `@Body()` without DTO | HIGH | Add DTO + validators |
| Missing guard on sensitive route | CRITICAL | Add guard |
| `sql.raw()` with user input | CRITICAL | Use typed query |
| Logging secrets or full LLM prompts | HIGH | Sanitize |
| Missing pagination on list | MEDIUM | Add limit/offset |
