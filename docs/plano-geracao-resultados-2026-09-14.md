# Consolidação: geração e resultados de simulados

## Escopo autorizado

Corrigir os achados 11 e 12 da análise de código: ações de geração acessíveis em módulos com itens e resultado do simulado apresentado após finalizar e ao reabrir a página. Continuação do plano de consolidação já autorizado, posterior aos seis lotes de cobertura.

## Implementação

1. Reproduzir em Vitest o desaparecimento dos três formulários e o descarte do resultado. Manter as listas e exibir os formulários antes delas; preservar entradas em erro e impedir submissão durante geração. Gerar novamente cria outro material, preservando os anteriores.
2. Criar consulta `GET /exercicios-avaliacoes/avaliacoes/:id/resultado?perfilId=UUID`. Validar os UUIDs e a propriedade da avaliação antes de consultar resultado. Resposta `{ resultado: null }` antes de finalizar; depois, resultado persistido com listas normalizadas. Reutilizar o repositório existente, sem migration.
3. Tipar o resultado e criar hook com chave de cache por avaliação/perfil. Após finalizar, guardar a resposta e consultar novamente os dados persistidos. Exibir nota, pontos fortes, pontos a revisar e recomendações; não redirecionar automaticamente.
4. Separar a sessão por avaliação/perfil para limpar respostas e tentativas ao mudar de contexto. Exibir carregamento/erro de consulta e bloquear respostas enquanto não se sabe se já existe resultado. Resultado só aparece após a finalização; não expor feedback antecipado.
5. Validar regressões, suíte completa frontend, API com SQL/cobertura, lint e builds. Conferir a interface em navegador com respostas controladas, sem chamar IA ou gravar dados pessoais. Revisar, atualizar documentação e memória.

## Arquivos previstos

- Frontend: páginas de módulos e simulados, componente de resultado/sessão conforme necessário, `lib/hooks/useAvaliacoes.ts`, tipos e testes adjacentes.
- Backend: controller e `avaliacoes.service.ts`, testes HTTP/de persistência correspondentes. A consulta de resultado por avaliação e perfil já existe no repositório.

## Critérios e limites

- As três gerações continuam acessíveis com listas preenchidas, atualizam suas listas ao concluir e preservam os itens anteriores.
- Finalização apresenta o resultado; remontagem/recarregamento recupera o mesmo resultado e não habilita novo envio. Erro preserva respostas; troca de perfil não reaproveita cache ou tentativas de outro perfil.
- Consulta de outro perfil é recusada; avaliações inexistentes e UUIDs inválidos têm erros explícitos. Nenhuma gravação é realizada pelo GET.
- Manter as quatro métricas globais do backend acima de 80%, sem modificar exclusões.
- Sem nova dependência ou migration. Publicação/ativação remota do CI e sandbox permanecem fora deste incremento.

## Resultado verificado em 14/09/2026

Implementação concluída. Os formulários de conteúdo, exercício e projeto ficam antes das listas e permanecem disponíveis depois das gerações. Novo conteúdo preserva os anteriores; o tópico é normalizado e mantido quando ocorre erro. Entradas e botões ficam desabilitados durante a geração. Projetos exigem perfil selecionado.

Consulta e apresentação do resultado entregues conforme o contrato acima. O teste de recuperação usa outra conexão PostgreSQL, verificando que o GET não repete revisão/progresso. A revisão independente identificou resultado nulo mantido pelo cache global de cinco minutos: foi acrescentada revalidação ao montar/focar, com formulário bloqueado durante a confirmação. A regressão com o mesmo QueryClient e uma resposta de finalização perdida falhou antes da correção e passou depois. Revisão final sem achados materiais.

- Backend: **664 testes em 82 suítes**, sem skips no `npm run test:ci`; dez casos novos (nove HTTP e um PostgreSQL). Cobertura completa: linhas **93,37%** (2.579/2.762), instruções **93,27%** (2.842/3.047), funções **85,69%** (563/657), ramificações **82,49%** (938/1.137). Sem alteração nas exclusões.
- Modalidade rápida: **616 aprovados e 48 SQL pulados**, linhas 86,85%, instruções 86,90%, funções 71,08%, ramificações 76,07%; relatório próprio.
- Frontend: **71 testes em 16 arquivos**, dez casos novos. Builds de ambos e lint sem erros; backend mantém warnings legados. Next.js informa um lockfile externo ignorado, sem impedir o build.
- Navegador: Chrome headless via Playwright já disponível, `http://127.0.0.1:3101`, desktop 1440×1000 e celular 390×844. O plugin Browser não estava disponível. API simulada no navegador; sem IA ou gravação em dados pessoais. Verificados os três botões de geração, preservação das listas, seleção do tipo Código, finalização, resultado e recarregamento. Página identificada, conteúdo visível, sem overlay de erro ou erros/avisos no console.
- A conferência mobile reproduziu overflow de 20 px no seletor de perfil do cabeçalho. Ajustada somente sua largura mobile, preservando a largura desktop; nova captura confirmou documento e viewport com 390 px.

Capturas e script temporário de QA ficaram fora do repositório. PostgreSQL de testes na porta 5544, projeto Docker `mindforge-ci`, separado do ambiente pessoal. Nenhuma dependência ou migration adicionada; não houve commit, push ou configuração remota do CI.

Próximo incremento funcional: sandbox para exercícios de código, como entrega separada. Publicação do CI/check obrigatório e integrações futuras com diário/replanejamento permanecem pendentes.

O cache após a submissão segue a [documentação oficial do TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses): usar a resposta confirmada para atualizar a consulta correspondente.
