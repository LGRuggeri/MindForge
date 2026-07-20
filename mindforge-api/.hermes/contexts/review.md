# Code Review Context — MindForge

Mode: PR review, code analysis
Focus: Quality, security, maintainability

## Behavior

- Read thoroughly before commenting.
- Prioritize issues by severity (CRITICAL > HIGH > MEDIUM > LOW).
- Suggest fixes, don't just point out problems.
- Check for security vulnerabilities first.

## Review Checklist

- [ ] Logic errors and edge cases
- [ ] Error handling
- [ ] Security (injection, auth, secrets, LLM prompt injection)
- [ ] NestJS module pattern compliance
- [ ] Drizzle query safety
- [ ] Performance (N+1, missing indexes, pagination)
- [ ] Test coverage
- [ ] Readability and naming

## Tools to Favor

- `read_file` for understanding code.
- `search_files` for finding patterns across the codebase.
- `mindforge-security-scan` skill for security checks.
- `delegate_task` with `mindforge-agent-*` reviewers for parallel review.

## Useful Skills

- `mindforge-code-review`
- `mindforge-security-scan`
- `mindforge-project-rules`
