# Testing Rules — MindForge

## Minimum Coverage

- Overall: 80%
- Services and repositories: 80%

## Test Types Required

| Type | What to Test | When |
|------|-------------|------|
| **Unit** | Services, repositories, utilities | Always |
| **Integration** | Controllers, database operations, agent calls | Always |
| **E2E** | Critical user flows | Critical paths |

## TDD Workflow (Preferred)

1. **RED** — Write test first, verify it FAILS.
2. **GREEN** — Write minimal implementation to PASS.
3. **REFACTOR** — Clean up, verify coverage 80%+.

## Edge Cases You MUST Test

1. Null/empty input
2. Invalid UUIDs and boundary values
3. Error paths (DB errors, LLM errors, not found)
4. Invalid LLM JSON output
5. Ownership / wrong user access
6. Soft delete behavior

## Test Anti-Patterns to Avoid

- Testing implementation details instead of behavior.
- Tests depending on each other (shared state).
- Asserting too little (tests that always pass).
- Not mocking external dependencies (LLM, DB when needed).
- Testing only happy path.

## Naming Convention

Tests should read as behavior descriptions:

```typescript
it('should throw NotFoundException when objective does not exist', async () => {
  // ...
});
```
