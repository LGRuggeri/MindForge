# Validação das fontes web — 14/09/2026

## Objetivo e escopo autorizado

Concluir o próximo marco de consolidação e elaborar o plano de cobertura global. Validar o contrato do Researcher, comparar URLs com os resultados reais da busca e persistir a origem de cada indicação.

## Decisões

- Apenas HTTP/HTTPS sem credenciais; normalização conservadora com URL, removendo fragmento e preservando caminho/query. Não buscar cada URL nem seguir redirects.
- URL correspondente aos resultados desta busca recebe origem `busca_web`. Isso comprova a presença do endereço nos resultados, não a veracidade do conteúdo ou do resumo da IA.
- Sugestão sem correspondência ou em fallback continua útil como indicação, mas fica sem URL e com origem `sugestao_ia`. Score é estimativa da IA, nunca selo de verificação.
- Nova coluna `origem` em `fontes_pesquisa`, com default `legado` para preservar o histórico sem atribuir validação retroativa. Migration aditiva, sem excluir fontes.
- Frontend distingue as origens nas duas listagens; Synthesizer recebe a procedência no contexto.

## Implementação e verificação

1. Criar testes de regressão para URL inventada, protocolos perigosos, ausência/falha da busca, resposta IA malformada, duplicatas e limite.
2. Implementar validador e persistência de origem; gerar e revisar migration.
3. Atualizar apresentação e contexto da síntese com testes de comportamento.
4. Validar migration e persistência no PostgreSQL local isolado, suítes, cobertura, builds, lint e revisão independente.
5. Registrar relatório de cobertura e plano em lotes até pelo menos 80% nas quatro métricas, sem reduzir o universo medido.

Não inclui coleta do conteúdo completo das páginas, execução de código ou tela de resultados de simulados.
