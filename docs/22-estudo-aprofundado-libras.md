# Estudo aprofundado e piloto de Libras

Registro da primeira entrega, implementada em 03/10/2026. O objetivo é substituir a geração de resumos superficiais por aulas desenvolvidas e oferecer um primeiro percurso utilizável para Professor Intérprete de Libras.

A versão seguinte foi ampliada para 11 aulas, 26 questões de treino e 19 questões próprias de avaliação; consulte [o registro dessa entrega](23-percurso-libras-edital.md). O fluxo atual integra a grade ao catálogo em Objetivos: [Programas prontos por perfil](24-programas-por-perfil.md). As descrições de duas aulas e oito questões abaixo registram a primeira versão, preservada para quem já a instalou.

## Como usar

1. Aplique as migrations da API com `npm.cmd run db:migrate`, dentro de `mindforge-api`, usando o ambiente local configurado. A migration `0015_estudo_aprofundado` acrescenta campos opcionais; não altera os conteúdos, respostas ou resultados anteriores.
2. Inicie API e web conforme o guia de ambiente do projeto.
3. Acesse `/estudo/libras` pelo item **Libras** da navegação. A prévia das duas aulas pode ser lida antes de selecionar um perfil.
4. Selecione um perfil e clique em **Adicionar ao meu estudo**. O sistema cria um objetivo separado com dois módulos, aulas, referências, oito questões e avaliação formativa parcial.
5. Estude as aulas e atividades. Nos módulos, resolva as questões; quando houver alternativas, responda com a letra correspondente. A correção apresenta justificativa, análise de cada alternativa, fonte e tópico de revisão.
6. Abra a avaliação parcial, registre todas as respostas e finalize. Os comentários aparecem apenas no resultado final, que fica salvo para o perfil.

Adicionar novamente recupera os mesmos registros e preserva o progresso. Instalações simultâneas para o mesmo perfil são serializadas por transação. Perfis diferentes recebem percursos próprios. Um piloto existente com módulos ou avaliação removidos é sinalizado para revisão, sem substituição automática.

## Conteúdo desta entrega

| Aula | Desenvolvimento | Prática |
| --- | --- | --- |
| Educação especial e educação bilíngue | LDB, capítulos V e V-A; modalidade, acessibilidade e evidência; mapa conceitual; caso resolvido; erros de leitura | Atividades com critérios e quatro questões |
| Intérprete educacional | Atribuições; fidelidade, imparcialidade e sigilo; leitura de atualização profissional; jornada e revezamento; caso resolvido | Atividades com critérios e quatro questões |

As aulas são um material editorial versionado no catálogo, disponível sem uma chamada de geração de texto ou imagem. As referências utilizadas foram consultadas na [LDB compilada](https://www.planalto.gov.br/ccivil_03/leis/l9394.htm), na [Lei 14.191/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14191.htm), na [Lei 12.319/2010 compilada](https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12319.htm) e na [Lei 14.704/2023](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14704.htm). Há localizador, trecho curto e data registrados nas fontes do piloto. A data da consulta não certifica vigência posterior.

## Mudanças na geração por IA

O formulário de conteúdo agora oferece **Aula completa** (padrão), **Preparação para concurso** e **Resumo para revisão**. Permite informar até vinte tópicos obrigatórios, um por linha. Essa mudança afeta novas gerações; os materiais anteriores permanecem disponíveis.

Gerador e reviewer recebem o mesmo contexto: objetivo, descrição da trilha, nível, tópicos obrigatórios, instruções e fontes. O padrão de aula solicita explicações desenvolvidas, comparação de conceitos, exemplos resolvidos, casos, atividades com critérios, erros frequentes e revisão. O modo concurso acrescenta leitura de dispositivos, regras e exceções e questões autorais comentadas, sem inventar cobrança da banca.

A revisão utiliza quatro critérios com notas de 1 a 5: profundidade, cobertura, fundamentação e aplicação. Para aulas completas e de concurso, a aprovação exige nota global e todas as notas dos critérios pelo menos 3, rubrica completa e nenhum tópico pendente. A ausência de rubrica também impede aprovação. O resumo mantém o limiar global anterior por compatibilidade.

Conteúdos recusados podem ser reescritos até duas vezes. Se as lacunas persistirem, são salvos como rascunho e não entram na nova indexação do tutor nem na extração de competências. A interface informa esse resultado. Essa revisão automatizada é um filtro de qualidade, não certificação de correção normativa ou substituto da análise do estudante.

Os resumos de curadoria e URLs encontradas continuam identificados como não verificados. Os novos campos de evidência permanecem nulos em registros antigos; não foi implementado um leitor automático integral de fontes jurídicas. Não atribuir a um resumo de IA o valor de um trecho efetivamente consultado.

## Questões e imagens

O comentário é persistido separadamente do gabarito. Questões antigas sem comentário conservam a correção existente. O gerador por IA pede explicação, comentários das alternativas, referências disponíveis e tópico de revisão; a presença dos comentários no piloto é garantida pelo catálogo. O contrato de IA mantém o comentário opcional para compatibilidade com respostas antigas.

A geração e as listagens públicas de exercícios não retornam gabarito ou comentário. Nas tentativas de avaliação, nota, acerto e feedback ficam ocultos até finalizar, preservando o fluxo existente. O resultado final inclui uma cópia do feedback usado na correção.

O piloto utiliza um SVG didático com legenda e texto alternativo. A geração de até três imagens ilustrativas por IA continua disponível no Synthesizer, com degradação em caso de falha do provedor. Não foram geradas imagens de sinais: movimentos e configurações de mão exigem materiais identificados e revisão especializada. A aula indica o INES como ponto de partida para vídeos; não incorpora uma seleção de vídeos já validada.

Durante a conferência visual também foram corrigidos a variável de fonte que se referenciava a si mesma e o espaço da navegação em telas menores, para melhorar a leitura.

## Validação e limites

- Backend: CI com PostgreSQL 17 e pgvector, todas as 94 suítes executadas, 744 testes passando, sem skips. Cobertura global: linhas 93,50%, statements 93,39%, funções 86,13%, branches 83,47%.
- Banco: migration aplicada duas vezes sem reaplicação; testes de concorrência, preservação de estudos existentes, separação por perfil e feedback antes/depois da finalização.
- Front-end: suíte completa com 89 testes passando; testes relacionados reexecutados após os ajustes de tela; build de produção e lint.
- Navegador: leitura das aulas, carregamento do mapa, seleção de perfil, instalação, recuperação do percurso existente, resposta às oito questões e finalização com oito comentários e tópicos de revisão. Capturas em [desktop](assets/estudo-libras/aula-desktop.png) e [mobile](assets/estudo-libras/aula-mobile.png).

Os testes iniciais de banco e navegador usaram banco local isolado. A validação não consumiu provedores externos de IA: a qualidade efetiva de novas respostas por modelo deve ser avaliada depois com exemplos reais. O enfileiramento dos textos para o tutor foi exercitado; embeddings reais não foram validados nessa execução. A leitura, as questões e a correção determinística do piloto funcionam independentemente deles.

Em 03/10/2026, com autorização do usuário, a migration `0015_estudo_aprofundado` foi aplicada ao banco pessoal configurado (`mindforge`, porta 5433). Foi iniciado o container existente `mindforge-postgres`, preservando seu volume; a versão efetiva desse ambiente é PostgreSQL 15.4. O journal passou de 15 para 16 migrations e o hash da última corresponde ao arquivo aplicado. Foram conferidas as quatro colunas opcionais: `fontes_pesquisa.trecho_consultado`, `fontes_pesquisa.localizador`, `fontes_pesquisa.consultado_em` e `exercicios.comentario`. As contagens antes e depois permaneceram iguais: um perfil e nenhum conteúdo, exercício, resultado ou fonte de pesquisa. O container permaneceu em execução. Não houve instalação automática do piloto num perfil pessoal.

## Continuidade registrada na primeira entrega

Esta é uma **avaliação parcial**, com as mesmas oito questões disponíveis para treino. A repetição ajuda a revisar e testar o fluxo, mas não mede domínio independente. As questões são autorais, com quatro alternativas como escolha didática; não são questões oficiais do IBAM.

Ainda falta desenvolver o restante do programa: legislação e política catarinense, Decreto 12.686/2025 e alterações, PNEBS, história e concepções de Libras, cultura e identidade surda, aquisição e ensino, português como L2, modelos de interpretação, história profissional e tecnologia assistiva. Os núcleos comuns de Português e Legislação/raciocínio lógico e a composição integral de trinta questões também ficam para a próxima etapa.

O [plano de estudo do edital](plano-estudo-concurso-libras-2026-10-03.md) contém a matriz e a sequência propostas. A amostra editorial inicial permanece como registro de proposta; o catálogo e esta documentação descrevem a entrega implementada.
