# Mídia e integração Agent KB

Contratos verificados no lote 4 do [plano de cobertura](plano-cobertura-80-2026-09-14.md), em 14/09/2026.

## Áudio e imagens

- `POST /midia/audio` aceita `texto` com 1–10.000 caracteres, `idioma` opcional e `voz` opcional no formato de voz neural. Retorna o binário com `Content-Type: audio/mpeg`; a mesma combinação de provedor, texto, idioma e voz reutiliza o cache. A validação rejeita campos extras antes da síntese.
- Edge-TTS reconhece `Path` nos cabeçalhos das mensagens. Texto no corpo não encerra a síntese. Frames truncados, erro do socket, fechamento prematuro e timeout rejeitam a operação; áudio parcial não é persistido. O prazo é o maior entre 30 segundos e 10 ms por caractere.
- Ao finalizar, remove os handlers de síntese e cancela o timer. Erros encerram a conexão com `terminate`; sucesso inicia o fechamento normal. Um listener temporário absorve erros tardios do handshake e é removido quando o socket fecha.
- Geração de imagens aceita resposta JSON validada com MIME PNG/JPEG e base64 não vazio. Falhas de transporte, HTTP, JSON ou conteúdo inesperado geram indisponibilidade controlada; a síntese didática mantém sua degradação sem ilustração. Essa validação não decodifica a imagem para comprovar integridade visual.
- Logs de falhas externas não incluem corpo de resposta, prompt, texto do áudio, chave de API ou stack do transporte.

## Cache em disco

`MIDIA_DIR` define a pasta. Os nomes continuam no formato `imagem-<hash>.png` ou `audio-<hash>.mp3`, com 32 dígitos hexadecimais derivados de SHA-256; JPG, WAV, OGG e BIN também são reconhecidos pelo storage.

As escritas de binário e sidecar usam arquivos temporários exclusivos. O binário final só é publicado por renomeação depois de ambas as escritas terem terminado. Falhas anteriores à publicação preservam o binário existente; temporários são removidos no encerramento quando o filesystem permite. As duas renomeações não constituem uma transação conjunta: o sidecar pode ser atualizado antes de uma falha na publicação do binário. O sidecar é opcional e não determina um MIME diferente daquele reconhecido pela extensão.

Leitura aceita somente nomes gerados pelo storage e arquivos regulares, recusando traversal, symlinks, temporários e arquivos de metadados. JSON ausente, inválido ou com MIME incompatível usa o MIME da extensão. Arquivo removido entre listagem e leitura resulta em cache miss. `GET /midia/imagem/:arquivo` serve o arquivo ou retorna 404; não expõe o sidecar JSON.

## Subprocesso Agent KB

`AGENT_KB_ENABLED`, `AGENT_KB_SCRIPT_PATH` e `AGENT_KB_PROJECT_ID` precisam estar configurados para disponibilizar a integração. Os testes simulam o processo; não executam o script nem escrevem na memória pessoal.

- Projeto é resolvido por slug ou UUID e seu UUID é reaproveitado nas operações seguintes. Durante `ensureProject`, o identificador configurado tem precedência; a compatibilidade por nome é usada somente quando não há correspondência. Depois de criar um projeto, `project get` busca o registro completo.
- Contratos em `contratos-agent-kb.ts` validam JSON desconhecido antes do consumo. `core_objective` vira `coreObjective`; o recibo de `memory add` é combinado com os dados enviados; a busca extrai `results` e converte `final_score` em `score`; o tipo de memória do contexto é normalizado para `node_type`.
- Execução usa `execFile`, argumentos separados, timeout de 60 segundos, buffer máximo de 10 MiB, UTF-8 e janela oculta no Windows. Erro, timeout ou saída inválida produzem uma mensagem fixa sem argumentos, stderr ou conteúdo privado.
- O bootstrap aguarda a sincronização dos 16 ADRs cadastrados em código. Falha encerra essa tentativa sem abortar o startup. A sincronização ainda adiciona registros a cada inicialização; deduplicação de ADRs não foi implementada neste lote.

## Validação

Specs do lote usam socket e subprocesso simulados, diretórios temporários próprios e aplicação Nest ouvindo somente em loopback. Cobrem respostas binárias, cache, DTOs, falhas de escrita, frames, limpeza de recursos e contratos reais do CLI por fixtures. Não verificam a disponibilidade atual dos serviços públicos de voz/imagem.

Resultados globais, SQL e limites restantes estão na seção de resultado do lote 4 do [plano de cobertura](plano-cobertura-80-2026-09-14.md).
