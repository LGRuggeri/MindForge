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

## 4. Revisão espaçada (schema pronto, lógica ✅)

`revisao_espacada` é polimórfica (`item_tipo` + `item_id`) estilo SM-2. ✅ Implementado com cálculo de intervalo, repetição e fator de facilidade.
Tentativa incorreta ou avaliação fraca deve reforçar/resetar intervalo ⬜ (hoje apenas cria registro; reset não está testado).

## 5. Pontos em aberto

- Sandbox para exercícios de código (container efêmero?) — só decidir na implementação do tipo `codigo`
- Síncrono vs assíncrono por tipo de avaliação (ver `05-agentes-ia.md`)
- Integração completa com diário e replanejamento após avaliação fraca
