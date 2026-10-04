---
name: ecc-tdd-workflow
description: Workflow de Test-Driven Development para o MindForge, usando Jest + ts-jest + @nestjs/testing com cobertura mínima de 80%.
type: prompt
whenToUse: Quando o usuário pedir para implementar uma feature, corrigir um bug ou iniciar uma mudança que precisa de testes no MindForge.
disableModelInvocation: false
arguments:
  - objetivo
---

# ECC TDD Workflow — MindForge

Siga este workflow para implementar mudanças com testes primeiro no MindForge. Isso reduz retrabalho, aumenta a confiança no código e evita regressões.

## 1. Entenda o comportamento esperado

- Leia o pedido e identifique o comportamento desejado.
- Para bugs: reproduza o problema antes de corrigi-lo.
- Para features: identifique inputs, outputs e casos de borda.

## 2. Localize onde o teste deve viver

- Arquivos de teste seguem o padrão `**/*.spec.ts`.
- Ficam junto ao código, dentro de `mindforge-api/src/`.
- Use o mesmo diretório do arquivo que será testado.
- Para controllers, use `jest.fn()` para isolar o service/repository.
- Para services/repositories, considere usar banco de testes quando apropriado.

## 3. Escreva o teste falhando primeiro

- Escreva um teste que falhe com o comportamento atual.
- Para bugs: o teste deve reproduzir o bug.
- Para features: o teste deve descrever o comportamento desejado.
- Não escreva a implementação ainda.
- Execute o teste e confirme que ele falha.

Comandos úteis:
```bash
cd mindforge-api
npm run test -- <pattern>
```

## 4. Implemente a mudança mínima

- Escreva a menor quantidade de código necessária para o teste passar.
- Respeite o padrão de módulo do MindForge (controller/service/repository/dto).
- Service **nunca importa `drizzle-orm` diretamente**.
- DTOs usam `class-validator` + `class-transformer`.
- Identificadores e mensagens de erro em português.

## 5. Refatore com segurança

- Melhore o código mantendo os testes passando.
- Renomeie variáveis, extraia funções, remova duplicação.
- Execute os testes a cada refatoração.

## 6. Verifique cobertura e integração

- Rode os testes do módulo afetado.
- Rode `npm run test` para a suite completa.
- Rode `npm run build` e `npm run lint`.
- Verifique se a cobertura geral permanece acima de 80%.

Comandos:
```bash
cd mindforge-api
npm run test
npm run test:cov
npm run build
npm run lint
```

## 7. Documente o resultado

- Resuma o que foi implementado em 2 a 3 linhas.
- Mencione os arquivos de teste criados ou alterados.
- Se houver limitações, deixe explícito.

## Regras de ouro

- Nunca implemente sem um teste que valide a mudança.
- Se um teste existente quebrar, pare e entenda por quê antes de continuar.
- Mantenha os ciclos pequenos: teste -> implementação -> refatoração -> verificação.
