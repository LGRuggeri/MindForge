# PCI Concursos no Codex

Configurado e verificado em 04/10/2026, conforme a preferência do usuário: consultas pelo Codex primeiro; integração com Objetivos permanece uma possibilidade posterior.

## Configuração aplicada

O arquivo [`.codex/config.toml`](../.codex/config.toml) habilita `pci-concursos` neste projeto, usando Streamable HTTP em `https://mcp.pciconcursos.com.br/mcp`.

- Cinco ferramentas de consulta habilitadas: `listar_concursos`, `pesquisar_concursos`, `buscar_por_cargo`, `buscar_por_cidade` e `buscar_apostilas`.
- Timeout de inicialização de 20 segundos e de ferramenta de 30 segundos.
- Servidor opcional: sua indisponibilidade não deve impedir a inicialização do restante do Codex.
- Sem chave, token ou OAuth na configuração. O teste público não exigiu autenticação.
- Projeto já marcado como confiável na configuração existente. A configuração global e os demais conectores foram preservados.

O Codex carrega configuração por projeto em `.codex/config.toml` quando o projeto é confiável. Referência: [MCP no Codex](https://developers.openai.com/codex/mcp).

## Como usar

Abra uma nova sessão do Codex no diretório MindForge para carregar o novo conector. No CLI interativo, `/mcp` permite conferir os servidores; no terminal, a configuração pode ser consultada sem executar um modelo:

```powershell
codex mcp get pci-concursos --json
```

Exemplos de pedidos:

- “Consulte a PCI e procure concursos para intérprete de Libras em Santa Catarina.”
- “Quais concursos para professores estão abertos na região Sul?”
- “Pesquise concursos em Balneário Piçarras, SC, e mostre os prazos e os links.”

As buscas de concursos usam inscrições abertas. O filtro de UF de cargo/termo também inclui a macro-região e concursos nacionais, conforme o contrato do servidor; confira a localização de cada resultado. Use notícias como descoberta e confira edital/retificações no órgão ou na banca.

## Custos

Em 04/10/2026, a PCI anuncia o MCP como **beta pública gratuita**. Não foi exigida assinatura, chave ou compra para configurar e testar a conexão. Isso descreve as condições atuais, sem garantir que a beta permaneça gratuita: [página oficial](https://www.pciconcursos.com.br/mcp-e-gpt).

O uso da IA continua sujeito ao plano, às cotas ou à cobrança por API do cliente/provedor utilizado. Esta configuração não contrata outro provedor nem troca o modelo. O teste executou JSON-RPC diretamente, sem chamada de LLM. `buscar_apostilas` retorna um catálogo comercial; as apostilas são compras opcionais, não conteúdo gratuito fornecido pelo MCP. Nenhuma compra foi realizada.

## Validação

- `codex mcp get pci-concursos --json` confirmou o servidor habilitado, endpoint e cinco ferramentas, sem flags temporárias ou mudanças no arquivo global.
- `initialize`, `notifications/initialized` e `tools/list` confirmaram protocolo `2025-06-18` e servidor `Concursos Públicos Brasil`, versão `1.0.0`.
- `buscar_por_cargo`, com intérprete de Libras e UF SC, retornou dois concursos sem erro de ferramenta.
- Evidência: [configuracao-20261004.json](assets/pci-mcp/configuracao-20261004.json).
- Verificação repetível: [`.tools/validation/verificar-pci-mcp.cjs`](../.tools/validation/verificar-pci-mcp.cjs), lendo o endpoint do arquivo do projeto. Não consome LLM; a amostra é opcional:

```powershell
node .tools/validation/verificar-pci-mcp.cjs --amostra
```

A validação confirma reconhecimento da configuração e comunicação direta com o servidor. A descoberta das ferramentas no catálogo da sessão do Codex será observada ao abrir uma nova sessão; a sessão usada na configuração não foi reiniciada automaticamente.

## Uso futuro na tela de Objetivos

A configuração do Codex não é consumida pela API NestJS. A tela de Objetivos ainda precisará de um adaptador próprio para a PCI, busca/seleção de cargo e entrada do edital. A proposta está em [27-pci-concursos-mcp.md](27-pci-concursos-mcp.md).

Não foram instaladas dependências, criadas rotas, aplicadas migrations ou feitas alterações nos estudos pessoais nesta configuração. A importação de editais e provas permanece uma entrega separada; as ferramentas disponíveis não fornecem questões, gabaritos ou o inteiro teor das apostilas.
