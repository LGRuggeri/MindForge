---
name: ecc-security-review
description: Revisa mudanças de código no MindForge sob a ótica de segurança, considerando LLM prompts, embeddings, pgvector, Drizzle e configuração sensível.
type: prompt
whenToUse: Após implementar mudanças que tocam endpoints, banco, autenticação, inputs externos, configuração, LLM prompts ou embeddings no MindForge.
disableModelInvocation: false
arguments:
  - escopo
---

# ECC Security Review — MindForge

Siga este workflow para revisar segurança de mudanças no MindForge. O objetivo é encontrar vulnerabilidades antes que elas cheguem ao repositório.

## 1. Defina o escopo

- Identifique os arquivos alterados ou indicados pelo usuário.
- Foque em:
  - Controllers, handlers e rotas
  - Repositórios e queries
  - Validação de input
  - Configuração e `.env`
  - Integrações com LLM e embeddings
  - Uploads de conteúdo

## 2. Verifique cada vetor de risco

### 2.1 Inputs do usuário
- [ ] Todo input externo é validado (DTO + `ValidationPipe` global).
- [ ] Dados de LLM são sanitizados antes de persistir.
- [ ] Uploads, se existirem, têm validação de tipo/tamanho.

### 2.2 Injeção
- [ ] Queries usam o repository/Drizzle tipado.
- [ ] Não há concatenação de SQL com input do usuário.
- [ ] Não se usa `sql.raw()` com dados externos.

### 2.3 Segredos e credenciais
- [ ] Nenhum segredo está hardcoded (`LLM_API_KEY`, `DATABASE_URL`, tokens).
- [ ] `.env` e arquivos de credenciais não são commitados.
- [ ] Logs não imprimem tokens, senhas ou payloads completos de LLM.

### 2.4 LLM e embeddings
- [ ] Prompts não contêm dados sensíveis do usuário sem consentimento.
- [ ] Respostas de LLM são validadas antes de persistir.
- [ ] Configuração de embeddings (`EMBEDDING_MODEL`, dimensões) é consistente com o schema `conteudo_chunks.embedding`.

### 2.5 Erros e informação exposta
- [ ] `ProblemDetailsFilter` (RFC 7807) está aplicado.
- [ ] Stack traces e detalhes internos não vazam para o cliente.
- [ ] Mensagens de erro em português são claras mas não revelam estrutura interna.

### 2.6 Autorização
- [ ] Rotas sensíveis têm guards quando aplicável.
- [ ] Usuários não podem acessar dados de outros usuários sem autorização.

### 2.7 Dependências
- [ ] Novas dependências são realmente necessárias.
- [ ] Execute `npm audit` se novas dependências foram adicionadas.

## 3. Classifique os achados

- **Crítico**: vulnerabilidade explotável. Corrija imediatamente.
- **Alto**: validação fraca, exposição de dados sensíveis. Corrija antes de merge.
- **Médio**: boas práticas ausentes. Corrija quando possível.
- **Baixo**: sugestões de endurecimento. Opcional.

## 4. Reporte ao usuário

- Liste os achados por prioridade.
- Para cada um, indique arquivo e linha aproximada.
- Proponha correções concretas.
- Se nada for encontrado, confirme: "Nenhum problema crítico identificado no escopo analisado."
