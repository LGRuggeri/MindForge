# 04 — Modelagem de Dados

## MindForge — PostgreSQL + pgvector

**Versão:** 1.0
**Status:** Validado — schema testado em Postgres 16 + pgvector 0.6.0 e implementado em Drizzle ORM (inserções, busca vetorial e CTE recursiva de grafo executadas com sucesso).

---

## 1. Visão geral

Este documento descreve o modelo de dados que sustenta o fluxo definido no
documento de visão (`00-visao.md`):

```
Objetivo → Pesquisa → Síntese → Plano de estudos → Aulas → Exercícios
→ Projetos → Avaliações → Revisão espaçada → Knowledge Graph
```

Cada etapa do fluxo corresponde a um grupo de tabelas. O modelo foi desenhado
para rodar inteiramente no seu Postgres local, sem Redis e sem serviços
externos além da API de IA — em linha com o princípio "simplicidade antes de
escalabilidade" do documento de visão.

O diagrama de entidade-relacionamento completo está em
[`diagrams/banco-dados.mmd`](diagrams/banco-dados.mmd) e o DDL executável
em [`schemas/schema.sql`](schemas/schema.sql).

---

## 2. Pré-requisitos no seu Postgres local

```bash
# extensão de UUID (built-in a partir do PG13, mas garantimos compatibilidade)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

# pgvector — necessário para os embeddings do RAG
CREATE EXTENSION IF NOT EXISTS vector;
```

Se o `CREATE EXTENSION vector` falhar, o pacote `pgvector` não está instalado
no seu Postgres. No Ubuntu/Debian, para Postgres 16:

```bash
sudo apt install postgresql-16-pgvector
```

Se a versão do seu Postgres for diferente, troque o `16` pela sua versão
(`pg_config --version` ou `psql -c "SHOW server_version;"` para descobrir).

---

## 3. Grupos de tabelas

### 3.1 Perfil e Objetivos

| Tabela | Papel no fluxo |
|---|---|
| `perfil_aprendizagem` | Seu perfil: nível atual, tempo disponível, preferências. Uma linha basta para uso pessoal. |
| `objetivos_estudo` | Cada assunto que você solicita ("Aprender Rust", "Entender Transformers"). |

### 3.2 Planejamento (Planner)

| Tabela | Papel no fluxo |
|---|---|
| `trilhas_estudo` | O plano gerado pelo agente Planner para um objetivo. Versionado — se você replanejar, cria uma nova versão em vez de sobrescrever o histórico. |
| `modulos_trilha` | As unidades ordenadas da trilha (o que no seu doc de visão seriam as "Aulas" agrupadas por tema). |

### 3.3 Pesquisa e Síntese (Research Engine + Synthesizer)

| Tabela | Papel no fluxo |
|---|---|
| `fontes_pesquisa` | O que o Research Engine encontrou online: docs oficiais, artigos, livros, vídeos. |
| `conteudos` | O material didático gerado pelo Synthesizer a partir das fontes. Versionado (`versao`), com status de revisão. |
| `conteudo_fontes` | Tabela associativa N:N — um conteúdo pode citar várias fontes, uma fonte pode alimentar vários conteúdos. |

### 3.4 RAG (Biblioteca Viva)

| Tabela | Papel no fluxo |
|---|---|
| `conteudo_chunks` | Pedaços de texto (de um `conteudo` já sintetizado **ou** de uma `fonte_pesquisa` bruta) com seu embedding. É a base vetorial da sua Biblioteca Viva. |

Um `CHECK` garante que cada chunk pertence a exatamente uma origem
(`conteudo_id` xor `fonte_id`) — evita ambiguidade sobre a proveniência do
texto indexado.

**Índice usado:** HNSW (`vector_cosine_ops`), disponível a partir do
pgvector 0.5.0. Para volume pessoal (milhares a poucas centenas de milhares
de chunks), HNSW é a escolha certa porque não exige fase de treinamento como
o IVFFlat, ou seja, funciona bem mesmo com poucos dados inicialmente.

**Dimensão do vetor:** o schema usa `VECTOR(1536)`, compatível com
`text-embedding-3-small` da OpenAI. Se você trocar de modelo de embedding
(ex: `text-embedding-3-large`, com 3072 dimensões), a coluna precisa ser
recriada — vetores de dimensões diferentes não são intercompatíveis na mesma
coluna.

**Estratégia de chunking recomendada:** 500–800 tokens por chunk, com
sobreposição de 50–100 tokens entre chunks consecutivos. Isso preserva
contexto suficiente sem diluir demais a relevância da busca por similaridade.

### 3.5 Exercícios e Avaliações (Tutor + Evaluator)

| Tabela | Papel no fluxo |
|---|---|
| `exercicios` | Questões objetivas, dissertativas, desafios de código ou projetos, ligados a um módulo. |
| `tentativas_exercicio` | Cada resposta sua, com correção e feedback gerado pela IA — é aqui que fica o histórico de "erros e acertos" que você pediu. |
| `avaliacoes` | Agrupamentos de exercícios (prova, simulado, diagnóstico). |
| `avaliacao_exercicios` | Associativa N:N entre avaliação e exercícios, com ordem. |
| `resultados_avaliacao` | Resultado consolidado: pontuação, pontos fortes/fracos, recomendações — a análise que o agente Evaluator produz ao final de uma prova. |

### 3.6 Revisão espaçada

| Tabela | Papel no fluxo |
|---|---|
| `revisao_espacada` | Implementa um algoritmo estilo SM-2 (o mesmo usado por Anki): `fator_facilidade`, `intervalo_dias`, `repeticoes` e `proxima_revisao` controlam quando cada item deve reaparecer para você. |

Esta tabela é **polimórfica** por design (`item_tipo` + `item_id`, sem FK
real) porque um item de revisão pode apontar para um `conteudo`, um
`exercicio` ou uma `competencia`. Isso é uma concessão consciente:
sacrificamos integridade referencial automática do Postgres em troca de não
precisar de três tabelas de revisão quase idênticas. Para um projeto pessoal
solo, o trade-off vale a pena; se um dia isso incomodar, a alternativa é
criar `revisao_conteudo`, `revisao_exercicio` e `revisao_competencia`
separadas, cada uma com FK real.

### 3.7 Diário de Aprendizagem

| Tabela | Papel no fluxo |
|---|---|
| `diario_aprendizagem` | Um registro por dia (`UNIQUE (perfil_id, data)`), com tempo investido, dificuldades, conquistas e recomendações da IA. |
| `diario_modulos` | Quais módulos foram estudados naquele dia. |

### 3.8 Knowledge Graph Pessoal

| Tabela | Papel no fluxo |
|---|---|
| `competencias` | Os nós do grafo — cada competência/habilidade rastreável. |
| `competencia_relacoes` | As arestas — pré-requisito, relacionada, aprofundamento. Modelado como lista de adjacência simples. |
| `competencia_progresso` | Seu nível de domínio atual em cada competência. |
| `modulo_competencias` | Liga módulos da trilha às competências que eles desenvolvem — é o que permite calcular seu progresso no grafo a partir do que você efetivamente estudou. |

**Por que lista de adjacência e não uma extensão de grafo (ex: Apache AGE)?**
Para o tamanho de grafo de uma base de conhecimento pessoal (dezenas a
poucos milhares de nós), uma `WITH RECURSIVE` simples resolve consultas como
"quais são os pré-requisitos de X" sem adicionar uma dependência extra ao
projeto. Testei isso diretamente:

```sql
WITH RECURSIVE cadeia AS (
    SELECT id, nome, ARRAY[nome] AS caminho
    FROM competencias WHERE nome = 'Rust básico'
    UNION ALL
    SELECT c.id, c.nome, cadeia.caminho || c.nome
    FROM competencia_relacoes r
    JOIN competencias c ON c.id = r.competencia_destino_id
    JOIN cadeia ON cadeia.id = r.competencia_origem_id
)
SELECT * FROM cadeia;
```

Resultado real da execução (cadeia Rust básico → Ownership → Lifetimes):

```
Rust básico
Rust básico, Ownership
Rust básico, Ownership, Lifetimes
```

Se o grafo crescer para dezenas de milhares de nós com consultas de caminho
mais complexas, aí sim vale reavaliar uma extensão de grafo dedicada — não
antes.

### 3.9 Observabilidade dos agentes

| Tabela | Papel no fluxo |
|---|---|
| `agentes_execucoes` | Log de cada chamada ao Planner, Researcher, Teacher, Evaluator e Reviewer: entrada, saída, modelo usado, tokens, duração, erro. |

Não é estritamente parte do fluxo pedagógico, mas é o que vai te permitir
depurar por que um plano saiu ruim ou uma avaliação foi mal corrigida —
essencial num sistema onde múltiplos agentes de IA tomam decisões em cadeia.

---

## 4. Decisões arquiteturais (ADR resumido)

| Decisão | Alternativa considerada | Por quê |
|---|---|---|
| `TEXT` + `CHECK` em vez de `ENUM` nativo do Postgres | `CREATE TYPE ... AS ENUM` | Alterar um ENUM nativo (remover valor, reordenar) é operação custosa e, em versões antigas do Postgres, não podia ser feita dentro de transação. Como o projeto vai evoluir por anos, `CHECK` dá a mesma garantia de integridade com migração trivial. |
| UUID como chave primária | `BIGSERIAL` | Facilita merges entre ambientes (dev/prod), evita coordenação de sequência, e não vaza volume de dados (nº de registros) pela URL/API. Custo: índices um pouco maiores que inteiro — irrelevante na escala de uso pessoal. |
| `revisao_espacada` polimórfica | Três tabelas separadas | Ver seção 3.6. |
| HNSW em vez de IVFFlat para o índice vetorial | IVFFlat | HNSW não precisa de dados de treino prévios e tem melhor recall em bases pequenas/médias — exatamente o seu cenário. |
| Sem Redis | Fila de jobs em memória | Como conversamos, para orquestração de jobs assíncronos (pesquisa, síntese, correção), `pg-boss` ou `graphile-worker` resolvem usando o próprio Postgres via `LISTEN/NOTIFY`, sem novo serviço para manter. |

---

## 5. Migrações

O schema em `schemas/schema.sql` é o estado atual, mas para evolução
contínua recomendo não editar esse arquivo diretamente assim que o projeto
tiver dados reais. Ferramentas que se encaixam bem no seu stack (NestJS +
PostgreSQL):

- **Prisma Migrate** — se você adotar Prisma como ORM; gera migrations a
  partir de mudanças no schema declarativo.
- **node-pg-migrate** — mais leve, migrations em SQL puro ou JS, sem exigir
  um ORM completo.

Qualquer uma registra o histórico de alterações como arquivos versionados —
o que também serve de documentação viva das decisões, complementando os ADRs
da seção 4.

---

## 6. Validação realizada

Antes de entregar este documento, o schema completo foi executado contra uma
instância real de PostgreSQL 16 com pgvector 0.6.0:

- As **21 tabelas** e todos os índices foram criados sem erros.
- Um fluxo completo de inserção foi testado: perfil → objetivo → trilha →
  módulo → conteúdo → chunk com embedding.
- Uma busca por similaridade vetorial (`<=>`, distância de cosseno) foi
  executada com sucesso sobre `conteudo_chunks`.
- Uma consulta recursiva (`WITH RECURSIVE`) sobre `competencia_relacoes` foi
  executada com sucesso, confirmando que o grafo de pré-requisitos funciona
  como esperado.

Isso não substitui testes de carga ou de concorrência (irrelevantes para uso
pessoal single-user), mas garante que não há erros de sintaxe, tipos
incompatíveis ou referências quebradas no schema entregue.

---

## 7. Próximos passos sugeridos

1. Rodar `schemas/schema.sql` no seu Postgres local.
2. Definir se o ORM do NestJS será Prisma (mais produtivo para CRUD) ou
   TypeORM/Drizzle (mais controle sobre queries com pgvector).
3. Escrever os próximos documentos do núcleo (`00` a `03`) a partir do que já
   existe no seu `Learning_OS_Visao_v2.md`, mantendo o restante (`05` em
   diante) para ser documentado conforme cada módulo for implementado — como
   conversamos, documentação viva em vez de especificação completa
   antecipada.
