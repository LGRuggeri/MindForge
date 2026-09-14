# 20 — Sandbox de código

Implementado em 14/09/2026 para o ambiente pessoal local. Exercícios do tipo `codigo`, tanto no módulo quanto no simulado, permitem testar **Python 3.13** ou **JavaScript (Node 22)**, informar entrada padrão e consultar saída/erros antes de submeter a resposta.

## Preparação e uso

O processo da API precisa acessar o Docker com containers Linux. Dentro de `mindforge-api/`:

```sh
docker pull python:3.13-slim-bookworm
docker pull node:22-bookworm-slim
npm run test:sandbox
```

Configure no `.env` da API e reinicie a API:

```dotenv
SANDBOX_ENABLED=true
SANDBOX_TEMPO_MS=5000
SANDBOX_PYTHON_IMAGE=python:3.13-slim-bookworm
SANDBOX_JAVASCRIPT_IMAGE=node:22-bookworm-slim
```

O padrão é desativado; não há download automático durante requisições. As imagens podem ser fixadas por digest nas duas variáveis. Os digests usados na validação local foram `python@sha256:ed86c82274b3c69b52fb5820f358f0bd7df0b603332063cb5c6e32bd220c3e6e` e `node@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5`.

1. Abra um exercício de código e escreva a resposta no editor existente.
2. Escolha a linguagem e, se necessário, forneça a entrada lida por `input()` ou `stdin`.
3. Clique em **Executar código**. A saída aparece abaixo; falhas preservam o editor.
4. Use **Submeter resposta** quando quiser registrar a tentativa e obter a correção já existente.

Executar não salva tentativa, não atribui nota e não atualiza revisão ou grafo. Encerrar/recarregar a página descarta entrada, linguagem selecionada e saída de teste. O código enviado para correção continua persistido pelo fluxo de tentativas. Não há instalação de pacotes, acesso à rede ou arquivos persistentes neste incremento.

## Contrato e limites

`POST /sandbox/exercicios/:id/executar`, HTTP 200 quando o programa foi executado, mesmo se houver erro no programa:

```json
{
  "perfilId": "223e4567-e89b-42d3-a456-426614174000",
  "linguagem": "python",
  "codigo": "print('Olá, ' + input())",
  "entrada": "Maria"
}
```

Retorna `status`, `stdout`, `stderr`, `codigoSaida` (nulo quando a CLI foi interrompida) e `duracaoMs` (inclui preparação/inicialização). Status: `concluido`, `erro`, `limite_tempo`, `limite_saida`, `limite_memoria`. O código 137 sem OOM é tratado como interrupção por prazo; um programa que se encerra deliberadamente com esse código também recebe essa classificação.

| Limite | Valor |
|---|---|
| Código / entrada | 16.000 / 4.000 caracteres |
| Prazo do programa | 5 s padrão; configuração entre 500 e 10.000 ms |
| Memória / CPU / processos | 128 MiB, 0,5 CPU, 32 processos |
| Arquivos temporários | `/tmp` em tmpfs de 16 MiB; raiz somente leitura |
| Saída capturada | 32 KiB combinados entre stdout e stderr |
| Concorrência | Duas execuções por processo da API; excedente recebe 429 |

Erros: 400 para payload/tipo inválido; 403 para perfil incorreto ou acesso não local; 404 para exercício inexistente; 503 se desativado, Docker/imagem indisponível ou limpeza não confirmada. Sem mensagens internas do host no erro HTTP.

## Isolamento e operação

O controller aceita somente conexão de loopback, Host local e Origin configurado em `FRONTEND_URL` (ou ausência de Origin para clientes locais). Não confia em `X-Forwarded-For`. Isso é uma restrição de implantação local; `perfilId` não é uma identidade autenticada.

Cada execução cria um container com nome aleatório, rede desativada, sem volumes do host, socket Docker, portas ou variáveis da API. Usa `no-new-privileges`, seccomp padrão do Docker, `cap-drop=ALL`, raiz somente leitura e limites de recursos. A CLI é iniciada com argumentos separados, `shell:false` e janela oculta no Windows. O código chega como JSON no stdin; launchers fixos o gravam apenas no tmpfs.

O supervisor de prazo roda como UID 0 dentro do container com apenas `SETUID`, `SETGID` e `KILL`. Antes de executar qualquer código do aluno, os launchers removem grupos suplementares e mudam GID/UID para 65534, descartando capacidades. Assim, o programa não pode suspender o supervisor com um sinal. `timeout` encerra o grupo e o init encerra os processos restantes quando o supervisor termina; há também prazo externo na API.

Um supervisor fixo `/bin/sh`, também dentro do container, envolve o `timeout` e consulta `oom_kill` em `/sys/fs/cgroup/memory.events` antes de encerrar. O contador do cgroup v2 confirma o limite de memória mesmo quando o runtime perde o evento usado por `docker inspect` (`OOMKilled`). O código de saída 200 é reservado a esse diagnóstico; saída 200 do programa sem OOM vira erro comum (código 1). A consulta a `OOMKilled` continua como fonte adicional. O ambiente validado usa cgroup v2; em hosts sem `memory.events`, a classificação de memória depende do evento do Docker. Referências: [contador do kernel](https://cdn.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html) e [perda de eventos no containerd](https://github.com/containerd/containerd/issues/8893).

Na conclusão, falha, timeout ou saída excessiva, a API remove o container pelo nome gerado. Repete a limpeza uma vez; falha persistente bloqueia novas execuções e registra somente o identificador do container. Verifique o Docker, remova o container identificado e reinicie a API. Para inspeção: `docker ps -a --filter label=mindforge.sandbox=true`. Se a API for encerrada abruptamente, o prazo interno ainda termina o programa; pode restar um container parado para limpeza manual.

Docker compartilha o kernel e não substitui um executor dedicado para código hostil de múltiplos usuários. Autenticação e implantação pública continuam fora do escopo do projeto local.

## Verificação

- Testes Jest: DTO/HTTP, perfil, conexão local, concorrência, subprocesso, limites, diagnóstico e limpeza. PostgreSQL real confirma o proprietário e ausência de tentativas gravadas.
- `npm run test:sandbox`: 15 cenários reais de Docker, incluindo Python/JS, stdin Unicode, erro, loop, watchdog protegido, descarte de privilégios, memória, saída, rede e arquivos. Inclui OOM com o evento do Docker simulado como ausente e tentativa de forjar o diagnóstico nas duas linguagens. Comando separado da medição unitária/SQL, também incluído no workflow de CI.
- Vitest: componente com hooks reais e HTTP simulado; submissão separada, erro/repetição, bloqueios, linguagens, resultado desatualizado e renderização de saída como texto.
- Navegador: API completa real, PostgreSQL CI e Docker; execução Python no módulo, timeout e JavaScript no simulado. Desktop 1440×1000 e celular 390×844, sem rolagem horizontal. Nenhuma correção enviada nem chamada a LLM. Sem erros de console; aviso de preload de CSS do Next após navegação rápida, sem impacto visual observado.

Referências: [execução de containers](https://docs.docker.com/engine/containers/run/) e [segurança do Docker](https://docs.docker.com/engine/security/). Plano e métricas em [plano do sandbox](plano-sandbox-2026-09-14.md).
