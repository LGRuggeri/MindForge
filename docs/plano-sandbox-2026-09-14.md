# Sandbox de código — plano de implementação

## Objetivo e decisões

Entregar execução experimental de Python e JavaScript nos exercícios de código do módulo e do simulado, antes do envio da resposta para a correção existente. Autorizado na continuidade do roadmap em 14/09/2026.

O executor usa Docker local, já disponível no ambiente. Containers efêmeros são adequados ao uso pessoal previsto; serviços remotos acrescentariam dependência e envio de código a terceiros. Executar código diretamente no processo da API não fornece o isolamento necessário.

Contrato: `POST /sandbox/exercicios/:id/executar`, com `perfilId`, `linguagem` (`python` ou `javascript`), `codigo` (até 16 mil caracteres) e `entrada` opcional (até 4 mil). Retorno: `status`, `stdout`, `stderr`, `codigoSaida` e `duracaoMs`. Executar não salva tentativa nem atribui nota. O código continua sendo enviado explicitamente pelo botão de correção existente.

Limites: 5 segundos por programa, 128 MiB, 0,5 CPU, 32 processos, saída combinada de 32 KiB, no máximo 2 execuções simultâneas por processo da API. Sem rede, volumes do host, socket Docker, segredos ou privilégios para o código do aluno. Supervisor isolado do UID do programa, conforme [20-sandbox.md](20-sandbox.md). Raiz somente leitura e `/tmp` efêmero de 16 MiB. O Docker CLI usa argumentos separados e recebe código/entrada por stdin; nunca utiliza shell no host. Imagens preparadas explicitamente, sem download durante requisições.

Por não existir autenticação, a rota só funciona com `SANDBOX_ENABLED=true`, conexão local, Host local e Origin permitido. Isto limita a implantação a localhost; não representa identidade autenticada. O limite de concorrência e o timeout evitam acúmulo de execuções. Falhas de infraestrutura retornam 503 sem detalhes do host. Timeout ou excesso de saída removem o container; um watchdog no próprio container limita a execução mesmo se a API cair.

## Entregas verificáveis

- [x] API: módulo `sandbox`, controller/DTO, service (escopo e concorrência), repository (exercício/proprietário), executor Docker e configuração validada; testes HTTP e unitários de sucesso, tipo/perfil incorretos, limites e falhas.
- [x] Interface: hook TanStack Query e componente `executor-codigo`, integrado ao editor existente no módulo e no simulado. Preservar código em erro, separar executar de corrigir, limpar resultado ao editar/trocar contexto, saída como texto e sem HTML. Testes com cliente HTTP simulado.
- [x] Testes reais de Docker em comando separado: Python/JS, stdin/Unicode, erro, loop infinito, excesso de saída, rede bloqueada, usuário sem privilégios, raiz imutável, isolamento entre execuções e limpeza. Não depender do Docker na suíte unitária/SQL oficial.
- [x] Verificação: suíte oficial com PostgreSQL e cobertura global >=80% nas quatro métricas, suíte frontend, builds, lint, revisão de segurança e teste em navegador. Documentar configuração, uso e limites; salvar marco no agent_kb.

## Arquivos e integração

Backend: `src/modules/sandbox/*`, `src/config/env.validation.ts`, `.env.example`, `src/app.module.ts`, `scripts/testar-sandbox.cjs`, `package.json`. Novo repository consulta tabelas existentes sem migration. Frontend: `components/executor-codigo.tsx`, `lib/hooks/useSandbox.ts`, `types/api.ts`, `app/modulos/[id]/page.tsx`, `app/simulados/[id]/page.tsx` e testes correspondentes. Documentação: `docs/20-sandbox.md`, avaliações, roadmap e índice.

## Critério de conclusão e limites

Aceitar apenas as linguagens suportadas, recusar exercício de outro perfil/tipo e executar somente após ação explícita. Confirmar que nenhum processo/container permanece após os testes. Docker compartilha o kernel e não é garantia de isolamento contra código hostil em ambiente multiusuário; esse cenário requer executor dedicado e autenticação. Instalação de pacotes, rede, arquivos persistentes e correção automática por casos de teste ficam fora deste incremento.

Referências oficiais consultadas: [execução de containers](https://docs.docker.com/engine/containers/run/) e [segurança do Docker](https://docs.docker.com/engine/security/).

## Resultado de 14/09/2026

- Backend: **711 testes / 87 suítes**, incluindo SQL real, sem skips. Cobertura: linhas **2715/2899 = 93,65%**, instruções **3002/3211 = 93,49%**, funções **584/678 = 86,13%**, ramificações **1006/1215 = 82,79%**. Nenhuma exclusão de cobertura acrescentada.
- Frontend: **80 testes / 17 arquivos**. Builds das duas aplicações e lint sem erros. Sem migration ou dependência nova no projeto.
- Docker: **11 cenários aprovados**; nenhum container remanescente. A revisão identificou e corrigiu a possibilidade de sinalizar o watchdog quando usava o mesmo UID do programa; testes reais confirmam o descarte de capacidades e a proteção contra `SIGSTOP`.
- Navegador Chrome via Playwright disponível no runtime local (plugin Browser ausente): API completa real em 3100, banco descartável CI em 5544, frontend em 3101. Python, JavaScript e timeout aprovados no módulo/simulado; 1440×1000 e 390×844, sem overflow horizontal, erros ou chamadas de correção/LLM. Aviso de preload de CSS do Next registrado, sem impacto visual observado.
- Imagens oficiais preparadas; `SANDBOX_ENABLED=true` acrescentado ao `.env` local, preservando as demais configurações. Reiniciar a API de desenvolvimento para carregar a variável. Arquivo de exemplo permanece desativado por padrão.
- Próxima etapa: revisar e integrar a PR #11, que publicou o workflow. O check obrigatório está bloqueado pelo plano do repositório privado, conforme [CI do backend](19-ci-backend.md). Uso multiusuário, novas linguagens, correção por casos de teste e integrações futuras continuam fora desta entrega.

## Correção após publicação do CI — 14/09/2026

A execução remota identificou classificação incorreta de OOM como timeout quando o evento do runtime não chega ao Docker. Regressão com Docker real e `OOMKilled=false` reproduziu o erro antes da correção. O supervisor agora lê o contador do cgroup antes de terminar e reserva o código 200, impedindo que um `exit(200)` do aluno forje o diagnóstico.

Validação após a correção: **712 testes / 87 suítes com SQL**, sem skips; **15 cenários Docker**, incluindo ausência do evento e tentativa de forjar diagnóstico em Python/JavaScript, sem containers remanescentes. Cobertura: linhas **2716/2900 = 93,65%**, instruções **3003/3212 = 93,49%**, funções **584/678 = 86,13%**, ramificações **1008/1217 = 82,82%**. Build e lint dos arquivos alterados aprovados; revisão do delta sem achados concretos. A suíte frontend mantém a validação anterior, pois não houve alteração na interface.
