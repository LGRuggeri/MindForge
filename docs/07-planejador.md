# 07 — Planejador (Planner)

**Status:** ✅ implementado e testado.  
**Módulo:** `mindforge-api/src/modules/planner`  
**Agente:** `planner`  
**Tabelas:** `objetivos_estudo`, `trilhas_estudo`, `modulos_trilha`

---

## 1. Responsabilidade

Transforma um objetivo de estudo em trilha versionada com módulos ordenados.  
Define **o quê** estudar e **em que ordem**; não gera o material (isso é o Synthesizer).

---

## 2. API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/planner/objetivos` | Cria objetivo |
| `GET` | `/planner/objetivos/:id` | Busca objetivo (+ trilhas/módulos) |
| `GET` | `/planner/perfis/:perfilId/objetivos` | Lista objetivos do perfil |
| `GET` | `/planner/certificacoes` | Lista os programas de certificação disponíveis |
| `GET` | `/planner/programas` | Lista as trilhas guiadas por assunto e certificação |
| `POST` | `/planner/trilhas` | Gera trilha via LLM ou pelo programa guiado selecionado |

### Criar objetivo

```json
{
  "perfilId": "uuid",
  "titulo": "Aprender Rust",
  "descricao": "Ownership e borrow checker",
  "nivelDesejado": "iniciante",
  "prazoEstimado": "2026-08-31"
}
```

### Gerar trilha

```json
{ "objetivoId": "uuid" }
```

Para usar uma trilha guiada:

```json
{ "objetivoId": "uuid", "programaCodigo": "KALI-LINUX" }
```

O catálogo contém assuntos, concursos e certificações com fontes revisadas. Em Objetivos, o usuário pode escolher um programa e seus módulos para criar a trilha diretamente, sem escrever o objetivo. A trilha guarda o programa usado em `metadata.programa` e a seleção em `metadata.modulosIndices`; certificações também o guardam em `metadata.certificacao` para compatibilidade com o piloto AZ-900. A geração por IA continua quando nenhum código é informado. O campo anterior `certificacaoCodigo` segue aceito para certificações. Consulte [21-certificacoes.md](21-certificacoes.md) para fontes e [24-programas-por-perfil.md](24-programas-por-perfil.md) para seleção, histórico e limites.

Saída: trilha + lista de módulos (`ordem`, `titulo`, `objetivoAprendizagem`, `tempoEstimadoMin`).

---

## 3. Regras do agente

- 3 a 8 módulos sequenciais
- Respeita nível desejado
- JSON estrito (sem markdown)
- Temperature 0.7

---

## 4. Histórico de trilhas

- `trilhas_estudo.versao` e `status` (`ativa | concluida | substituida`) existem no schema.
- Uma nova trilha é criada em transação e as trilhas ativas anteriores do mesmo objetivo são marcadas como `substituida`; os registros antigos permanecem consultáveis.
- O campo numérico `versao` ainda recebe 1 (ou o valor retornado pelo modelo), mesmo após uma regeneração. A versão e a data de conferência do programa ficam registradas no retrato de `metadata.programa`.

---

## 5. Pontos em aberto

- Replanejamento a partir de avaliações ruins ou diário com dificuldades recorrentes.
- Usar `competencia_progresso` para não recomeçar do zero (Fase 3).
- Quantidade de módulos vs `tempo_disponivel_semanal_min` do perfil.

---

## 6. Próximos passos

- Endpoint de listagem de trilhas por objetivo
- Replanejar com versionamento real
- Opcional: fila assíncrona se latência do LLM incomodar
