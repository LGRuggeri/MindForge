# 19 — CI do backend e inicialização

Atualizado em 14/09/2026. O workflow e o comando de validação estão implementados; a execução local com banco descartável foi verificada. **A primeira execução no GitHub e a configuração do check obrigatório na branch ainda estão pendentes de publicação.**

## Contrato do pipeline

O workflow `.github/workflows/backend-ci.yml` executa em push, pull request, merge queue e acionamento manual, sem filtro por caminhos. O job tem nome estável **`Backend / SQL e cobertura`**.

1. Instala as versões do `package-lock.json` com `npm ci`, em Node.js 24.
2. Compila a API e executa o lint, incluindo os scripts de CI.
3. Usa PostgreSQL 17 com pgvector, banco exclusivo `mindforge_ci` e credenciais descartáveis.
4. Executa `npm run test:ci`, que prepara o banco e roda toda a suíte Jest com SQL e cobertura.
5. Disponibiliza resultado JSON, resumo de cobertura e LCOV/HTML como artefatos por 14 dias, inclusive quando a execução falha e há relatórios disponíveis.

O workflow usa permissão de leitura do repositório e não precisa de chaves de IA. Serviços de chat, busca, mídia e Agent KB são simulados nos testes. A instalação de dependências e imagens requer rede; os testes não dependem de provedores externos.

## Banco vazio e migrations

`scripts/preparar-banco-ci.cjs` exige `TEST_DATABASE_URL` explícita. Aceita somente PostgreSQL em loopback e banco chamado `mindforge_ci` ou `mindforge_ci_<hex>`. Parâmetros de query e fragmentos são recusados: o driver poderia usar parâmetros como `host` para trocar o destino validado.

O script não carrega `.env`. Verifica PostgreSQL 17, cria a extensão `vector` e aplica as migrations versionadas pelo migrator do Drizzle. Repete a aplicação para verificar o controle de reaplicação, confere o total registrado contra o journal e exige `conteudo_chunks.embedding` com tipo `vector(768)`.

No serviço novo do CI, as migrations partem de um banco vazio. A validação local confirmou as **14 migrations, de 0000 a 0013**, sem alterações nesses arquivos neste lote. O comando também pode ser repetido no banco de CI já preparado; isso não equivale a uma nova validação partindo do zero.

Os testes preservam seu isolamento: tabelas temporárias ou schemas exclusivos para persistência e pg-boss. O banco pessoal na porta 5433 não é alvo do comando de CI.

## Execução completa e limite de cobertura

`scripts/testar-ci.cjs` fixa `MINDFORGE_SQL_TESTS=1` e `NODE_ENV=test`, descobre as suítes pelo Jest e executa todas em série. Não aceita argumentos para filtrar casos ou arquivos. Apaga os dois relatórios JSON anteriores antes de iniciar o Jest, evitando aprovar por arquivos antigos.

Além do `coverageThreshold.global` de 80% do Jest, `scripts/validar-ci.cjs` exige:

- Sucesso, pelo menos um teste e igualdade entre casos totais e aprovados.
- Zero falhas, skips, TODOs e suítes pendentes.
- Presença de suítes SQL no manifesto e correspondência exata entre os arquivos descobertos e executados.
- Pelo menos um caso aprovado em cada suíte e nenhum caso pendente no detalhamento.
- Pelo menos 80% de linhas, instruções, funções e ramificações, usando contagens inteiras; 79,999% não é arredondado para aprovação.

Banco indisponível, URL ausente, filtro de execução ou relatório incompleto encerram o comando com código 1. Testes de subprocesso verificam esses caminhos do CLI. As regressões do validador cobrem também suíte ausente, SQL ausente, skips e cada métrica abaixo do limite.

A suíte rápida continua disponível sem Docker. Seu resultado tem finalidade própria e não substitui a verificação completa.

## Reprodução local

Na pasta `mindforge-api`, em PowerShell:

```powershell
# Projeto Docker separado, sem volumes persistentes, porta exclusiva.
docker compose -p mindforge-ci -f compose.ci.yml up -d --wait
$env:TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5544/mindforge_ci'
npm ci
npm run build
npm run lint
npm run test:ci

# Encerra somente o ambiente descartável de CI.
docker compose -p mindforge-ci -f compose.ci.yml down
```

Manter `-p mindforge-ci` em ambos os comandos evita confundir o projeto de testes com o Compose de desenvolvimento. O banco usa `tmpfs`: ao encerrar o container, seus dados são descartados. As credenciais acima são públicas e exclusivas desse ambiente descartável.

Para investigar apenas a preparação: `npm run db:prepare:ci`, com a mesma variável. Para inspecionar uma suíte durante desenvolvimento, usar o Jest diretamente; o comando oficial `test:ci` exige a execução integral.

Relatórios gerados em `mindforge-api/coverage/`:

| Arquivo | Conteúdo |
|---|---|
| `resultado-ci.json` | Resultado por suíte/caso e contagens globais |
| `coverage-summary.json` | Cobertura completa por arquivo e global |
| `lcov.info` e `lcov-report/` | Linhas e ramificações para inspeção detalhada |
| `coverage-sem-sql.json` | Cópia separada da medição rápida, quando salva manualmente |

## Inicialização e encerramento

`main.ts` exporta `configurarAplicacao` e `bootstrap`; importar o entrypoint não abre a porta nem inicializa o `AppModule`. A execução direta inicia normalmente. O comando de produção aponta para `node dist/src/main.js`, conforme o caminho real gerado pelo build.

O smoke compõe os módulos Nest e as rotas reais, substituindo banco/fila e o repositório de Perfil por simulações controladas. Confirma os cinco workers, CORS, rejeição de campos extras, RFC 7807, 404, erro 500 sem segredo e fechamento dos recursos. A configuração de teste ignora `.env`; produção e desenvolvimento mantêm sua leitura habitual.

O bootstrap habilita hooks de encerramento e fecha a aplicação se a abertura da porta falhar. `DatabaseModule` agora possui o pool e o fecha em `onApplicationShutdown`, depois que os hooks dos workers terminam. A regressão reproduziu a ausência de `pool.end()` antes da correção.

Também foi executado um smoke local adicional da API compilada contra o banco descartável: `GET /perfis` e `GET /jobs/filas` com HTTP 200, cinco filas reais e encerramento do processo sem forçar sua saída. Esse smoke manual complementa os testes automatizados; não simula chamadas a provedores reais nem constitui validação integral do produto.

## Ativação no GitHub

O incremento de sandbox acrescenta preparação das imagens Python/Node e `npm run test:sandbox` após a suíte SQL. Esses 11 cenários executam programas em containers reais e verificam isolamento/limites; não entram no percentual de cobertura Jest. Falha nesse comando reprova o mesmo job. A validação local está registrada em [20-sandbox.md](20-sandbox.md); a primeira execução remota continua pendente.

Publicar as mudanças e aguardar a primeira execução do workflow. Depois, configurar **`Backend / SQL e cobertura`** como status check obrigatório na regra de proteção/ruleset da branch de integração, sem permitir que um merge o ignore.

O arquivo de workflow define o job, mas não altera as regras de proteção do repositório. Essas configurações e a execução remota **não foram realizadas nesta sessão**. A entrega local não deve ser descrita como proteção já ativa no GitHub.

**Verificação de acesso em 14/09/2026:** Actions está habilitado e a conta possui permissão administrativa, mas as APIs de rulesets e de proteção clássica da `main` retornaram HTTP 403: o GitHub exige upgrade para Pro ou repositório público para habilitar o recurso neste repositório privado. A visibilidade foi preservada. O CI pode executar e reprovar a PR, mas o bloqueio obrigatório de merge depende da disponibilidade dessa função no plano da conta.

Referências oficiais usadas para o workflow: [pgvector](https://github.com/pgvector/pgvector), [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node) e [upload-artifact](https://github.com/actions/upload-artifact).
