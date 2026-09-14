# 16 — Jobs e erros HTTP

Atualizado em 14/09/2026. Execução assíncrona sobre o PostgreSQL, usando pg-boss e `async: true` nos fluxos que suportam essa opção.

## Execução e ciclo de vida

O Nest inicializa e encerra o provider da fila e registra os handlers. Chamadas concorrentes compartilham a inicialização e a criação de cada fila; falhas liberam uma nova tentativa. Consultas e cancelamentos aguardam o início do pg-boss.

Cada chamada do worker recebe um job (`batchSize: 1`). Seu retorno é encaminhado ao pg-boss, que o persiste ao concluir. Erros continuam sendo propagados para aplicar a política de retry; os logs dos handlers não recebem o objeto de erro ou sua stack.

Filas expostas pela API:

- `synthesizer.gerar-conteudo`
- `exercicios.gerar`
- `exercicios.corrigir-tentativa`
- `biblioteca-viva.indexar`
- `research.pesquisar`

## Inspeção e cancelamento

| Rota | Contrato |
|---|---|
| `GET /jobs/filas` | Contadores e data de atualização das filas suportadas |
| `GET /jobs/:nome/:id` | Metadados, tentativas e resultado público |
| `GET /jobs/:nome/:id/estado` | Encontrado, ID, nome, estado e retryCount |
| `DELETE /jobs/:nome/:id` | Solicita cancelamento e consulta o estado resultante |

Nome de fila fora da lista ou UUID inválido retorna 400. Job inexistente conserva o contrato `{ encontrado: false }` na consulta principal.

O campo `resultado` está disponível para Research concluído e contém somente:

```json
{
  "moduloId": "123e4567-e89b-42d3-a456-426614174000",
  "resultadosWeb": 1,
  "fontes": [
    {
      "id": "123e4567-e89b-42d3-a456-426614174001",
      "origem": "busca_web"
    }
  ]
}
```

`fontes[].origem` aceita `busca_web`, `sugestao_ia` ou `legado`. A projeção valida os tipos e remove campos adicionais, inclusive nos itens da lista. Consulte `GET /research/modulos/:moduloId/fontes` para o conteúdo das fontes.

Resultado ausente, malformado, de outra fila ou de um job ainda não concluído retorna `resultado: null`. Jobs antigos não recebem resultado retroativo. Nenhuma dessas rotas devolve `job.data`, prompts, erro bruto ou stack de falha.

O cancelamento retorna o estado realmente consultado: `cancelado: true` somente quando está `cancelled`. O cenário de job agendado é validado antes da execução. Cancelar não desfaz efeitos de um processamento que já começou.

## Erros HTTP

O filtro global responde com `application/problem+json`: `type`, `title`, `status`, `detail` opcional e `instance`.

- Validação, ausência e conflito preservam status e mensagens textuais de 4xx. Arrays de mensagens viram uma string separada por ponto e vírgula.
- Objetos arbitrários no campo `message` não são devolvidos como detalhes.
- Erros 5xx recebem título genérico `Erro interno`, sem mensagem interna ou stack, inclusive quando lançados como `HttpException`.
- `instance` contém o caminho sem query string. O filtro registra somente o status de falhas internas; não escreve o objeto de erro.

## Validação

`jobs.service.spec.ts` cobre ordenação de inicialização, concorrência, recuperação de falha, retorno/retry e encerramento. `jobs.module.spec.ts` inicia a composição Nest real com serviços de domínio simulados e verifica as factories e encerramento único. `jobs.http.spec.ts` exercita rotas, pipes e filtro com servidor HTTP local.

`jobs-postgres.spec.ts` executa o pg-boss real, handler Research e controller, simulando apenas o serviço de pesquisa. Verifica persistência da saída, retry, falha definitiva e cancelamento. Cria um schema exclusivo `mf_jobs_test_<uuid>`, encerra os workers e o remove ao final, confirmando a limpeza. Não usa nem altera o schema `pgboss` da aplicação ou tabelas de estudo.

Executar na pasta `mindforge-api`:

```powershell
$env:MINDFORGE_SQL_TESTS='1'
node node_modules/jest/bin/jest.js --runInBand jobs-postgres.spec.ts
```

O banco precisa estar disponível em host local; `TEST_DATABASE_URL` tem preferência sobre `DATABASE_URL`. Nenhuma chamada externa de IA é necessária.
