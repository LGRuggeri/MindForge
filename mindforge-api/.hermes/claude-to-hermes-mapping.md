# Mapeamento .claude → Hermes — MindForge

Este documento mapeia as configurações usadas no diretório `.claude` do usuário para a estrutura do Hermes no projeto MindForge.

## Resumo da adaptação

| Origem (.claude) | Destino (Hermes) | Nota |
|---|---|---|
| `skills/<name>/SKILL.md` | `~/.hermes/skills/software-development/<name>/SKILL.md` | Skills do usuário |
| `rules/**/*.md` | `<projeto>/.hermes/rules/*.md` | Regras do projeto |
| `contexts/*.md` | `<projeto>/.hermes/contexts/*.md` | Contextos de trabalho |
| `agents/*.md` | `~/.hermes/skills/software-development/mindforge-agent-*/SKILL.md` | Agentes como skills |

## Mapeamento detalhado

### Skills

| .claude skill | Hermes skill | Tipo | Foco |
|---|---|---|---|
| `security-scan` | `mindforge-security-scan` | Skill | Scan OWASP para NestJS/Drizzle |
| `code-review` | `mindforge-code-review` | Skill | Review unificado com subagentes |
| `verify` | `mindforge-verify` | Skill | Build, lint, testes, segurança, diff |
| `test-coverage` | `mindforge-test-coverage` | Skill | Cobertura e gaps de testes |
| `diagnose` | `mindforge-diagnose` | Skill | Debug estruturado 6 fases |
| `grill-me` | `mindforge-grill-me` | Skill | Perguntas adversariais |
| `improve-architecture` | `mindforge-improve-architecture` | Skill | Detectar módulos rasos |
| `handoff` | `mindforge-handoff` | Skill | Resumo para continuidade |
| `plan` | `plan` (já existe) | Skill nativa | Planos de implementação |
| `tdd` | `test-driven-development` (já existe) | Skill nativa | TDD |
| `systematic-debugging` | `systematic-debugging` (já existe) | Skill nativa | Debug root cause |
| `requesting-code-review` | `requesting-code-review` (já existe) | Skill nativa | Pre-commit review |
| `creating-skills` | `hermes-agent-skill-authoring` (já existe) | Skill nativa | Criar skills |

### Agentes

| .claude agent | Hermes skill | Papel |
|---|---|---|
| `security-reviewer` | `mindforge-agent-security-reviewer` | Revisor de segurança |
| `csharp-reviewer` | `mindforge-agent-nestjs-reviewer` | Revisor NestJS/TS |
| `database-reviewer` | `mindforge-agent-drizzle-reviewer` | Revisor Drizzle/DB |
| `architect` | `mindforge-agent-architect` | Arquiteto / ADRs |
| `tdd-guide` | `test-driven-development` (skill nativa) | Guia de TDD |
| `build-error-resolver` | `systematic-debugging` + `nestjs-ai-agent-setup` | Resolver erros |

### Regras

| .claude rules | Hermes destino |
|---|---|
| `rules/common/security.md` | `.hermes/rules/security.md` |
| `rules/common/testing.md` | `.hermes/rules/testing.md` |
| `rules/common/coding-style.md` | `.hermes/rules/coding-style.md` |
| `rules/csharp/*` | Não aplicável — substituído por regras NestJS |

### Contextos

| .claude context | Hermes destino |
|---|---|
| `contexts/dev.md` | `.hermes/contexts/dev.md` |
| `contexts/review.md` | `.hermes/contexts/review.md` |
| `contexts/research.md` | `.hermes/contexts/research.md` |
| `contexts/debug.md` | `.hermes/contexts/debug.md` |

## Adaptações técnicas

| ASP.NET Core / EF Core (.claude) | NestJS / Drizzle (Hermes) |
|---|---|
| `[Authorize]` attribute | NestJS Guards |
| EF Core Global Query Filters | Filtros explícitos no repository |
| MediatR CQRS handlers | Services injetados em controllers |
| FluentValidation | `class-validator` + `class-transformer` |
| `dotnet build` / `dotnet test` | `npm run build` / `npm run test:cov` |
| `appsettings.json` | `.env` + `ConfigService` + Zod |
| `Console.WriteLine` | `Logger` do NestJS |
| `dotnet format` | `npm run lint` + `npm run format` |
| EF Core migrations | Drizzle Kit migrations |

## Como usar

### Invocar uma skill

No chat do Hermes, mencione a skill pelo nome:

```
/mindforge-security-scan
```

ou naturalmente:

```
faz um security scan no MindForge
```

### Usar um agente

Os agentes são skills que devem ser carregadas no contexto de um `delegate_task`:

```python
delegate_task(
    goal="Review the security of the new planner endpoints",
    context="Use the mindforge-agent-security-reviewer skill. Review files in src/modules/planner/.",
    toolsets=["file", "terminal"]
)
```

### Aplicar contexto

Os contextos em `.hermes/contexts/` são arquivos de referência. O agente pode carregá-los explicitamente quando o usuário disser:

```
modo review
modo debug
preciso pesquisar o código
```

## Status

Última atualização: 2026-07-17
