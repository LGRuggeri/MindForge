# 15 — Projetos Inteligentes

**Status:** ✅ implementado.

## 1. O que são

Projetos inteligentes são tarefas práticas geradas pela IA a partir de um módulo ou objetivo. Diferente de exercícios pontuais, projetos exigem uma entrega mais elaborada e suportam feedback iterativo.

## 2. Modelo

| Tabela | Papel |
|---|---|
| `projetos` | Título, descrição, critérios, dicas, status |
| `projeto_entregas` | Conteúdo da entrega, pontuação e feedback |

Status de um projeto:
- `pendente` — criado, aguardando primeira entrega
- `em_andamento` — pelo menos uma entrega submetida
- `concluido` — marcado como concluído manualmente

## 3. API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/projetos` | Cria projeto manualmente |
| `POST` | `/projetos/gerar` | Gera projeto via IA (`evaluator`) |
| `GET` | `/projetos?moduloId=` | Lista projetos do módulo |
| `GET` | `/projetos?objetivoId=` | Lista projetos do objetivo |
| `GET` | `/projetos/:id` | Busca projeto com entregas |
| `POST` | `/projetos/:id/entregas` | Submete uma entrega |
| `POST` | `/projetos/:id/concluir` | Marca projeto como concluído |

## 4. Geração

A geração usa o agente `evaluator` com contexto da Biblioteca Viva. O retorno é estruturado:

```json
{
  "titulo": "...",
  "descricao": "...",
  "criterios": ["..."],
  "dicas": ["..."]
}
```

## 5. Correção de entregas

Cada entrega é corrigida pelo `evaluator` com base na descrição e critérios. O feedback e a nota são persistidos. Se a nota for ≥ 7, o progresso no knowledge graph do módulo vinculado é atualizado.

## 6. Frontend

- Aba **Projetos** na página `/modulos/[id]`.
- Botão "Gerar projeto inteligente".
- Página `/projetos/[id]` para visualizar, submeter entregas e acompanhar histórico.
