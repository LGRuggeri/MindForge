# Pesquisa antes da geração de aulas

Implementado em 03/10/2026.

## Comportamento

O catálogo de grades define assuntos e referências iniciais. Escolher uma grade cria a trilha do perfil; não implica que as aulas estejam atualizadas. Abrir um módulo exibe os materiais já registrados, sem gerar outra aula automaticamente.

No módulo, **Pesquisar e gerar conteúdo** executa uma nova busca web, faz a curadoria das fontes encontradas e só então sintetiza e revisa a aula. A pesquisa está habilitada por padrão, inclusive quando a API recebe uma geração sem informar `atualizarFontes` e quando a geração roda pelo worker.

Uma nova aula é inserida sem substituir as anteriores. As respostas das atividades permanecem vinculadas ao conteúdo original. Cada aula mostra sua data de geração e seu registro de pesquisa. Materiais antigos permanecem sem data de pesquisa; a migration não inventa esse histórico.

Se o buscador falhar, não retornar resultados utilizáveis ou a curadoria não escolher fontes da busca, a geração com atualização retorna HTTP 503 antes da síntese. O formulário mantém o foco digitado e exibe o erro. Para usar apenas referências existentes, o usuário pode desmarcar **Pesquisar fontes na web antes de gerar**; essa aula recebe a indicação de geração com fontes salvas.

## Implementação

- `GerarConteudoDto.atualizarFontes`: booleano opcional; somente `false` desabilita a pesquisa.
- `ResearchService.pesquisarAtualizado`: busca obrigatória, sem fallback silencioso para sugestões da IA. O fluxo manual anterior de Research continua disponível.
- A consulta usa o foco informado e até dois tópicos obrigatórios da grade, limitada a 800 caracteres. O buscador recebe limite de dez resultados e a curadoria seleciona até oito fontes. Todos os tópicos obrigatórios continuam orientando a síntese e a revisão; a busca não comprova cobertura factual de cada tópico.
- Fontes desta pesquisa vêm primeiro no contexto. Referências salvas complementam sem repetir as URLs recém-encontradas; o contexto usa até vinte fontes.
- O trecho retornado pelo buscador acompanha o resumo da fonte, identificado como trecho de busca, sem preencher `trechoConsultado`, `localizador` ou `consultadoEm` como se a página tivesse sido lida.
- Migration `0018_pesquisa_conteudo`: coluna JSONB nullable `conteudos.atualizacao_fontes`, com tipo da geração, data da pesquisa, quantidade de resultados e quantidade de fontes selecionadas. Aplicada nos bancos isolado e pessoal, sem alterar conteúdos existentes.
- O catálogo agora aparece como **Grades de estudo** e é reconsultado ao montar a tela; a grade atual do concurso contém 27 módulos.

## Limites

Uma busca realizada agora pode encontrar páginas antigas. O sistema usa links e trechos do buscador e a curadoria da IA; não baixa nem lê automaticamente o inteiro teor de HTML/PDF. Também não verifica vigência de leis, alterações posteriores ou conformidade com a data de corte de um edital. O reviewer não substitui essa verificação.

Para ampliar a fundamentação, o próximo trabalho é consultar o inteiro teor de fontes oficiais, registrar página/artigo/data e comparar alterações com o edital. A integração PCI Concursos permanece uma investigação documentada em [27-pci-concursos-mcp.md](27-pci-concursos-mcp.md); este fluxo utiliza os provedores de pesquisa já existentes.

## Validação

- API: 104 suítes, 796 testes, sem skips, com PostgreSQL isolado. Cobertura: 93,78% statements, 84,15% branches, 87,24% functions, 94,02% lines.
- Frontend: 26 arquivos, 110 testes. Inclui pesquisa habilitada por padrão, opção de fontes salvas, aviso de erro, materiais antigos e campos de atividades preservados.
- Builds da API e do frontend concluídos. Lint sem erros; backend mantém avisos preexistentes, majoritariamente de CRLF.
- Fluxo HTTP/PostgreSQL e navegador testados com um provedor local de validação: ordem pesquisa → curadoria → síntese → revisão; persistência após recarregar; falha HTTP 503 sem criar conteúdo; geração explícita sem busca. Esses testes validam funcionamento, não qualidade de uma aula produzida por um modelo real.
- Uma busca real no DuckDuckGo configurado retornou cinco resultados. Nenhuma geração com provedor real foi solicitada na verificação.
- O filtro RFC 7807 expõe somente a mensagem fixa de `PesquisaIndisponivelException`; outros erros internos, inclusive HTTP 503, continuam redigidos. A orientação de tentar novamente ou usar fontes salvas foi confirmada no navegador.
- Ambiente pessoal: API e web HTTP 200, 19 migrations, atividades existentes acessíveis. Servidores atualizados mantidos em `localhost:3000` e `localhost:3001`.

Evidência do fluxo isolado: [validacao.json](assets/pesquisa-conteudo/validacao.json).
