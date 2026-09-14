# Feedback após finalizar o simulado

Correção autorizada em 14/09/2026 após confirmar que o feedback era salvo, mas não disponibilizado após finalizar.

## Entrega

Ampliar o resultado existente, mantendo o escopo por perfil e sem liberar correções antes da finalização. Cada exercício mostrará enunciado, resposta enviada, acerto, pontuação e feedback. A consulta após reabrir e a repetição da finalização devem devolver as mesmas correções usadas na nota.

## Implementação

1. Reproduzir a ausência do feedback em testes de serviço/HTTP e da tela.
2. Acrescentar `feedback_exercicios` JSONB anulável em `resultados_avaliacao`, via migration gerada. Salvar uma cópia dos detalhes das tentativas selecionadas na mesma transação do resultado e da revisão. Exercícios omitidos recebem resposta nula e pontuação zero.
3. Retornar os detalhes no POST de finalização e GET de resultado, inclusive nos caminhos idempotentes/concorrentes. A consulta anterior à finalização permanece com resultado nulo e outro perfil recebe 403.
4. Para resultados legados com a coluna nula, consultar o histórico de tentativas da mesma avaliação/perfil. Identificar essa lista como histórico: a seleção usada na nota antiga não foi persistida e não pode ser reconstruída com segurança.
5. Atualizar os tipos e o componente de resultado no frontend. Renderizar a resposta do usuário como texto; distinguir acerto, erro, correção sem classificação e questão não respondida.
6. Validar persistência/reabertura, tentativa selecionada diferente da mais recente, isolamento por perfil/avaliação, legado, rollback e concorrência. Executar testes frontend/backend com SQL e cobertura >=80%, builds, lint e inspeção da interface. Registrar resultado e memória.

## Arquivos e limites

Schema/migration, service e repository de exercícios/avaliações, testes de resultado, tipos de API e componente `resultado-simulado`. Sem nova rota pública ou chamada de IA. O JSONB preserva a correção usada na nota mesmo se o exercício mudar depois. Resultados antigos mantêm sua nota e só recebem histórico identificado como tal; não há backfill que adivinhe a tentativa avaliada.

## Contrato e resultado verificado

`POST /exercicios-avaliacoes/avaliacoes/submeter` e `GET /exercicios-avaliacoes/avaliacoes/:id/resultado?perfilId=...` incluem `feedbackExercicios` no resultado. Cada item contém `exercicioId`, `tentativaId`, `enunciado`, `respostaUsuario`, `correta`, `pontuacao` e `feedbackIa`. A ordem segue a avaliação. Questão sem resposta tem `tentativaId` nulo e pontuação zero. A correção por tentativa continua oculta no POST individual do simulado.

Em registros anteriores, `feedbackExercicios` é nulo e `historicoTentativas` contém as correções disponíveis da mesma avaliação/perfil. A tela explica que essas tentativas não podem ser associadas com segurança à nota antiga. O GET não altera dados ou dispara IA.

- Regressões de serviço e tela falharam antes da correção e passaram depois.
- Backend completo com SQL: **719 testes / 89 suítes**, sem skips. Cobertura: linhas **2721/2905 = 93,66%**, instruções **3008/3217 = 93,50%**, funções **586/680 = 86,17%**, ramificações **1020/1229 = 82,99%**.
- Frontend: **84 testes / 18 arquivos**. Builds das duas aplicações e lint sem erros; backend mantém warnings legados.
- SQL real: seleção diferente da tentativa mais recente, questão omitida, reabertura em outra conexão, edição posterior, perfil incorreto, histórico sem dados de outra avaliação/perfil, concorrência e rollback.
- Navegador Chrome com API e PostgreSQL descartável reais: resposta sem feedback antes de finalizar, correção após finalizar, recarregamento e histórico legado. Desktop 1440×1000 e celular 390×844, sem overflow horizontal, erros ou avisos no console, sem chamadas a provedores externos.
- Revisão independente sem achados concretos. Migration `0014_feedback_resultado` gerada e aplicada no banco descartável; também aplicada com sucesso no banco local `mindforge`, porta 5433. Reiniciar a API/frontend caso estejam executando um build anterior.
- Servidores de QA nas portas 3100/3101 e banco descartável na porta 5544 encerrados. Capturas e scripts de QA ficam fora do repositório.
