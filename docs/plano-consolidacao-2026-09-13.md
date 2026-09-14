# Consolidação do MindForge — 13/09/2026

## Objetivo e sequência autorizada

Consolidar o ciclo estudar → praticar → revisar antes de implementar o sandbox de código.

1. Entregar uma sessão de revisão utilizável com material, autoavaliação e reagendamento SM-2.
2. Revalidar os demais achados de `analise-codigo-2026-09-06.md`, priorizando conclusão de módulos, escopo do Tutor, consistência de tentativas/avaliações e respostas de IA.
3. Corrigir os achados confirmados com testes de regressão e atualizar a documentação.
4. Implementar e validar o sandbox de código como entrega separada, após consolidar o ciclo.

## Primeiro marco: sessão de revisão

- Consultar item vinculado ao perfil e à agenda; suportar exercício, conteúdo e competência.
- Mostrar enunciado/material e permitir um rascunho local opcional.
- Revelar o gabarito disponível e registrar qualidade de lembrança de 0 a 5. Autoavaliação não cria tentativa nem altera notas ou competências.
- Aceitar somente itens de hoje/atrasados; avançar ou reiniciar o intervalo SM-2.
- Recusar agenda desatualizada e atualização concorrente; filtrar referências órfãs sem apagar dados.
- Preservar rascunho em erro e limpar a sessão ao trocar de perfil.
- Separar persistência em `revisao-espacada.repository.ts`, mantendo os chamadores de `processarRevisao` e a transação das avaliações.

Arquivos: serviço/repositório de revisão, controller e módulo de exercícios/avaliações, DTO, hook `useRevisao`, página `/revisao`, componente de sessão, tipos e testes correspondentes. Não requer migration ou nova dependência.

## Critério de conclusão

Testes do fluxo e contratos, SQL gerado pelo Drizzle, suíte existente, lint e builds. Registrar limites da validação com banco real e interface. Atualizar o roadmap com a entrega efetivamente verificada.

## Limites e próximos incrementos

A entrada automática de itens na agenda continua ocorrendo pela submissão de avaliações. Agendamento a partir de exercícios avulsos, integração com diário/replanejamento e unicidade de novos registros concorrentes devem ser tratados nos próximos marcos. A proteção de concorrência deste marco se aplica à atualização de registros existentes. Autenticação continua adiada conforme a decisão de uso pessoal local.

## Validação do primeiro marco

- Em 13/09: 240 testes do backend e 56 do frontend aprovados; builds de ambos aprovados; lint sem erros (backend com `--quiet`). Revisão independente sem achados relevantes.
- Em 14/09: cinco testes adicionais aprovados no PostgreSQL do container `mindforge-postgres`, porta 5433. Tabelas temporárias copiadas do schema instalado, validação explícita do isolamento e `ROLLBACK` ao terminar cada teste. Nenhum dado de estudo foi modificado.
- Os testes SQL verificam os três tipos de material, escopo por perfil, filtragem de órfãos, reagendamento persistido, reenvio, comparação de versões e reversão da atualização em transação. A comparação de versões usa duas leituras anteriores à primeira escrita; não simula duas conexões concorrentes.
- Execução SQL é opcional e explícita: na pasta `mindforge-api`, definir `MINDFORGE_SQL_TESTS=1` e executar `node node_modules/jest/bin/jest.js --runInBand revisao-postgres.spec.ts`. Usa `TEST_DATABASE_URL` ou `DATABASE_URL` local; a suíte normal não exige banco.
- Os demais achados da análise de 06/09 foram revalidados e continuam pendentes: parser/validação de IA, conclusão de módulos, escopo Tutor, vínculos de tentativas, criação/finalização de avaliações, feedback antecipado, fontes web, ações de geração e resultado de simulados. O sandbox ainda não foi implementado.

## Segundo marco: conclusão de módulos (14/09/2026)

- Nova rota `POST /planner/modulos/:id/concluir`, com body `{ "perfilId": "UUID" }` e resposta 200. A API valida UUIDs e propriedade do módulo.
- A conclusão do módulo e o registro de estudo das competências ocorrem na mesma transação. Falha ao persistir competências reverte o status.
- Competências novas ou `nao_iniciado` passam a `aprendendo`. Níveis `aprendendo`, `praticando` e `dominado` já existentes mantêm também suas evidências e datas. Concluir estudo não comprova domínio.
- Repetir a conclusão de um módulo concluído não altera seu progresso. Módulos sem competências também podem ser concluídos.
- O botão passa a usar essa rota, atualiza as consultas de módulo/objetivos/grafo e exibe `Concluído` desativado após a persistência.
- Sem migrations ou novas dependências. A rota antiga `/knowledge-graph/progresso/modulo` continua sendo uma operação de progresso; a tela de conclusão não a utiliza mais.
- Próximo marco: escopo do Tutor e validação/preservação de respostas de IA. Demais pendências acima continuam abertas, exceto a conclusão de módulos tratada aqui.
- Validação: suíte padrão do backend com 248 testes aprovados, mais três testes HTTP adicionados e executados depois; 59 testes do frontend aprovados; quatro cenários adicionais no PostgreSQL real (preservação/idempotência, rollback, perfil incorreto e módulo sem competências). Builds e lint aprovados; revisão independente sem achados relevantes. Os testes SQL usam tabelas temporárias descartadas ao encerrar cada conexão, sem alterar dados de estudo.


## Terceiro marco: Tutor e contratos de IA (14/09/2026)

- O Tutor verifica se o módulo pertence ao perfil antes de consultar histórico, RAG ou IA. A busca vetorial recebe o módulo solicitado, restringindo os chunks de conteúdo e fontes. O histórico contínuo por perfil e o agent-kb mantêm o comportamento existente.
- Leitor JSON compartilhado pelos oito parsers de agentes remove somente o bloco externo de formatação. Blocos Markdown dentro dos textos permanecem intactos; erros de parsing não registram a resposta bruta.
- Contratos Zod validam respostas do Tutor, geração de conteúdo, Reviewer e geração de exercícios antes da persistência. Respostas inválidas retornam erro 502. Validadores existentes do Planner, Diário, Projetos e correção de tentativas foram mantidos.
- Campos opcionais de idioma e ilustrações preservam a degradação graciosa; ilustrações inválidas não deslocam os índices dos placeholders.
- Validação: 277 testes na suíte padrão do backend aprovados (26 novos); build e lint sem erros. Um teste adicional aprovado no PostgreSQL/pgvector real confirma o isolamento por módulo para as duas origens dos chunks e módulo sem resultados. Usa apenas tabelas temporárias, sem alterar dados de estudo. Revisão independente sem achados relevantes.
- Comando SQL: definir `MINDFORGE_SQL_TESTS=1` e executar `node node_modules/jest/bin/jest.js --runInBand escopo-rag-postgres.spec.ts` na pasta da API. Não foram feitas chamadas a provedores reais de IA nem alterações no frontend neste marco.
- Próximo incremento: consistência de tentativas e avaliações (propriedade, avaliações vazias e divulgação de feedback). Fontes web, ações de geração, resultado de simulados e sandbox continuam pendentes.


## Quarto marco: consistência de tentativas e avaliações (14/09/2026)

- Criação exige módulo/trilha com proprietário e exercícios não vazios, únicos e pertencentes ao escopo. Módulo e trilha simultâneos precisam ser coerentes. Criação somente com IDs de exercícios agora exige também o escopo.
- Tentativas validam perfil, módulo e vínculo à avaliação antes de enfileirar/corrigir; avaliações finalizadas não aceitam novas tentativas. Verificação repetida após IA e lock da linha de avaliação na gravação/finalização fecham o intervalo entre consulta e escrita.
- Retorno de tentativa avaliada neutraliza nota, acerto e feedback detalhado, preservando correção completa no banco. Tentativas avulsas mantêm feedback imediato.
- Submissão recusa avaliações vazias, respostas repetidas/externas e tentativas inválidas. Preserva omissões com nota zero e resultado idempotente. A tela não permite finalizar simulados legados vazios.
- Validação: 296 testes do backend, 60 do frontend, quatro testes adicionais no PostgreSQL real; builds e lint aprovados. Revisão independente sem achados materiais. SQL cobre criação, resposta, finalização idempotente, perfil incorreto, exercício estrangeiro e rejeição de tentativa após resultado; usa tabelas temporárias e não altera dados de estudo. Não simula duas conexões concorrentes.
- Executar SQL na pasta da API com `MINDFORGE_SQL_TESTS=1` e `node node_modules/jest/bin/jest.js --runInBand consistencia-postgres.spec.ts`. Sem migrations ou novas dependências.
- Cobertura global medida: 63,05% de linhas, abaixo da meta de 80%; serviços de avaliações e exercícios com 92,15% e 88,59% respectivamente. Ampliar cobertura global permanece pendente; este marco não estabelece cobertura geral satisfatória.
- Próximo incremento: validar correspondência das fontes web com os resultados recuperados. Depois, ações de geração e tela de resultado dos simulados, seguida pelo sandbox. Integrações com diário/replanejamento e demais limites anteriores continuam documentados.


## Quinto marco: fontes web e plano de cobertura (14/09/2026)

- Contrato runtime do Researcher e comparação conservadora das URLs com os resultados recebidos. Protocolos inválidos/credenciais e URLs sem correspondência não são persistidos como links.
- Sugestões continuam disponíveis com URL nula e origem `sugestao_ia`; links encontrados recebem `busca_web`. A migration 0013 adiciona a origem com default `legado` e foi aplicada ao PostgreSQL local, preservando os registros existentes.
- Limite/deduplicação aplicados pelo código; falha de busca degrada para sugestões. Interface e contexto do Synthesizer distinguem origem de verificação factual; score apresentado como estimativa.
- Validação: 318 testes do backend sem SQL; 334 com todas as suítes SQL habilitadas, incluindo dois testes de fontes/migration. Frontend com 61 testes aprovados (suíte completa e reexecução focada após ajuste das expectativas de texto). Builds e lint aprovados, revisão independente sem achados relevantes. Nenhuma chamada externa a LLM/busca nesta validação.
- Cobertura comparável da suíte padrão: 63,05% → 65,85% de linhas. Medição completa, incluindo SQL: 68% linhas, 67,51% instruções, 60,03% funções e 58,37% ramificações. Plano de seis lotes em [plano de cobertura global](plano-cobertura-80-2026-09-14.md); meta ainda não alcançada.
- Próxima execução recomendada: RAG/Biblioteca Viva (primeiro lote de cobertura). Pendências funcionais mantidas: ações de geração, resultado de simulados e sandbox.


## Cobertura — lote 1 RAG concluído (14/09/2026)

- Corrigidos chunking com separadores esparsos, preservação de indentação/pares UTF-16, contrato de embeddings e validação do enqueue.
- Grupo RAG em 100% nas quatro métricas, com 52 testes focados. Suíte global com SQL: 384 testes aprovados, linhas 71,50%, instruções 71,09%, funções 62,13%, ramificações 62,99%. Build/lint aprovados e revisão sem achados materiais.
- Sem migrations ou reindexação histórica. Próximo lote: Research e providers, conforme [plano de cobertura](plano-cobertura-80-2026-09-14.md). A meta global de 80% continua em andamento.

## Cobertura — seis lotes implementados e validados localmente (14/09/2026)

- A sequência posterior está consolidada no [plano de cobertura](plano-cobertura-80-2026-09-14.md). Resultado final local: 654 testes em 80 suítes com SQL, sem skips; linhas 93,10%, instruções 93,03%, funções 85,47% e ramificações 82,05%.
- CI implementado com PostgreSQL 17/pgvector descartável, migrations do zero, validação de suíte integral e gate de 80%. Smoke de inicialização/encerramento aprovado; pool fechado após os workers e comando de produção corrigido para o build real.
- Pendente operacional: publicar, confirmar a execução remota e tornar `Backend / SQL e cobertura` obrigatório na branch. Procedimento e limites em [CI do backend](19-ci-backend.md).
- Próximo incremento funcional: revalidar ações de geração e tela de resultado dos simulados; corrigir os problemas confirmados e manter a cobertura. Sandbox continua posterior a essa consolidação. Integrações com diário/replanejamento e autenticação mantêm os limites anteriores.

## Sexto marco: ações de geração e resultado persistido (14/09/2026)

- Achados 11 e 12 confirmados e corrigidos: os formulários de conteúdo/exercício/projeto permanecem nas listas preenchidas e a finalização do simulado apresenta nota e orientações na própria página. Materiais anteriores são preservados.
- Novo GET de resultado exige avaliação/perfil válidos e propriedade antes da leitura. Retorna nulo antes da finalização; depois recupera listas normalizadas do registro salvo. Consulta não repete efeitos de revisão/progresso.
- Frontend consulta por perfil, separa sessões por avaliação/perfil e limpa rascunhos/tentativas na troca. Erros de finalização preservam respostas. A revisão identificou cache nulo desatualizado após resposta perdida: corrigido com revalidação ao montar/focar e bloqueio do formulário até a confirmação.
- Validação: backend com 664 testes em 82 suítes, incluindo SQL, sem skips; frontend com 71 testes em 16 arquivos. Cobertura completa de linhas 93,37%, instruções 93,27%, funções 85,69% e ramificações 82,49%; builds e lint sem erros. Revisão final sem achados materiais.
- Chrome/Playwright com API simulada confirmou os três tipos de geração, resultado e recarregamento em desktop/celular, sem erros de console. Corrigida a largura mobile do seletor de perfil após reproduzir overflow. Nenhuma chamada de IA ou alteração dos dados pessoais durante a validação.
- Sem migration, dependência nova, commit ou push. Plano e limites em [geração e resultados](plano-geracao-resultados-2026-09-14.md). Próximo incremento funcional: sandbox de código. Ativação remota do CI e integrações com diário/replanejamento continuam pendentes.

### Sétimo marco — sandbox local de código (14/09/2026)

- Python e JavaScript executam em containers efêmeros pelos exercícios do módulo/simulado; entrada, stdout, erros e limites aparecem antes da submissão. Execução não altera notas, tentativas, revisão ou grafo.
- Restrições locais, perfil dono, rede bloqueada, raiz imutável, limites de recursos, saída e concorrência. Supervisor protegido por identidade separada e descarte de privilégios antes do código do aluno; falha persistente de limpeza bloqueia o executor.
- Validação final: 711 testes backend/87 suítes com SQL e sem skips; 80 testes frontend; 11 cenários Docker. Cobertura 93,65% linhas, 93,49% instruções, 86,13% funções e 82,79% ramificações. Builds/lint aprovados; navegador desktop/celular com API, SQL e Docker reais.
- Imagens instaladas e flag habilitada no `.env` local; requer reiniciar API de desenvolvimento. Sem migration/dependência/commit/push. [Plano](plano-sandbox-2026-09-14.md) e [operação](20-sandbox.md).
- Próxima etapa: publicar CI e ativar check obrigatório no GitHub, depois validar provedores do ambiente pessoal. Nenhuma etapa remota foi realizada neste marco.
