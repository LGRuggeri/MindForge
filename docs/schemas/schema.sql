-- ============================================================
-- Learning OS — Schema de Banco de Dados (PostgreSQL + pgvector)
-- Versão: 1.0
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- ------------------------------------------------------------
-- 1. Perfil de Aprendizagem
-- ------------------------------------------------------------
CREATE TABLE perfil_aprendizagem (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome                            TEXT NOT NULL,
    objetivos_gerais                TEXT,
    tempo_disponivel_semanal_min    INTEGER,
    nivel_atual                     TEXT NOT NULL DEFAULT 'iniciante'
        CHECK (nivel_atual IN ('iniciante','intermediario','avancado')),
    preferencias                    JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em                       TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. Objetivos de Estudo
-- ------------------------------------------------------------
CREATE TABLE objetivos_estudo (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_id           UUID NOT NULL REFERENCES perfil_aprendizagem(id) ON DELETE CASCADE,
    titulo              TEXT NOT NULL,
    descricao           TEXT,
    status              TEXT NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente','em_andamento','concluido','pausado')),
    nivel_desejado      TEXT
        CHECK (nivel_desejado IN ('iniciante','intermediario','avancado')),
    prazo_estimado      DATE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. Trilhas de Estudo (planos gerados pelo Planner)
-- ------------------------------------------------------------
CREATE TABLE trilhas_estudo (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objetivo_id         UUID NOT NULL REFERENCES objetivos_estudo(id) ON DELETE CASCADE,
    versao              INTEGER NOT NULL DEFAULT 1,
    status              TEXT NOT NULL DEFAULT 'ativa'
        CHECK (status IN ('ativa','concluida','substituida')),
    gerado_por_agente   TEXT,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 4. Módulos da Trilha
-- ------------------------------------------------------------
CREATE TABLE modulos_trilha (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trilha_id               UUID NOT NULL REFERENCES trilhas_estudo(id) ON DELETE CASCADE,
    ordem                   INTEGER NOT NULL,
    titulo                  TEXT NOT NULL,
    objetivo_aprendizagem   TEXT,
    status                  TEXT NOT NULL DEFAULT 'nao_iniciado'
        CHECK (status IN ('nao_iniciado','em_andamento','concluido')),
    tempo_estimado_min      INTEGER,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (trilha_id, ordem)
);

-- ------------------------------------------------------------
-- 5. Fontes de Pesquisa (Research Engine)
-- ------------------------------------------------------------
CREATE TABLE fontes_pesquisa (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo_id               UUID REFERENCES modulos_trilha(id) ON DELETE SET NULL,
    tipo                    TEXT NOT NULL
        CHECK (tipo IN ('documentacao_oficial','livro','artigo','video','outro')),
    titulo                  TEXT NOT NULL,
    url                     TEXT,
    autor                   TEXT,
    confiabilidade_score    NUMERIC(3,2),
    resumo                  TEXT,
    coletado_em             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 6. Conteúdos (aulas sintetizadas pelo Synthesizer)
-- ------------------------------------------------------------
CREATE TABLE conteudos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo_id           UUID NOT NULL REFERENCES modulos_trilha(id) ON DELETE CASCADE,
    titulo              TEXT NOT NULL,
    corpo_markdown      TEXT NOT NULL,
    versao              INTEGER NOT NULL DEFAULT 1,
    status              TEXT NOT NULL DEFAULT 'rascunho'
        CHECK (status IN ('rascunho','revisado','publicado')),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conteudo_fontes (
    conteudo_id     UUID NOT NULL REFERENCES conteudos(id) ON DELETE CASCADE,
    fonte_id        UUID NOT NULL REFERENCES fontes_pesquisa(id) ON DELETE CASCADE,
    PRIMARY KEY (conteudo_id, fonte_id)
);

-- ------------------------------------------------------------
-- 7. Chunks para RAG (com embeddings via pgvector)
-- ------------------------------------------------------------
CREATE TABLE conteudo_chunks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conteudo_id         UUID REFERENCES conteudos(id) ON DELETE CASCADE,
    fonte_id            UUID REFERENCES fontes_pesquisa(id) ON DELETE CASCADE,
    texto               TEXT NOT NULL,
    embedding           VECTOR(1536) NOT NULL,
    ordem               INTEGER NOT NULL DEFAULT 0,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
        (conteudo_id IS NOT NULL AND fonte_id IS NULL) OR
        (conteudo_id IS NULL AND fonte_id IS NOT NULL)
    )
);

CREATE INDEX idx_conteudo_chunks_embedding
    ON conteudo_chunks USING hnsw (embedding vector_cosine_ops);

-- ------------------------------------------------------------
-- 8. Exercícios
-- ------------------------------------------------------------
CREATE TABLE exercicios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo_id       UUID NOT NULL REFERENCES modulos_trilha(id) ON DELETE CASCADE,
    tipo            TEXT NOT NULL
        CHECK (tipo IN ('questao_objetiva','dissertativa','codigo','projeto')),
    enunciado       TEXT NOT NULL,
    gabarito        TEXT,
    dificuldade     TEXT NOT NULL DEFAULT 'medio'
        CHECK (dificuldade IN ('facil','medio','dificil')),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tentativas_exercicio (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercicio_id        UUID NOT NULL REFERENCES exercicios(id) ON DELETE CASCADE,
    resposta_usuario    TEXT NOT NULL,
    correta             BOOLEAN,
    pontuacao           NUMERIC(5,2),
    feedback_ia         TEXT,
    tentativa_numero    INTEGER NOT NULL DEFAULT 1,
    respondido_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 9. Avaliações (provas / simulados)
-- ------------------------------------------------------------
CREATE TABLE avaliacoes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo_id       UUID REFERENCES modulos_trilha(id) ON DELETE SET NULL,
    trilha_id       UUID REFERENCES trilhas_estudo(id) ON DELETE SET NULL,
    titulo          TEXT NOT NULL,
    tipo            TEXT NOT NULL
        CHECK (tipo IN ('diagnostica','formativa','somativa','simulado')),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE avaliacao_exercicios (
    avaliacao_id    UUID NOT NULL REFERENCES avaliacoes(id) ON DELETE CASCADE,
    exercicio_id    UUID NOT NULL REFERENCES exercicios(id) ON DELETE CASCADE,
    ordem           INTEGER NOT NULL,
    PRIMARY KEY (avaliacao_id, exercicio_id)
);

CREATE TABLE resultados_avaliacao (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    avaliacao_id        UUID NOT NULL REFERENCES avaliacoes(id) ON DELETE CASCADE,
    pontuacao_total     NUMERIC(5,2) NOT NULL,
    pontos_fortes       TEXT,
    pontos_fracos       TEXT,
    recomendacoes       TEXT,
    realizada_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 10. Revisão Espaçada (algoritmo estilo SM-2)
-- ------------------------------------------------------------
CREATE TABLE revisao_espacada (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_tipo           TEXT NOT NULL
        CHECK (item_tipo IN ('conteudo','exercicio','competencia')),
    item_id             UUID NOT NULL,
    fator_facilidade    NUMERIC(4,2) NOT NULL DEFAULT 2.5,
    intervalo_dias      INTEGER NOT NULL DEFAULT 1,
    repeticoes          INTEGER NOT NULL DEFAULT 0,
    proxima_revisao     DATE NOT NULL DEFAULT current_date,
    ultima_revisao       DATE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_revisao_proxima ON revisao_espacada (proxima_revisao);

-- ------------------------------------------------------------
-- 11. Diário de Aprendizagem
-- ------------------------------------------------------------
CREATE TABLE diario_aprendizagem (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_id               UUID NOT NULL REFERENCES perfil_aprendizagem(id) ON DELETE CASCADE,
    data                    DATE NOT NULL DEFAULT current_date,
    tempo_investido_min     INTEGER NOT NULL DEFAULT 0,
    dificuldades            TEXT,
    conquistas              TEXT,
    recomendacoes_ia        TEXT,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (perfil_id, data)
);

CREATE TABLE diario_modulos (
    diario_id       UUID NOT NULL REFERENCES diario_aprendizagem(id) ON DELETE CASCADE,
    modulo_id       UUID NOT NULL REFERENCES modulos_trilha(id) ON DELETE CASCADE,
    PRIMARY KEY (diario_id, modulo_id)
);

-- ------------------------------------------------------------
-- 12. Knowledge Graph (Competências)
-- ------------------------------------------------------------
CREATE TABLE competencias (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome                TEXT NOT NULL,
    descricao           TEXT,
    categoria           TEXT,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE competencia_relacoes (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competencia_origem_id       UUID NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
    competencia_destino_id      UUID NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
    tipo_relacao                TEXT NOT NULL
        CHECK (tipo_relacao IN ('pre_requisito','relacionada','aprofundamento')),
    CHECK (competencia_origem_id <> competencia_destino_id),
    UNIQUE (competencia_origem_id, competencia_destino_id, tipo_relacao)
);

CREATE TABLE competencia_progresso (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competencia_id      UUID NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
    perfil_id           UUID NOT NULL REFERENCES perfil_aprendizagem(id) ON DELETE CASCADE,
    nivel_atual         TEXT NOT NULL DEFAULT 'nao_iniciado'
        CHECK (nivel_atual IN ('nao_iniciado','aprendendo','praticando','dominado')),
    evidencia           TEXT,
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (competencia_id, perfil_id)
);

CREATE TABLE modulo_competencias (
    modulo_id       UUID NOT NULL REFERENCES modulos_trilha(id) ON DELETE CASCADE,
    competencia_id  UUID NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
    PRIMARY KEY (modulo_id, competencia_id)
);

-- ------------------------------------------------------------
-- 13. Execuções de Agentes de IA (auditoria / observabilidade)
-- ------------------------------------------------------------
CREATE TABLE agentes_execucoes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agente              TEXT NOT NULL
        CHECK (agente IN ('planner','researcher','teacher','evaluator','reviewer')),
    entrada             JSONB,
    saida               JSONB,
    modelo_usado        TEXT,
    tokens_utilizados   INTEGER,
    duracao_ms          INTEGER,
    status              TEXT NOT NULL DEFAULT 'sucesso'
        CHECK (status IN ('sucesso','erro')),
    erro_mensagem       TEXT,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Índices de apoio (consultas mais comuns)
-- ------------------------------------------------------------
CREATE INDEX idx_objetivos_perfil ON objetivos_estudo (perfil_id);
CREATE INDEX idx_trilhas_objetivo ON trilhas_estudo (objetivo_id);
CREATE INDEX idx_modulos_trilha ON modulos_trilha (trilha_id);
CREATE INDEX idx_conteudos_modulo ON conteudos (modulo_id);
CREATE INDEX idx_exercicios_modulo ON exercicios (modulo_id);
CREATE INDEX idx_tentativas_exercicio ON tentativas_exercicio (exercicio_id);
CREATE INDEX idx_diario_perfil_data ON diario_aprendizagem (perfil_id, data);
CREATE INDEX idx_competencia_relacoes_origem ON competencia_relacoes (competencia_origem_id);
CREATE INDEX idx_agentes_execucoes_agente ON agentes_execucoes (agente, criado_em);
