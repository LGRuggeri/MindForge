---
name: ecc-plan
description: Cria um plano de implementação antes de codar no MindForge, respeitando a arquitetura NestJS + Drizzle e o padrão de módulos do projeto.
type: prompt
whenToUse: Quando o usuário pedir para implementar uma feature, refatoração ou correção no MindForge.
disableModelInvocation: false
arguments:
  - objetivo
---

# ECC Plan — MindForge

Siga este workflow quando o usuário pedir para implementar algo no MindForge. O objetivo é reduzir retrabalho, clarificar escopo e obter aprovação antes de escrever código.

## 1. Entenda o pedido

- Leia o pedido e identifique o objetivo real.
- Se for vago, peça esclarecimento em até 2 perguntas curtas.
- Resuma em uma frase o que deve ser entregue.

## 2. Decida se precisa de modo de planejamento

Use `EnterPlanMode` se a mudança envolver:
- mais de 2 arquivos
- nova API, contrato, schema ou DTO
- lógica de negócio nova
- dependência entre módulos
- alteração em testes existentes

Para tarefas triviais (corrigir typo, renomear variável, ajustar constante), documente em uma linha e prossiga.

## 3. Consulte a documentação do projeto

Antes de planejar, leia os documentos relevantes em `docs/`:
- `docs/00-visao.md` — o que é o MindForge
- `docs/02-arquitetura.md` — módulos e fluxo de dados
- `docs/04-modelagem-dados.md` — schema Postgres + pgvector
- `docs/14-decisoes-arquiteturais.md` — ADRs

Para mudanças em banco, leia também `docs/14-decisoes-arquiteturais.md` e verifique ADRs 014, 016 e 017.

## 4. Explore o código afetado

- Use `Grep`, `Glob` e `Read` para encontrar arquivos relacionados.
- Localize o módulo existente ou defina onde criar o novo.
- Leia o schema (`src/database/schema/`), DTOs, services, repositories e controllers afetados.

## 5. Respeite o padrão de módulo do MindForge

Todo domínio em `mindforge-api/src/modules/<dominio>/` deve seguir a estrutura:

```text
<dominio>.module.ts
<dominio>.controller.ts
<dominio>.service.ts
<dominio>.repository.ts
dto/
```

Regras:
- Nomeie domínios em português (`perfil`, `planner`, `exercicios-avaliacoes`).
- Service contém as regras de negócio e **nunca importa `drizzle-orm` diretamente**.
- Repository é o único arquivo que importa `drizzle-orm` e executa queries.
- DTOs usam decoradores do `class-validator` + `class-transformer`.

## 6. Elabore o plano

Escreva um plano em português com:

### 6.1 Objetivo
Uma frase clara do que será entregue.

### 6.2 Critério de conclusão
Como saber que está pronto:
- testes passando
- `npm run build` e `npm run lint` sem erros
- cobertura de testes mantida ou ampliada
- comportamento validado, se necessário

### 6.3 Arquivos e módulos envolvidos
Liste arquivos que serão criados, alterados ou removidos.

### 6.4 Passos de implementação
Ordene os passos de forma pequena e verificável.

### 6.5 Riscos e decisões pendentes
Mencione incertezas, impactos em outros módulos e escolhas a confirmar.

## 7. Valide o plano

- Verifique se os passos respeitam o padrão de módulo do MindForge.
- Garanta que testes estão incluídos.
- Verifique se a mudança exige migration (`npm run db:generate`).

## 8. Peça aprovação

Apresente o plano de forma concisa e peça aprovação.
- Se aprovado, use `TodoList` para transformar os passos em tarefas e comece a implementar.
- Se houver ajustes, atualize o plano e repita.
