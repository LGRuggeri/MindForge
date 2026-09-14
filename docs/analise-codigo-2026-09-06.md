# Análise de código — 06/09/2026

Revisão de bugs, referências inconsistentes, validação e código sem consumidores. Nenhuma correção de produção foi aplicada.

## Verificações e limites

- Backend: npm test -- --runInBand — 34 suítes, 199 testes aprovados.
- Frontend: npm test — 10 arquivos, 49 testes aprovados.
- Backend: npm run lint -- --quiet sem erros reportados (warnings omitidos).
- Frontend: npm run lint sem diagnósticos reportados.
- Ambos: npx tsc --noEmit --incremental false sem diagnósticos.
- Seis reproduções executaram os serviços TypeScript reais com dependências simuladas: achados 1–3 e 5–7. Sem acessar banco ou provedores externos.
- Não foram executados build de produção, cobertura, testes E2E, migrações ou verificação de URLs externas. A interface foi analisada pelo código, sem teste visual.
- Houve alterações concorrentes em Tutor, mídia e migrations durante a revisão. As verificações representam o código executado naquele momento, não um commit imutável. As linhas abaixo se referem à versão inspecionada.
- A ausência de autenticação não foi classificada como defeito: o projeto documenta uso pessoal local. Os achados de perfil tratam de consistência dos dados.

## Achados

### 1. [P1] Parser destrói blocos de código do material gerado

Local: mindforge-api/src/modules/synthesizer/synthesizer.service.ts:368. Mesmo padrão em exercicios-avaliacoes.service.ts:366 e no método parseJsonSeguro de tutor.service.ts.

O replace global dos delimitadores Markdown atua no JSON inteiro antes de JSON.parse. Delimitadores de blocos dentro de corpoMarkdown também são apagados. A reprodução com um bloco JavaScript confirmou alteração de conteúdo mesmo recebendo JSON válido. Exemplos de programação deixam de ser renderizados como código.

Correção: remover apenas o invólucro Markdown externo, quando presente, preservando as strings internas. Centralizar o parser e testar blocos internos.

### 2. [P1] “Concluir” não conclui o módulo e pode rebaixar competências

Locais: mindforge-web/app/modulos/[id]/page.tsx:101; mindforge-api/src/modules/knowledge-graph/knowledge-graph.controller.ts:71; método marcarProgressoPorModulo de knowledge-graph.service.ts.

O frontend envia módulo/perfil e anuncia conclusão. O endpoint usa o nível padrão aprendendo, atualiza competências e nunca altera modulos_trilha.status. A reprodução confirmou o nível gravado. Como o repositório sobrescreve nivelAtual, uma competência dominada pode voltar a aprendendo.

Correção: implementar a conclusão explicitamente, atualizar status do módulo, preservar níveis superiores e invalidar consultas relacionadas.

### 3. [P1] Tutor recupera material de qualquer módulo/perfil

Locais: mindforge-api/src/modules/tutor/tutor.service.ts:75; método buscarSimilares de biblioteca-viva.repository.ts.

O Tutor possui moduloId, mas não o passa à busca. Sem o filtro, o repositório consulta todos os chunks. Reproduzida a chamada sem módulo/perfil. Material de outra trilha/perfil pode influenciar a resposta e aparecer em chunksConsultados.

Correção: aplicar o escopo do módulo ou implementar busca entre módulos explicitamente limitada ao perfil.

### 4. [P2] Tentativas aceitam perfil e avaliação sem verificar os vínculos

Local: mindforge-api/src/modules/exercicios-avaliacoes/exercicios-avaliacoes.service.ts:184.

A correção busca exercício/módulo, mas persiste perfilId e avaliacaoId sem verificar se o módulo pertence ao perfil ou se o exercício integra a avaliação. FKs verificam existência, não essas relações. Tentativas avulsas também podem creditar competências ao perfil errado. A validação na finalização da avaliação não corrige os registros já criados.

Correção: validar propriedade e associação antes da correção/persistência. A reprodução do item 5 confirmou que nenhuma consulta desses vínculos é exigida; FKs não foram testadas em PostgreSQL.

### 5. [P2] Feedback de simulado é exposto antes da finalização

Local: mindforge-api/src/modules/exercicios-avaliacoes/exercicios-avaliacoes.service.ts:210.

O serviço substitui feedback por uma mensagem neutra, mas o spread de tentativa mantém feedbackIa, com a correção detalhada, além de nota e acerto. A reprodução com correção dissertativa confirmou o gabarito no payload. O comentário que promete ocultação não corresponde ao comportamento.

Correção: projetar explicitamente a resposta pública e entregar detalhes apenas no fluxo de resultado final.

### 6. [P2] Avaliações aceitas na criação podem ser impossíveis de finalizar ou vazias

Local: mindforge-api/src/modules/exercicios-avaliacoes/avaliacoes.service.ts:60 e :94.

A criação aceita somente exerciciosIds, sem módulo/trilha. A submissão exige proprietário derivado exclusivamente desses vínculos e rejeita o registro com “Avaliação não possui perfil proprietário”. Reproduzido com persistência simulada.

Módulo/trilha sem exercícios também gera simulado vazio. Na tela, every sobre uma lista vazia torna todosRespondidos verdadeiro, permitindo finalizar zero questões com nota zero.

Correção: definir proprietário e validar os vínculos na criação; rejeitar simulados sem questões.

### 7. [P2] Busca web real não impede fontes inventadas de serem persistidas

Local: mindforge-api/src/modules/research/research.service.ts:108, :112 e :213.

URLs devolvidas pelo LLM passam apenas por conversão para string/trim, sem comparação com os resultados web. A reprodução forneceu uma fonte web e recebeu do agente uma URL inventada diferente: a URL foi persistida com confiabilidade 1. O prompt proíbe inventar links, mas o código não verifica.

Correção: vincular fontes a resultados recuperados, validar protocolo/correspondência e distinguir sugestões não verificadas. O score do LLM não é verificação factual.

### 8. [P2] JSON válido é confundido com resposta de IA válida

Locais: mindforge-api/src/modules/synthesizer/synthesizer.service.ts:292; reviewer.service.ts:57; exercicios-avaliacoes.service.ts:102.

Esses caminhos usam JSON.parse com cast, sem validação de formato. Por exemplo, palavrasChave ausente ou string chega a join no Reviewer e causa TypeError. A nota do Reviewer também não tem validação de tipo/faixa. Criterios de exercício malformado pode ser persistido e quebrar a correção posterior ao chamar map.

Correção: validar síntese, review e exercícios com schemas de runtime antes do uso/persistência, aproveitando o padrão já existente no Planner e na correção de tentativas.

### 9. [P2] Exclusão de objetivo deixa revisões apontando para itens apagados

Locais: mindforge-api/src/database/schema/revisao.schema.ts:29; método removerObjetivo de planner.service.ts; revisao-espacada.service.ts:61.

A exclusão apaga módulos/exercícios em cascata. revisao_espacada.item_id é polimórfico, sem FK. O fluxo não limpa revisões, e a listagem não verifica se o item existe. Após avaliar um exercício e excluir seu objetivo, sua revisão pode continuar aparecendo.

Correção: manter referências polimórficas na mesma transação da exclusão ou filtrar/remover órfãos explicitamente. A referência polimórfica é uma decisão documentada; o defeito é a falta de manutenção.

### 10. [P2] Revisão espaçada não oferece um fluxo para realizar a revisão

Locais: mindforge-web/app/revisao/page.tsx; exercicios-avaliacoes.controller.ts; avaliacoes.service.ts:210.

A página mostra tipo/data sem enunciado, título, link ou ação. O único consumidor de processarRevisao encontrado em produção é a submissão de avaliação. Responder novamente um exercício avulso não atualiza a agenda; reenviar a mesma avaliação retorna o resultado anterior.

Correção: criar fluxo que identifique o item, receba tentativa/qualidade e atualize SM-2, sem depender da criação de outra avaliação.

### 11. [P2] Controles de geração desaparecem após o primeiro item

Local: mindforge-web/app/modulos/[id]/page.tsx:228, :275 e :358.

Botões de gerar conteúdo, exercício e projeto existem apenas no ramo vazio das listas. Depois do primeiro exercício, não é possível gerar outro tipo pela tela. Depois do primeiro conteúdo, não é possível regenerá-lo quando incompleto ou sem imagem. A API oferece novas gerações, mas a interface deixa de expor a ação.

Correção: manter ações de criação/regeneração disponíveis também nas listas preenchidas.

### 12. [P2] Resultado do simulado é descartado pela interface

Local: mindforge-web/app/simulados/[id]/page.tsx:99.

O retorno de submeterAvaliacao.mutateAsync não é usado; a tela mostra um toast e redireciona ao dashboard. Nota, pontos fortes/fracos e recomendações não são apresentados nesse fluxo. O endpoint de detalhe também não inclui o resultado do perfil.

Correção: exibir o resultado e permitir sua recuperação depois de recarregar a página.

## Limpeza e referências de manutenção

- Sem consumidor de produção encontrado: BibliotecaVivaRepository.indexarChunk; ExerciciosAvaliacoesRepository.listarExerciciosPorModulos e listarModulosDaTrilha; KnowledgeGraphService.criarCadeiaDePreRequisitos. Este último só aparece em testes além da definição. São candidatos à consolidação, não prova automática de obsolescência.
- JobPoller aparece apenas na implementação e nos testes, sem importação pelas páginas. Sua existência não comprova integração visual de jobs. O hook usa intervalo fixo mesmo após estado terminal, e o componente não trata erro de consulta/job inexistente.
- RevisaoEspacadaService importa Drizzle e executa queries diretamente, contrariando a separação Service/Repository de AGENTS.md. É dívida de manutenção.
- AGENTS.md contém contagens antigas de testes e ainda menciona Research/Diário como próximo passo, embora as telas existam. A recomendação de regenerar conteúdo após quota de imagem esbarra no item 11.

## Prioridade de correção

1. Preservar Markdown e validar respostas de IA.
2. Corrigir conclusão de módulos, escopo do Tutor e vínculos de tentativas.
3. Corrigir criação/finalização de avaliações e exposição prematura de feedback.
4. Completar revisão espaçada, limpeza de órfãos e apresentação dos resultados.
5. Validar fontes, restaurar ações de geração e consolidar código/documentação sem consumidores.
