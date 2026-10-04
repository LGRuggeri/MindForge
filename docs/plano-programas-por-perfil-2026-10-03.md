# Programas prontos dentro dos objetivos do perfil

## Objetivo e decisão

Integrar concursos ao catálogo de trilhas guiadas e permitir iniciar um objetivo pela escolha de um programa e dos módulos desejados. Retirar Libras da navegação global. A grade é um modelo compartilhado; objetivo, trilha, fontes, aulas geradas, exercícios e resultados pertencem ao perfil selecionado.

O usuário autorizou essa correção do fluxo em 03/10/2026. As melhorias de profundidade, revisão e alternativas selecionáveis continuam aplicadas. Conteúdos e resultados já existentes serão preservados.

## Implementação

1. Acrescentar o programa específico de Libras ao catálogo existente, com 11 módulos, tópicos e referências; não apresentar como preparação integral da prova.
2. Permitir escolher programas em Objetivos, visualizar a grade e selecionar um ou mais módulos. A criação de objetivo, trilha, módulos e referências selecionadas será transacional.
3. Registrar a seleção e a versão da grade na metadata existente. Regenerar a trilha deve preservar essa seleção. Validar programa, índices, duplicações e perfil antes de criar registros.
4. Levar o escopo do módulo escolhido ao formulário de geração e aos prompts do Synthesizer e Reviewer. Os tópicos da grade não podem ser eliminados por omissão no formulário.
5. Retirar Libras do menu e redirecionar o endereço anterior para Objetivos. Preservar estudos instalados, fontes e resultados; não converter ou apagar histórico automaticamente.
6. Validar escolhas, troca de perfil, rollback, separação entre perfis, escopo recebido pela IA e compatibilidade das trilhas livres e certificações. Testar builds, lint, cobertura e navegação real. Atualizar e reiniciar o ambiente pessoal que o usuário pediu para visualizar.

## Arquivos envolvidos

Planner (catálogo, DTOs, service, repository e testes), helper de escopo da grade, Synthesizer (contexto/requisitos e testes), Objetivos (programas e seleção), formulário de geração, tipos/hooks, navegação e redirecionamento. Usar a metadata já disponível evita alterar os registros existentes e dispensa nova migration.

## Critério de conclusão

Selecionar um programa sem digitar um objetivo cria o estudo no perfil ativo; escolher um módulo cria somente esse módulo; trocar de perfil não reutiliza dados ou rascunhos de outro perfil. Gerador e reviewer recebem o escopo da grade. Não há item Libras no menu. Estudos antigos continuam acessíveis em seus objetivos. Suítes apropriadas, compilação e lint aprovados; navegação validada e ambiente pessoal atualizado.

## Resultado da implementação

Concluído em 03/10/2026. Catálogo com seis programas, grade de Libras com onze módulos, criação transacional por perfil, seleção preservada na regeneração e escopo da grade levado ao Synthesizer, Reviewer e gerador de exercícios. Navegação sem Libras e endereço anterior redirecionado. Estudos existentes preservados, sem migration nova.

Validação: 98 suítes/768 testes na API com SQL e cobertura acima de 80% nas quatro métricas; 24 arquivos/102 testes no frontend; builds e lint aprovados; navegador real com criação de um módulo, troca de perfil e tela móvel. Ambiente pessoal atualizado e respondendo em `http://localhost:3001`, API em `http://localhost:3000`. O relato de uso, limites e evidências está em [Programas por perfil](24-programas-por-perfil.md).

## Limites da entrega

O sistema continua sendo local, com perfis de aprendizagem e sem autenticação multiusuário. Separação por perfil no fluxo não equivale a autorização de acesso entre usuários autenticados. A grade de Libras cobre conhecimentos específicos; núcleos comuns e simulado integral continuam pendentes. Fontes datadas não asseguram vigência posterior. Não instalar conteúdo pronto nem gerar por provedores externos sem uma ação do estudante.

Ampliação posterior em 03/10/2026: a grade passou a incluir os núcleos comuns em 16 novos módulos, totalizando 27. O programa e a validação dessa atualização estão em [26-nucleo-comum-concurso.md](26-nucleo-comum-concurso.md). O limite acima descreve a entrega inicial; o simulado integral permanece pendente.
