# Persistência: transações e testes concorrentes

Lote 5 do [plano de cobertura](plano-cobertura-80-2026-09-14.md), executado em 14/09/2026.

## Correções

**Diário:** a criação do registro, os vínculos com módulos e a leitura do resultado agora pertencem à mesma transação. Se a inserção de um vínculo falhar, nenhum registro parcial permanece. O teste reproduz a falha com uma chave estrangeira inválida e confirma o rollback por consulta SQL.

**Progresso de competências:** `atualizarProgresso` usa `INSERT ... ON CONFLICT DO UPDATE`, com chave de conflito `(competencia_id, perfil_id)`. Duas conexões criando o primeiro progresso já não causam violação de unicidade. Atualizações continuam aceitando o nível informado; não foi adicionada uma regra geral de avanço monotônico. O comportamento específico do Planner que preserva níveis superiores permanece separado.

## Invariantes verificadas

- Planner: criar trilha e substituir a anterior em transação; uma ordem de módulo duplicada reverte todas as escritas. Excluir objetivo remove dependências em cascata, anula referências em projetos/avaliações/fontes e permite remover competências automáticas órfãs, preservando competências compartilhadas ou manuais.
- Projetos: duas submissões simultâneas disputam o lock do projeto e recebem números distintos. Falha na escrita não consome número; o banco rejeita número duplicado. A exclusão do projeto remove entregas.
- Avaliações: duas finalizações simultâneas retornam o mesmo resultado e processam a revisão apenas uma vez. Se a revisão falhar, o resultado também é revertido. Tentativa e finalização disputam o mesmo lock: tentativa gravada primeiro pode ser concluída; tentativa que espera uma finalização recebe conflito.
- Revisão: duas atualizações da mesma versão do registro produzem apenas uma atualização bem-sucedida (`compare-and-swap`).
- Consultas: escopo por perfil/módulo/trilha, relações, ordenação, limites, paginação e casos vazios nos repositórios. Exercícios públicos omitem gabarito/critérios e listagens de execuções dos agentes omitem entrada/saída. Detalhes internos conservam seus contratos.

Esses testes validam persistência e contratos dos repositórios. A autorização de operações continua sendo responsabilidade dos serviços e das bordas HTTP existentes; o lote não implementa autenticação.

## Isolamento e reprodução

O helper `mindforge-api/test/postgres-isolado.test.ts` serve somente às suítes de teste. Cada suíte cria um schema `mf_persistencia_test_<uuid>`, uma conexão administrativa e duas conexões independentes com o mesmo schema. `TEST_DATABASE_URL` tem precedência sobre `DATABASE_URL`, e o host precisa ser local.

As 24 tabelas são criadas vazias a partir do schema já aplicado no PostgreSQL local, usando `LIKE public.<tabela> INCLUDING ALL`. Como `LIKE` não copia chaves estrangeiras, o helper lê suas definições no catálogo, verifica os destinos e as recria com referências ao schema de teste. Verifica também a ausência de FKs externas. Não copia linhas do usuário nem aplica migrations na aplicação.

O `search_path` das conexões contém somente o schema exclusivo e `pg_catalog`. Tabela ausente provoca erro, sem buscar tabelas pessoais em `public`. Entre cenários, `TRUNCATE` nomeia todas as tabelas qualificadas do schema, sem `CASCADE`. Ao encerrar, fecha as conexões de execução, remove somente o schema criado e confirma sua ausência no catálogo.

Os testes de concorrência aguardam o bloqueio real observado em `pg_stat_activity` e `pg_blocking_pids`. Não dependem de uma pausa fixa para presumir a ordem das operações. Locks de coordenação são liberados em `finally`; queries têm timeout de 10 segundos e a espera de lock, 5 segundos.

Dentro de `mindforge-api`, em PowerShell:

```powershell
$env:MINDFORGE_SQL_TESTS='1'
node node_modules/jest/bin/jest.js --runInBand --coverage --coverageReporters=text-summary --coverageReporters=json-summary
```

Com `MINDFORGE_SQL_TESTS=0`, a suíte rápida pula explicitamente os cenários SQL. Os percentuais das duas execuções devem ser publicados separadamente. O lote 6 acrescentou a preparação de banco vazio e a validação completa sem skips em `npm run test:ci`, conforme [CI do backend](19-ci-backend.md). Clonar o schema local não substitui essa validação; a ativação do check obrigatório no GitHub ainda depende da publicação e configuração remotas.
