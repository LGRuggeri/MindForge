# Debug Context — MindForge

Mode: Debugging, troubleshooting, root cause analysis
Focus: Find and fix bugs systematically

## Behavior

- Build a tight feedback loop first.
- Reproduce before hypothesizing.
- Instrument with `[DEBUG-xxxx]` tags.
- Fix root cause, not symptoms.
- Add regression tests.
- Clean up instrumentation.

## Immediate Steps

1. Read the error message fully.
2. Identify the fastest repro: test > curl > manual.
3. Check recent changes: `git log --oneline -10`, `git diff`.
4. Trace data flow from controller to repository.
5. Form ranked hypotheses and falsify them.

## Common MindForge Pitfalls

- **LLM returns invalid JSON**: check `parseJsonSeguro` and prompt strictness.
- **Drizzle relation error**: missing declaration in `src/database/schema/index.ts`.
- **DI error**: missing `@Inject()` for custom providers.
- **Port conflict**: another Postgres on 5432 (Windows native install).
- **Process not reloading**: kill old `node.exe` processes.

## Tools to Favor

- `terminal` for running tests and repros.
- `search_files` for tracing references.
- `read_file` for reading the failing path.
- `mindforge-diagnose` skill for structured debugging.

## Useful Skills

- `systematic-debugging`
- `mindforge-diagnose`
- `nestjs-ai-agent-setup`
