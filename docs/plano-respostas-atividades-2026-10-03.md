# Respostas às atividades dentro da aula

Correção solicitada em 03/10/2026: as perguntas da seção Atividades são exibidas, mas não possuem campo para responder. O escopo é permitir escrever, salvar, retomar e editar cada resposta dentro do conteúdo, mantendo seu vínculo com o perfil. Critérios de resposta existentes continuam consultáveis; correção automática e notas das atividades não fazem parte desta alteração.

## Implementação

1. Reconhecer listas de perguntas nas seções Atividades do Markdown, incluindo aulas existentes. Não tratar exemplos, blocos de código, critérios recolhidos ou perguntas de outras seções como atividades.
2. Criar tabela de respostas com conteúdo, perfil, chave estável da atividade, enunciado, texto e data. Migration aditiva, sem converter atividades em exercícios ou alterar aulas anteriores.
3. API de listagem e salvamento valida propriedade do conteúdo e existência da atividade. Enunciado e chave são conferidos no servidor. Gravação com upsert permite editar a resposta.
4. Na renderização da aula, inserir campo e botão abaixo da pergunta reconhecida. Consultas e estado separados por perfil/conteúdo; conservar texto após falha de salvamento.
5. Orientar gerações futuras a organizar atividades em lista numerada na seção Atividades. Validar aulas legadas, persistência, edição, limites e separação por perfil.
6. Executar testes, lint, builds, migration no banco local, conferência no navegador isolado e atualizar o ambiente pessoal já autorizado.

## Critério de conclusão

Perguntas dentro da aula possuem campos acessíveis; salvar e reabrir recupera a resposta; editar atualiza somente a atividade correspondente. Perfil diferente não pode consultar ou gravar essas respostas. Aulas e respostas existentes são preservadas. Provas e exercícios extras continuam com seu fluxo atual.

## Conclusão em 03/10/2026

Etapas concluídas. Implementação e evidências em [25-atividades-conteudo.md](25-atividades-conteudo.md). API com SQL: 781 testes aprovados; frontend: 106. Builds e lint aprovados, migration aplicada ao banco pessoal e navegação real conferida em desktop e celular, incluindo salvamento, conservação de outro rascunho, reabertura e edição. Servidor pessoal atualizado em `http://localhost:3001`.
