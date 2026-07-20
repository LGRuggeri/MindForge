# 00 — Visão

## MindForge — Documento de Visão

**Versão:** 3.0
*(Consolida o `Learning_OS_Visao_v2.md` original, já refletindo as decisões
técnicas tomadas: banco de dados modelado, Redis descartado, ORM definido.)*

---

## O que é

Um sistema pessoal — não comercial — para apoiar desenvolvimento contínuo de
conhecimento. A IA atua como pesquisadora, planejadora, professora,
avaliadora e mentora ao longo de toda a jornada de aprendizagem.

Os princípios que orientam as escolhas técnicas deste projeto estão em
[`01-filosofia.md`](01-filosofia.md). A arquitetura técnica está detalhada em
[`02-arquitetura.md`](02-arquitetura.md), a stack em
[`03-stack-tecnologica.md`](03-stack-tecnologica.md) e o modelo de dados em
[`04-modelagem-dados.md`](04-modelagem-dados.md).

## Objetivos

- Aprender qualquer assunto sob demanda.
- Gerar planos de estudo personalizados.
- Produzir material didático original a partir de fontes confiáveis
  encontradas na internet.
- Criar exercícios, projetos e avaliações.
- Apontar erros e acertos, verificando o que melhorar a cada tentativa.
- Registrar o histórico de aprendizagem.
- Adaptar continuamente o plano conforme a evolução do usuário.

## Fluxo macro

```text
Objetivo
  ↓
Pesquisa
  ↓
Síntese
  ↓
Plano de estudos
  ↓
Aulas
  ↓
Exercícios
  ↓
Projetos
  ↓
Avaliações
  ↓
Revisão espaçada
  ↓
Knowledge Graph
```

Cada etapa deste fluxo corresponde a um grupo de tabelas no banco de dados —
ver `04-modelagem-dados.md`, seção 3, para o mapeamento completo.

## Visão de longo prazo

Construir um sistema que acompanhe a evolução do usuário por muitos anos,
funcionando como um segundo cérebro para aprendizagem contínua. Não é um
produto para terceiros: é ferramenta pessoal, e isso é uma decisão
deliberada — ver `01-filosofia.md`.

## Fases (visão macro)

| Fase | Foco |
|---|---|
| **Fase 1** | Autenticação, definição de objetivos, planejamento, Tutor IA, dashboard. |
| **Fase 2** | RAG, Biblioteca Viva, Diário, Exercícios, Revisão espaçada. |
| **Fase 3** | Knowledge Graph, projetos inteligentes, simulados, avaliações avançadas. |

O roadmap detalhado com status real está em [`13-roadmap.md`](13-roadmap.md).
Ver também o índice em [`README.md`](README.md).
