# Plano para cobertura global de pelo menos 80%

Data: 14/09/2026. Escopo: **backend NestJS**, origem do indicador global citado na consolidação. Frontend mantém validação própria; seus percentuais não serão somados aos do Jest. **Meta numérica de 80% atingida nas quatro métricas com SQL.** O lote 6 entregou smoke de inicialização e workflow com execução integral e migrations em banco vazio, validados localmente. A primeira execução remota e a configuração do check obrigatório no GitHub ainda dependem da publicação.

## 1. Medição de referência

Fonte: `mindforge-api/coverage/coverage-summary.json`, gerado pelo Jest/ts-jest com `collectCoverageFrom: ['**/*.(t|j)s']`, sem alterar exclusões. A suíte padrão anterior tinha 63,05% de linhas. Depois das correções e testes de Research, a mesma suíte alcançou 65,85% (+2,80 pontos percentuais).

| Métrica | Padrão, sem SQL (318 testes) | Completa, com SQL (334 testes) | Itens adicionais necessários para 80%, base completa |
|---|---:|---:|---:|
| Linhas | 1.807/2.744 = 65,85% | 1.866/2.744 = 68,00% | 330 |
| Instruções (`statements`) | 1.969/3.008 = 65,45% | 2.031/3.008 = 67,51% | 376 |
| Funções | 359/648 = 55,40% | 389/648 = 60,03% | 130 |
| Ramificações (`branches`) | 664/1.182 = 56,17% | 690/1.182 = 58,37% | 256 |

Cálculo do déficit: `ceil(total × 0,80) − cobertos`. Os números mudam se houver código novo; recalcular ao terminar cada lote. Uma linha adicional não equivale a uma função ou ramificação adicional. A melhoria de 65,85% para 68% decorre de incluir os testes SQL existentes, não de novas correções entre essas duas execuções.

**Medição oficial proposta:** suíte completa, com PostgreSQL/pgvector isolado, como requisito de integração. A suíte rápida continua disponível sem Docker e deve ser publicada separadamente para manter comparabilidade histórica. Os 16 testes SQL não podem ser silenciosamente pulados na execução oficial.

## 2. Critérios de sucesso

- Pelo menos **80% em linhas, instruções, funções e ramificações** na execução completa. Buscar 85% de linhas para margem de manutenção, sem declarar concluído se as demais métricas ficarem abaixo de 80%.
- Services e repositories alterados devem chegar a pelo menos 80% no conjunto de testes pertinente; lacunas de propriedade, transação e recuperação de falhas precisam de cenários explícitos.
- Nenhuma mudança no universo medido para inflar o percentual: manter módulos, controllers, providers e código de inicialização; não inserir comentários `istanbul ignore` para escapar da meta.
- Testar resultados observáveis: SQL realmente executado e dados persistidos, payload HTTP, erros, limpeza de recursos e efeitos no progresso. Evitar testes que só repetem encadeamentos de mocks ou importam arquivos para aumentar contagem.
- Sem APIs pagas, rede externa, segredos de produção ou gravações no banco pessoal durante testes. Providers HTTP/WS/LLM e subprocessos devem usar simulações locais controladas.

## 3. Lotes de implementação

A ordem combina risco e lacunas medidas. Os números abaixo são **itens atualmente não cobertos**, não promessa de ganho integral. Grupos disjuntos: repositórios de RAG/Research ficam em seus próprios lotes; lote 5 contém os demais repositories; lote 6 contém o restante do código.

| Ordem | Área | Linhas sem cobertura | Ramificações sem cobertura | Funções sem cobertura |
|---|---|---:|---:|---:|
| 1 | Biblioteca Viva / RAG | 103 | 62 | 14 |
| 2 | Research e providers de busca | 79 | 74 | 19 |
| 3 | Jobs e filtro de erros HTTP | 96 | 32 | 34 |
| 4 | Agent KB e mídia | 141 | 89 | 25 |
| 5 | Demais repositórios | 126 | 55 | 72 |
| 6 | Contratos, serviços restantes e inicialização | 333 | 180 | 95 |

### Lote 1 — RAG, concluído em 14/09/2026

Arquivos principais: `src/modules/biblioteca-viva/chunking.ts`, `biblioteca-viva.service.ts`, `embedding.service.ts` e `biblioteca-viva.repository.ts`, com specs adjacentes.

- Chunking: entrada vazia/curta, parágrafos grandes, texto sem separadores, caracteres multibyte, limites e overlap. Verificar preservação do texto, ordem e término sem loops ou explosão no número de chunks.
- Indexação: ordem texto/vetor, cardinalidade da resposta do provedor, falha de embedding sem persistência parcial, origem conteúdo/fonte e resultado vazio.
- Consulta: limite, filtro por módulo, ordenação e score de similaridade; continuar usando PostgreSQL/pgvector real para as queries.
- Embeddings: configuração separada do chat, dimensões esperadas e resposta inválida do provedor. Corrigir bugs encontrados com regressão antes de avançar.
- Saída: fluxo indexar → consultar com dados isolados, pelo menos 85% de linhas e 80% de ramificações/funções no grupo.

### Lote 2 — Busca web e seus erros, concluído em 14/09/2026

No baseline, `src/modules/research/providers/serper-search.provider.ts` estava em 8,10% de linhas; ambos os providers JSON agora têm 100% nas quatro métricas. Resultado consolidado na seção 7.

- Testar formatos reais suportados pelo parser (`organic`, `results`, `web.results`), campos ausentes, seleção de provider, resultado vazio e limite.
- Simular HTTP 4xx/5xx, erro de rede, JSON inválido e configuração ausente; conferir headers e conteúdo da requisição sem imprimir segredos.
- Complementar normalização de URLs, score opcional e valores de fronteira; testar contrato HTTP de `PesquisarDto` e retorno do job com as origens corretas.
- Saída: falhas externas previsíveis e fallback verificado, pelo menos 85% de linhas e 80% de ramificações/funções no grupo.

### Lote 3 — Jobs e fronteira HTTP, concluído em 14/09/2026

Priorizar `src/jobs/jobs.service.ts`, `jobs.controller.ts`, `jobs.module.ts` e `src/common/filters/problem-details.filter.ts`.

- Fila: inicialização, registro dos handlers, conclusão, retry, erro, parada e limpeza. Mock de pg-boss para falhas determinísticas; teste de integração da fila em banco descartável para o ciclo de execução.
- Endpoint de inspeção: job inexistente, status e saída pública sem payload de entrada privado.
- Research: saída do processamento na inspeção do job, incluindo IDs e origens das fontes. A perda do retorno no handler/wrapper foi corrigida e validada com pg-boss real neste lote.
- Filtro RFC 7807: exceção de validação, 404, 409 e erro inesperado; resposta não expõe stack/segredos e preserva status e contexto útil.
- Saída: testes HTTP com aplicação Nest inicializada e contrato real, além de limpeza ao encerrar.

### Lote 4 — Mídia e Agent KB, concluído em 14/09/2026

No baseline, `edge-tts.provider.ts` tinha 45,26% de linhas e `agent-kb.service.ts`, 30%. Resultado consolidado na seção 9, incluindo `agent-kb-adr.bootstrap.ts`, storage, providers e contratos HTTP.

- WebSocket TTS: frames válidos/incompletos, erro de handshake, conexão encerrada, timeout e limpeza de listeners/timers; não depender do serviço público da Microsoft.
- Armazenamento: cache hit/miss, arquivo/sidecar ausente ou inválido, falha de escrita e caminhos permitidos em diretório temporário.
- Agent KB: desabilitado, configuração ausente, resolução de projeto, subprocesso com sucesso/erro/timeout/JSON inválido. Usar processo simulado, sem escrever no banco de memória real.
- Saída: recursos sempre encerrados, degradação previsível, pelo menos 85% de linhas e 80% de ramificações/funções no grupo.

### Lote 5 — Persistência do ciclo de estudo, concluído em 14/09/2026

Repositories de Planner, exercícios/avaliações, projetos, diário, Tutor, Synthesizer e agentes, incluindo Perfil e Knowledge Graph. O baseline do plano tinha 126 linhas descobertas; resultado consolidado na seção 10.

- CRUD e escopo por perfil com IDs de outro perfil; exclusão e relações órfãs; filtros, ordem e paginação.
- Transações: rollback quando a segunda escrita falha, unicidade, idempotência e disputa de tentativa/finalização em **duas conexões**. O lote acrescentou concorrência real aos testes sequenciais anteriores.
- Concorrência requer banco/schema de teste compartilhado entre conexões, criado e descartado pelo harness; não usar tabelas do usuário. Tabelas temporárias da sessão não servem para esse caso.
- Saída: pelo menos 80% nas quatro métricas do grupo, com invariantes confirmadas por consultas ao banco, sem mocks de cadeias Drizzle como substituto de execução SQL.

### Lote 6 — Implementado e validado localmente em 14/09/2026

- Consultar o relatório detalhado e cobrir ramos de negócio restantes em Tutor, Synthesizer, Projetos, avaliações e grafo: permissões, not-found, fallback, resultado inválido, falhas parciais e reenvio.
- Criar smoke de inicialização Nest com providers externos substituídos, validando DI, `ValidationPipe`, filtro e rotas. Inicialização deve ser invocável e encerrável pelos testes; refatorar bootstrap somente quando necessário para isso, sem executar `listen` ao importar.
- Testes de controllers verificam contratos e validação de DTOs, inclusive entradas incorretas e campos extras. Não basta verificar `service.metodo` chamado.
- `coverageThreshold.global` com 80 nas quatro métricas foi ativado ao final do lote 5 quando `MINDFORGE_SQL_TESTS=1`. Integrar essa modalidade ao CI obrigatório; manter o relatório rápido sem SQL separado, pois ele ainda não atende às quatro metas.
- Inserir execução completa no CI com PostgreSQL 17 + pgvector, migrations aplicadas e relatórios como artefatos. A primeira entrega do pipeline deve validar que as suítes SQL foram executadas e falhar se o banco não estiver disponível.
- Saída final: todas as métricas globais ≥80%, execução reprodutível no CI e documentação atualizada. Se as quatro metas forem atingidas antes, manter somente os cenários críticos restantes; não buscar 100% mecanicamente.

## 4. Cadência e comandos

Cada lote é uma entrega separada: teste que reproduz a lacuna → implementação/correção mínima → suíte focada → suíte completa e relatório → revisão → atualização deste plano. Não estimar progresso pelo número de testes; medir cobertura e invariantes verificadas.

Na pasta `mindforge-api`, PowerShell:

```powershell
# Comparação rápida (sem SQL)
$env:MINDFORGE_SQL_TESTS='0'
node node_modules/jest/bin/jest.js --runInBand --coverage --coverageReporters=text-summary --coverageReporters=json-summary

# Medição completa, com banco local isolado pelos specs
$env:MINDFORGE_SQL_TESTS='1'
node node_modules/jest/bin/jest.js --runInBand --coverage --coverageReporters=text-summary --coverageReporters=json-summary
```

`TEST_DATABASE_URL` tem preferência sobre `DATABASE_URL`; os specs atuais exigem host local. A execução oficial agora é `npm run test:ci`, que exige banco descartável identificado para CI, aplica migrations e rejeita skips/filtros. Usar os comandos de [CI do backend](19-ci-backend.md) para reproduzir o pipeline. Não alterar essa proteção silenciosamente para alcançar um banco externo.

Para localizar linhas e ramos faltantes ao iniciar cada lote, adicionar `--coverageReporters=html`; saída em `coverage/index.html`. `coverage-summary.json` é sobrescrito por execução: guardar os relatórios rápido e completo como artefatos separados.

## 5. Status e decisão de sequência

- [x] Baseline padrão e completa medidas, com o mesmo denominador.
- [x] Primeira melhoria: Research e procedência de fontes, incluindo migration/SQL e teste de interface.
- [x] Lote 1 — RAG/Biblioteca Viva.
- [x] Lote 2 — Research e providers de busca (saída pública do job encaminhada ao lote 3).
- [x] Lote 3 — Jobs e fronteira HTTP, incluindo saída pública do Research.
- [x] Lote 4 — Mídia e Agent KB.
- [x] Lote 5 — Persistência, rollback e concorrência em conexões distintas.
- [x] Meta numérica e gate global de 80% na execução completa com SQL.
- [x] Lote 6 — Smoke de inicialização, banco vazio e pipeline completo implementados e validados localmente.
- [ ] Publicar as mudanças, confirmar a primeira execução remota e configurar o check obrigatório no GitHub.

O check **`Backend / SQL e cobertura`** foi publicado e aprovado no GitHub pela [PR #11](https://github.com/LGRuggeri/Mindforge/pull/11), conforme [CI do backend](19-ci-backend.md). A PR aguarda revisão/integração; torná-lo obrigatório está bloqueado pelo plano GitHub do repositório privado (HTTP 403, mesmo com acesso administrativo). Após [geração e resultados](plano-geracao-resultados-2026-09-14.md), o [sandbox local](20-sandbox.md) foi concluído: medição completa de linhas/instruções/funções/ramificações em **93,65%/93,49%/86,13%/82,79%**, confirmada remotamente com **711 testes**, além de 80 locais no frontend e 11 cenários reais de Docker locais/remotos. Manter os testes de cada mudança e as quatro métricas acima do limite, sem perseguir 100% mecanicamente.


## 6. Resultado do lote 1 — RAG/Biblioteca Viva

Concluído em 14/09/2026: 52 testes no grupo (unitários, HTTP e PostgreSQL), incluindo 50 novos cenários em relação ao baseline. Na suíte completa, 384 testes passaram em 54 suítes, sem skips; na padrão sem SQL, 365 passaram e 19 foram pulados por opção explícita. Build e lint do backend aprovados; revisão independente sem achados materiais. Frontend não alterado neste lote.

### Correções encontradas pelos testes

- Chunker anterior podia gerar muitos trechos minúsculos ao encontrar um separador isolado antes do overlap; também alterava indentação e cortava pares UTF-16. Agora usa janelas com progresso garantido, limite de 2.400 unidades UTF-16 e overlap de 300 (301 quando necessário para preservar um par). O texto normalizado pode ser reconstruído sem perdas. Não promete preservar grafemas compostos inteiros em cada fronteira.
- Embeddings passam por contrato runtime: exatamente um item de índice zero, 768 números finitos e vetor não nulo. Erros do provider ou formato inválido retornam 502 sem resposta privada nos detalhes. A dimensão é compartilhada entre serviço e schema em `src/config/embedding.ts`; o tipo SQL permanece `vector(768)`.
- Origem exclusiva é validada antes de enfileirar. Job ausente retorna 503. Falha de embedding intermediário não grava parte do lote.
- Teste PostgreSQL executa indexação de conteúdo/fonte e busca com ranking, scores, limite e escopo. Lote inválido é rejeitado integralmente. Dados exclusivamente em tabelas temporárias, sem alterar material de estudo.

### Medição atual

| Métrica | Padrão (sem SQL) | Completa (com SQL) | RAG/Biblioteca Viva (com SQL) | Déficit global para 80% |
|---|---:|---:|---:|---:|
| Linhas | 1.882/2.720 = 69,19% | 1.945/2.720 = 71,50% | 125/125 = 100% | 231 |
| Instruções | 2.053/2.982 = 68,84% | 2.120/2.982 = 71,09% | 143/143 = 100% | 266 |
| Funções | 370/647 = 57,18% | 402/647 = 62,13% | 17/17 = 100% | 116 |
| Ramificações | 704/1.162 = 60,58% | 732/1.162 = 62,99% | 44/44 = 100% | 198 |

Comparação completa: 68,00% → 71,50% em linhas. O denominador mudou pela simplificação do chunker e inclusão de validações; `collectCoverageFrom` e exclusões permaneceram iguais. 100% do grupo significa execução dos pontos instrumentados, não ausência garantida de bugs.

Não houve migration, troca de modelo, chamada a LLM/embedding externo ou reindexação de dados antigos. Os novos cortes se aplicam às próximas indexações. O default do modelo continua `text-embedding-3-small`; setups que retornem dimensão diferente de 768 agora recebem erro claro antes da persistência e precisam configurar modelo/dimensão compatíveis conforme ADR-016.


## 7. Resultado do lote 2 — Research e providers

Concluído em 14/09/2026: 77 novos cenários em relação ao lote 1. Execução completa com PostgreSQL: **461 testes em 57 suítes, sem skips**. Padrão sem SQL: **441 testes passando, 20 pulados** por opção explícita. Build e lint do backend aprovados; revisão independente sem achados materiais.

### Comportamentos verificados e correções

- API/Serper validam respostas JSON como dados desconhecidos, aceitam os três envelopes suportados e aliases de campos textuais, descartam estruturas inválidas e deduplicam URLs válidas antes do limite. Objetos não viram títulos como `[object Object]`.
- DuckDuckGo resolve redirects relativos, absolutos e sem protocolo até o destino `uddg`, decodificando uma vez. Tolera aspas e ordem de atributos e preserva entidades Unicode. Link inválido não elimina os demais resultados.
- `SEARCH_TIMEOUT_MS`: padrão 10.000 ms, faixa 1–60.000, validado no startup. Testes de cancelamento controlam o sinal sem esperar relógio real. HTTP 401/403/429/500, rede, JSON inválido e configuração ausente têm comportamento previsível; logs dos providers não expõem consulta nem erro privado do transporte.
- Contrato HTTP e composição do módulo Nest real: validação do DTO, rejeição de extras/UUID inválido, listagem e enqueue; worker usa a factory e persiste sugestões com origem correta sem reenfileirar.
- Scores opcionais e limites, deduplicação de sugestões e contexto módulo → trilha → objetivo testados; PostgreSQL confirma consulta, módulo inexistente e escopo de fontes em tabelas temporárias.

### Medição atual

| Métrica | Padrão (sem SQL) | Completa (com SQL) | Research (com SQL) | Déficit global para 80% |
|---|---:|---:|---:|---:|
| Linhas | 1.941/2.695 = 72,02% | 2.005/2.695 = 74,39% | 254/255 = 99,60% | 151 |
| Instruções | 2.125/2.959 = 71,81% | 2.193/2.959 = 74,11% | 285/287 = 99,30% | 175 |
| Funções | 373/632 = 59,01% | 406/632 = 64,24% | 45/45 = 100% | 100 |
| Ramificações | 737/1.126 = 65,45% | 764/1.126 = 67,85% | 130/136 = 95,58% | 137 |

Comparação completa de linhas: **71,50% → 74,39%** (+2,89 pontos percentuais). O denominador mudou com a extração do parser JSON compartilhado e remoção do tratamento de cookies que nunca era reutilizado; `collectCoverageFrom` e exclusões ficaram iguais. Relatórios locais: `coverage/coverage-sem-sql.json` e `coverage/coverage-summary.json`; log da execução completa em `coverage/validacao-com-sql.log`.

A meta global de 80% ainda não foi atingida. Próximo lote: Jobs/filtro HTTP; incluir o retorno de Research na inspeção do job, pois hoje seu resultado é persistido como fontes, mas descartado pelo handler/wrapper da fila. Essa parte do contrato foi encaminhada ao lote 3 por depender da execução e exposição da saída pelo pg-boss.

Frontend não alterado neste lote. Sem migrations novas ou chamadas a motores de busca/LLM externos; os testes validam contratos simulados e PostgreSQL local, não a disponibilidade atual dos serviços públicos.


## 8. Resultado do lote 3 — Jobs e fronteira HTTP

Concluído em 14/09/2026: **52 novos testes**, totalizando **513 testes em 62 suítes** na execução completa, sem skips. Padrão sem SQL: **489 passando e 24 pulados** por opção explícita. Build, lint e revisão independente aprovados.

### Entrega e validação

- Corrigida a perda de retorno de Research: handler produz uma projeção pública validada e o wrapper da fila a encaminha ao pg-boss com `batchSize: 1`. Consulta de job concluído oferece `resultado: { moduloId, resultadosWeb, fontes: [{ id, origem }] }`. Jobs antigos, inválidos, de outras filas ou não concluídos têm resultado nulo; não há repasse de entrada, prompts ou erros brutos.
- Inicialização e criação de filas concorrentes compartilham a operação pendente. Falhas permitem nova tentativa; leitura/cancelamento esperam o início e o encerramento espera inicialização pendente. Listener de erro registra mensagem fixa. O módulo deixa o Nest executar os hooks, eliminando encerramento duplicado.
- HTTP cobre listagem, consulta, estado, cancelamento, job ausente e rejeição de fila/UUID inválidos. O filtro RFC 7807 preserva mensagens textuais 4xx; para 5xx usa título genérico, sem detalhes internos. Query string não aparece em `instance`; filtro e workers não logam erro privado ou stack.
- Teste PostgreSQL usa pg-boss, handler Research e controller reais, com somente pesquisa/IA simulada. Confirma saída persistida, retry após falha transitória, estado de falha definitiva e cancelamento antes da execução.
- Isolamento da fila em schema exclusivo `mf_jobs_test_<uuid>`: criado sem reutilização, removido após encerrar os workers, com verificação da remoção. Não altera `pgboss` da aplicação nem tabelas pessoais. O container existente estava parado e foi iniciado para executar as validações.

### Medição atual

| Métrica | Padrão (sem SQL) | Completa (com SQL) | Jobs + filtro HTTP (com SQL) | Déficit global para 80% |
|---|---:|---:|---:|---:|
| Linhas | 2.111/2.719 = 77,63% | 2.175/2.719 = 79,99% | 184/189 = 97,35% | 1 |
| Instruções | 2.319/2.987 = 77,63% | 2.387/2.987 = 79,91% | 204/214 = 95,32% | 3 |
| Funções | 407/637 = 63,89% | 440/637 = 69,07% | 48/53 = 90,56% | 70 |
| Ramificações | 772/1.129 = 68,37% | 799/1.129 = 70,77% | 42/44 = 95,45% | 105 |

Grupo: arquivos de `src/jobs/**` e `src/common/filters/problem-details.filter.ts`, incluindo barrels. O filtro atingiu 100% nas quatro métricas. Linhas globais completas: **74,39% → 79,99%** (+5,60 pontos percentuais). Nenhuma alteração em exclusões ou universo de arquivos medidos; o denominador mudou com as validações e correções.

A meta global ainda não foi atingida: não arredondar 79,99% para 80% nem ativar o gate com funções/ramificações abaixo da meta. Seguir para **lote 4, Mídia e Agent KB**. Manter execução SQL completa como referência e testes rápidos publicados separadamente.

Contrato operacional em [Jobs e erros HTTP](16-jobs.md). Logs locais em `coverage/validacao-sem-sql.log` e `coverage/validacao-com-sql.log`; relatórios em `coverage/coverage-sem-sql.json` e `coverage/coverage-summary.json`. Frontend não alterado, sem migration nova na aplicação e sem chamadas externas de IA.

## 9. Resultado do lote 4 — Mídia e Agent KB

Concluído em 14/09/2026: **92 novos testes**, totalizando **605 testes em 68 suítes**, incluindo SQL, sem skips. Execução padrão: **581 passando e 24 SQL pulados** por opção explícita. Suíte focada: **120 testes em 12 suítes**. Build e lint do backend aprovados; revisão independente sem achados acionáveis.

### Entrega e validação

- Edge-TTS interpreta `Path` somente no cabeçalho, rejeita frames truncados e áudio vazio, preserva concatenação dos frames válidos e encerra timers/listeners. Erros de handshake, envio, fechamento prematuro e timeout são simulados sem acessar a Microsoft. Áudio parcial não é aceito após frame inválido.
- Cache usa temporários exclusivos e publica o binário depois das escritas completas. Valida nomes, arquivos regulares e sidecars; rejeita traversal, symlinks, arquivos privados e temporários. Sidecar ausente/inválido usa MIME da extensão. Falhas de escrita não substituem o binário anterior e remoção concorrente do arquivo vira cache miss.
- Agent KB valida contratos reais do CLI com Zod, resolve projeto por slug/UUID, normaliza `core_objective`, recibos de escrita, `results/final_score` e tipo de memória. Subprocesso tem limites de tempo/buffer e janela oculta no Windows. Falhas não expõem argumentos nem conteúdo privado. Testes não executam o CLI nem gravam no banco de memória pessoal.
- Bootstrap dos ADRs é testado pela composição Nest: indisponível, sucesso e falha parcial sem abortar startup. Providers de mídia descartam logs privados; JSON, MIME e base64 inválidos de imagem resultam em erro controlado sem persistência.
- HTTP real em loopback confirma DTOs, áudio binário, reutilização de cache, distinção de voz, imagem e recusa do sidecar. Diretórios de teste são exclusivos e removidos ao encerrar.

### Medição atual

| Métrica | Padrão (sem SQL) | Completa (com SQL) | Mídia + Agent KB | Déficit global para 80% |
|---|---:|---:|---:|---:|
| Linhas | 2.268/2.745 = 82,62% | 2.332/2.745 = 84,95% | 348/350 = 99,43% | 0 |
| Instruções | 2.503/3.030 = 82,60% | 2.571/3.030 = 84,85% | 393/397 = 98,99% | 0 |
| Funções | 441/646 = 68,26% | 474/646 = 73,37% | 66/66 = 100% | 43 |
| Ramificações | 860/1.134 = 75,83% | 887/1.134 = 78,21% | 143/149 = 95,97% | 21 |

Grupo: todos os arquivos medidos de `src/modules/midia/**` e `src/modules/agent-kb/**`. Linhas globais completas: **79,99% → 84,95%** (+4,96 pontos percentuais). Não houve mudança em exclusões, `collectCoverageFrom` ou limiar de aprovação. O denominador mudou com as correções e validações.

**A meta global nas quatro métricas ainda não foi atingida.** Seguir para **lote 5, persistência do ciclo de estudo**, com transações, escopo por perfil e concorrência em conexões distintas. O déficit atual é de 43 funções e 21 ramificações; recalcular após alterações. Manter o gate de 80% para quando todas as métricas atenderem à meta.

Contrato e limites em [Mídia e Agent KB](17-midia-agent-kb.md): publicação do binário não torna as duas renomeações uma transação conjunta; validação de base64/MIME não comprova integridade visual da imagem; deduplicação de ADRs no startup permanece pendente. Nenhuma chamada externa de mídia/IA nos testes, nenhuma migration nova ou alteração de frontend neste lote.

Relatórios locais: `coverage/coverage-sem-sql.json` e `coverage/coverage-summary.json`. Logs: `coverage/validacao-sem-sql.log`, `coverage/validacao-com-sql.log` e `coverage/validacao-lote4.log`. PostgreSQL local estava ativo e a execução completa usou o isolamento dos testes existentes.

## 10. Resultado do lote 5 — Persistência e concorrência

Concluído em 14/09/2026: **23 novos cenários SQL em 10 suítes**, totalizando **628 testes em 78 suítes**, sem skips na execução completa. Padrão sem SQL: **581 passando e 47 SQL pulados** explicitamente. Build e lint aprovados; revisão independente sem problemas acionáveis. Dois mocks legados do grafo foram adaptados à operação atômica, preservando seus casos.

### Correções e invariantes

- Diário: reproduzida a persistência parcial quando a segunda escrita falhava. Registro e vínculos agora são transacionais; FK inválida reverte ambos.
- Knowledge Graph: reproduzida violação de unicidade em duas gravações iniciais de progresso. UPSERT atômico evita a corrida e mantém o contrato de atualização de nível/evidência.
- Duas conexões reais confirmam números distintos em entregas simultâneas; idempotência da finalização com uma única revisão; ordem entre tentativa e resultado; compare-and-swap da revisão. A sincronização observa locks reais no PostgreSQL.
- Rollback de criação de trilha/módulos, avaliação/vínculos e resultado/revisão; unicidade e cascatas; preservação de competências compartilhadas/manuais e anulação de referências sobreviventes. Consultas verificam perfis, módulos/trilhas, ordenação, paginação, estatísticas e projeções sem payload privado/gabarito.
- Harness em `test/postgres-isolado.test.ts`: 24 tabelas vazias por schema exclusivo, CHECK/UNIQUE copiados e FKs recriadas com destinos locais. Duas conexões de execução e uma administrativa; `search_path` sem `public`; descarte verificado. Nenhuma linha pessoal é copiada ou alterada. O helper fica fora do código de produção, sem alterar o universo medido.

### Medição atual

| Métrica | Padrão (sem SQL) | Completa (com SQL) | Repositórios do lote 5 | Déficit global para 80% |
|---|---:|---:|---:|---:|
| Linhas | 2.264/2.742 = 82,56% | 2.453/2.742 = 89,46% | 275/277 = 99,28% | 0 |
| Instruções | 2.499/3.027 = 82,55% | 2.702/3.027 = 89,26% | 307/309 = 99,35% | 0 |
| Funções | 441/647 = 68,16% | 546/647 = 84,38% | 117/118 = 99,15% | 0 |
| Ramificações | 858/1.134 = 75,66% | 931/1.134 = 82,09% | 99/110 = 90,00% | 0 |

Grupo: todos os `*.repository.ts`, exceto Biblioteca Viva e Research, já cobertos pelos lotes 1–2. A meta de pelo menos 80% foi atingida **nas quatro métricas completas**. Linhas: 84,95% → 89,46%; funções: 73,37% → 84,38%; ramificações: 78,21% → 82,09%. Exclusões e `collectCoverageFrom` permanecem iguais; o denominador mudou com as duas correções.

`jest.config.js` agora exige 80% global nas quatro métricas quando `MINDFORGE_SQL_TESTS=1` e a cobertura é coletada. A suíte completa foi reexecutada com esse gate ativo. A modalidade sem SQL mantém seu relatório próprio e não é uma verificação equivalente à completa. O CI precisa exigir a modalidade com SQL e detectar qualquer skip; essa proteção operacional é a próxima entrega.

Sem nova migration, dependência, mudança de frontend ou chamada externa de IA. O harness usa o schema já aplicado no PostgreSQL local; preparar um banco vazio a partir das migrations e validar o startup são trabalhos restantes do lote 6. Contratos em [Persistência e testes concorrentes](18-persistencia-testes.md). Relatórios: `coverage/coverage-sem-sql.json` e `coverage/coverage-summary.json`; logs correspondentes em `coverage/validacao-sem-sql.log` e `coverage/validacao-com-sql.log`.

## 11. Resultado do lote 6 — CI e inicialização

Implementado e validado localmente em 14/09/2026: **26 novos testes**, totalizando **654 testes em 80 suítes**, todos aprovados por `npm run test:ci`, sem skips ou TODOs. Modalidade rápida: **607 aprovados e 47 SQL pulados** explicitamente. Build aprovado; lint sem erros, mantendo warnings legados. Revisão independente encontrou um desvio possível de host por query string na URL de CI; corrigido com regressões vistas falhando antes da correção e passando depois. Revisão final sem outros achados materiais.

### Entrega e correções

- Workflow GitHub com Node.js 24, PostgreSQL 17/pgvector, instalação pelo lockfile, build, lint, suíte integral e artefatos. O comando força SQL/cobertura e compara o resultado com o manifesto de suítes; recusa filtros, skips, TODOs, suítes ausentes e métricas abaixo de 80%, sem arredondamento para aprovação.
- Banco novo e exclusivo na porta 5544, projeto Docker `mindforge-ci`: extensão criada, **14 migrations (0000–0013)** aplicadas e reaplicação sem duplicação; coluna vetorial confirmada em 768 dimensões. Banco pessoal na porta 5433 não alterado. O serviço do GitHub também parte de banco vazio.
- Smoke compõe os módulos Nest com providers externos simulados e testa cinco workers, HTTP, CORS, DTOs, erros e encerramento. O bootstrap pode ser importado sem iniciar a API, habilita shutdown hooks e fecha recursos quando a abertura da porta falha. `.env` é ignorado quando `NODE_ENV=test`.
- Corrigido o pool PostgreSQL sem encerramento: agora é fechado após os workers. Corrigido `start:prod`, que apontava para `dist/main`, embora o build gere `dist/src/main.js`. Smoke manual adicional da API compilada confirmou HTTP 200 em perfis/filas, cinco filas reais e término sem saída forçada.
- Três testes de subprocesso confirmam código 1 no CLI por URL ausente, banco indisponível e filtro proibido. Não usam banco pessoal nem executam IA. Os demais casos do validador cobrem relatório incompleto, skips e cada métrica abaixo do limite.

### Medição final local

| Métrica | Padrão (sem SQL) | Completa (com SQL) | Déficit para 80% |
|---|---:|---:|---:|
| Linhas | 2.387/2.757 = 86,57% | 2.567/2.757 = 93,10% | 0 |
| Instruções | 2.636/3.042 = 86,65% | 2.830/3.042 = 93,03% | 0 |
| Funções | 463/654 = 70,79% | 559/654 = 85,47% | 0 |
| Ramificações | 860/1.137 = 75,63% | 933/1.137 = 82,05% | 0 |

Não houve alteração em `collectCoverageFrom` ou exclusões. O denominador aumentou com as mudanças de inicialização; o smoke executa a composição de módulos antes não exercitada. A modalidade rápida continua abaixo da meta em funções e ramificações e não substitui a completa.

**Limite da entrega:** o workflow está no repositório local. Não houve publicação, execução no GitHub ou mudança nas regras de proteção da branch. Falta tornar o check obrigatório no serviço remoto depois da primeira execução; não confundir o gate local aprovado com proteção de merge já ativa.

Sem novas dependências, migrations da aplicação ou alterações de frontend neste lote. Relatórios: `coverage/resultado-ci.json`, `coverage/coverage-summary.json`, `coverage/coverage-sem-sql.json` e `coverage/lcov-report/`. Logs: `coverage/validacao-sem-sql.log` e `coverage/validacao-com-sql.log`. Reprodução e ativação remota em [CI do backend](19-ci-backend.md).

### Atualização após publicação e correção do sandbox

O workflow foi publicado na PR #11 e as primeiras execuções remotas passaram. Uma execução posterior revelou perda do diagnóstico OOM do Docker; a correção consulta o contador do cgroup e foi validada por regressão real. Estado local mais recente: **712 testes em 87 suítes**, sem skips; linhas **93,65%**, instruções **93,49%**, funções **86,13%** e ramificações **82,82%**. Os **15 cenários Docker** são uma validação separada e não alteram o cálculo da cobertura. Detalhes e links das execuções em [CI do backend](19-ci-backend.md). O check obrigatório continua bloqueado pelo plano da conta para o repositório privado.
