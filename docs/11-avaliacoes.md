# 11 — Exercícios e Avaliações

**Status:** ✅ módulo de exercícios implementado e testado. Avaliações compostas e revisão espaçada SM-2 implementadas.  
**Agente:** `evaluator`

---

## 1. Responsabilidade

Dois momentos do fluxo:

1. **Exercícios** — prática ligada a um módulo  
2. **Avaliações** — agrupamentos formais (diagnóstica, formativa, somativa, simulado)

Ambos compartilham o agente `evaluator`.

---

## 2. Modelo (já no banco)

| Tabela | Papel |
|---|---|
| `exercicios` | tipos: `questao_objetiva`, `dissertativa`, `codigo`, `projeto` |
| `tentativas_exercicio` | resposta, correta, pontuação, `feedback_ia` |
| `avaliacoes` | tipos: `diagnostica`, `formativa`, `somativa`, `simulado` |
| `avaliacao_exercicios` | N:N com ordem |
| `resultados_avaliacao` | consolidado: fortes, fracos, recomendações |

---

## 3. Design pretendido

- Geração de exercício a partir do módulo + conteúdo + nível ✅
- Correção:
  - objetiva: comparação + feedback ✅
  - dissertativa/código: critérios via LLM ✅
- Avaliação composta gera `resultados_avaliacao` e pode:
  - alimentar diário ⬜
  - disparar replanejamento ⬜
  - criar/atualizar itens de `revisao_espacada` ✅

## 4. Revisão espaçada (lógica e sessão de revisão ✅)

`revisao_espacada` é polimórfica (`item_tipo` + `item_id`) estilo SM-2. ✅ Implementado com cálculo de intervalo, repetição e fator de facilidade.
Em 13/09/2026, a página `/revisao` passou a permitir realizar os itens de hoje e atrasados. O aluno abre o item, tenta lembrar, consulta o gabarito/material e informa sua qualidade de lembrança. A autoavaliação atualiza o SM-2; não cria uma tentativa de exercício nem altera notas de avaliações.

- `GET /exercicios-avaliacoes/revisao?perfilId=...`: agenda do perfil, filtrando itens removidos ou sem vínculo ao perfil. `data` continua sendo um filtro opcional por dia exato.
- `GET /exercicios-avaliacoes/revisao/:id?perfilId=...`: material de exercício, conteúdo ou competência. Exercícios incluem o gabarito disponível, revelado na interface após a tentativa de lembrar.
- `POST /exercicios-avaliacoes/revisao/:id/concluir`: recebe `perfilId`, `qualidade` (inteiro de 0 a 5) e `proximaRevisaoEsperada` (`AAAA-MM-DD`, obtida no detalhe).
- Qualidade abaixo de 3 reinicia as repetições e agenda para o dia seguinte. A segunda lembrança satisfatória gera intervalo de seis dias; as demais seguem o cálculo SM-2 existente.
- Revisões futuras são recusadas. Reenvios de uma data já reagendada e alterações concorrentes retornam 409. A atualização compara o estado persistido para evitar sobrescrever outra atualização.
- Rascunhos ficam somente na sessão da interface. Trocar o perfil limpa a sessão; erros de gravação preservam o rascunho.

A criação automática inicial da agenda continua ocorrendo na submissão de avaliações. Agendamento por tentativas avulsas e proteção de unicidade na criação concorrente de novos registros continuam pendentes. Não foi necessária migration neste marco.

## 5. Simulados multi-módulo ✅

Criar uma avaliação do tipo `simulado` passando apenas `trilhaId` sorteia automaticamente exercícios de todos os módulos da trilha.

```http
POST /exercicios-avaliacoes/avaliacoes
{
  "trilhaId": "...",
  "titulo": "Simulado - Rust",
  "tipo": "simulado",
  "quantidade": 10
}
```

- `quantidade` é opcional (padrão 10).
- Se a trilha tiver menos exercícios do que a quantidade solicitada, todos são usados.
- A submissão do simulado atualiza o progresso no knowledge graph para **todos os módulos** dos exercícios respondidos (nota ≥ 7).
- Frontend: botão "Criar simulado" na página do objetivo + página `/simulados/[id]` para responder.

## 6. Pontos em aberto

- Sandbox local para exercícios de código: ✅ Python/JavaScript em containers efêmeros, entrada e saída nas telas de módulo/simulado, independente da correção. Configuração e limites em [20-sandbox.md](20-sandbox.md).
- Síncrono vs assíncrono por tipo de avaliação (ver `05-agentes-ia.md`)
- Integração completa com diário e replanejamento após avaliação fraca


## 7. Consistência de avaliações e tentativas (14/09/2026)

- A criação exige `moduloId` ou `trilhaId` existente com perfil proprietário. Se ambos forem informados, o módulo precisa pertencer à trilha. Enviar somente `exerciciosIds` deixa de ser aceito: informe também o escopo.
- Os exercícios devem ser únicos, existir e pertencer ao módulo/trilha. Avaliações sem exercícios são recusadas, inclusive simulados cujo sorteio não tenha candidatos.
- Antes de corrigir ou enfileirar uma tentativa, a API valida o perfil dono do módulo. Com `avaliacaoId`, também valida a avaliação, o vínculo do exercício e a ausência de resultado final. O worker realiza as mesmas verificações.
- A resposta de uma tentativa vinculada à avaliação retorna `correta`, `pontuacao` e `feedbackIa` como `null`, além de `feedback` neutro. A correção completa permanece no banco. Tentativas avulsas continuam retornando nota e feedback.
- Tentativas e finalização bloqueiam a mesma linha da avaliação em transação. Uma tentativa que chega após a finalização é recusada com 409, mesmo se a correção começou antes.
- Na submissão, respostas duplicadas, exercícios externos e IDs de tentativa que não correspondem ao exercício/avaliação/perfil são recusados. Exercício omitido continua contando como zero; reenviar avaliação finalizada retorna o resultado existente.
- Avaliações legadas vazias não podem ser finalizadas; a tela desativa o botão e orienta criar outra. Registros antigos não são alterados automaticamente.

## 8. Consulta e apresentação do resultado (14/09/2026)

`GET /exercicios-avaliacoes/avaliacoes/:id/resultado?perfilId=UUID` recupera o resultado final salvo. Ambos os UUIDs são obrigatórios e validados. A avaliação deve pertencer ao perfil informado pelo módulo ou trilha: perfil incorreto recebe 403, avaliação inexistente 404 e registro sem proprietário 400.

Antes da finalização, a resposta é `{ "resultado": null }`. Depois, contém o registro persistido com `pontuacaoTotal`, `pontosFortes`, `pontosFracos` e `recomendacoes`. As listas JSON e os formatos antigos com quebras de linha são normalizados para arrays. O GET não corrige respostas, não altera a agenda e não atualiza o grafo.

A página `/simulados/[id]` permanece aberta após finalizar e apresenta nota em escala de 0 a 10, pontos fortes, pontos a revisar e recomendações. O retorno da submissão atualiza o cache; reabrir ou recarregar consulta o resultado persistido. Nenhum formulário de respostas é exibido para um resultado finalizado.

O cache é separado por avaliação e perfil. A sessão local também tem essa chave: mudar o contexto limpa respostas e IDs de tentativas. A consulta revalida ao montar e ao recuperar o foco; enquanto confirma um resultado nulo em cache, bloqueia o formulário. Isso cobre finalização persistida cuja resposta HTTP se perdeu. Erros de consulta têm ação para tentar novamente; falha ao finalizar mantém respostas/tentativas para novo envio idempotente.

O feedback por questão continua oculto antes da finalização. O resultado apresentado contém o resumo persistido; não acrescenta gabaritos ou correções individuais à consulta. Testes HTTP verificam escopo e contratos; teste PostgreSQL recupera o resultado em outra conexão sem repetir efeitos. Sem migration. Detalhes da entrega em [geração e resultados](plano-geracao-resultados-2026-09-14.md).
