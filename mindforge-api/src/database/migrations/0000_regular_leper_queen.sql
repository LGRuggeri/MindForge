CREATE TABLE "perfil_aprendizagem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"objetivos_gerais" text,
	"tempo_disponivel_semanal_min" integer,
	"nivel_atual" text DEFAULT 'iniciante' NOT NULL,
	"preferencias" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nivel_atual_check" CHECK ("perfil_aprendizagem"."nivel_atual" IN ('iniciante','intermediario','avancado'))
);
--> statement-breakpoint
CREATE TABLE "objetivos_estudo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"perfil_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"nivel_desejado" text,
	"prazo_estimado" date,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "objetivos_status_check" CHECK ("objetivos_estudo"."status" IN ('pendente','em_andamento','concluido','pausado')),
	CONSTRAINT "objetivos_nivel_desejado_check" CHECK ("objetivos_estudo"."nivel_desejado" IN ('iniciante','intermediario','avancado'))
);
--> statement-breakpoint
CREATE TABLE "modulos_trilha" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trilha_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"titulo" text NOT NULL,
	"objetivo_aprendizagem" text,
	"status" text DEFAULT 'nao_iniciado' NOT NULL,
	"tempo_estimado_min" integer,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modulos_trilha_ordem_unique" UNIQUE("trilha_id","ordem"),
	CONSTRAINT "modulos_status_check" CHECK ("modulos_trilha"."status" IN ('nao_iniciado','em_andamento','concluido'))
);
--> statement-breakpoint
CREATE TABLE "trilhas_estudo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"objetivo_id" uuid NOT NULL,
	"versao" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'ativa' NOT NULL,
	"gerado_por_agente" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trilhas_status_check" CHECK ("trilhas_estudo"."status" IN ('ativa','concluida','substituida'))
);
--> statement-breakpoint
CREATE TABLE "fontes_pesquisa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modulo_id" uuid,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"url" text,
	"autor" text,
	"confiabilidade_score" numeric(3, 2),
	"resumo" text,
	"coletado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fontes_tipo_check" CHECK ("fontes_pesquisa"."tipo" IN ('documentacao_oficial','livro','artigo','video','outro'))
);
--> statement-breakpoint
CREATE TABLE "conteudo_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conteudo_id" uuid,
	"fonte_id" uuid,
	"texto" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conteudo_chunks_origem_check" CHECK (("conteudo_chunks"."conteudo_id" IS NOT NULL AND "conteudo_chunks"."fonte_id" IS NULL) OR ("conteudo_chunks"."conteudo_id" IS NULL AND "conteudo_chunks"."fonte_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "conteudo_fontes" (
	"conteudo_id" uuid NOT NULL,
	"fonte_id" uuid NOT NULL,
	CONSTRAINT "conteudo_fontes_conteudo_id_fonte_id_pk" PRIMARY KEY("conteudo_id","fonte_id")
);
--> statement-breakpoint
CREATE TABLE "conteudos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modulo_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"corpo_markdown" text NOT NULL,
	"versao" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'rascunho' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conteudos_status_check" CHECK ("conteudos"."status" IN ('rascunho','revisado','publicado'))
);
--> statement-breakpoint
CREATE TABLE "exercicios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modulo_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"enunciado" text NOT NULL,
	"gabarito" text,
	"dificuldade" text DEFAULT 'medio' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercicios_tipo_check" CHECK ("exercicios"."tipo" IN ('questao_objetiva','dissertativa','codigo','projeto')),
	CONSTRAINT "exercicios_dificuldade_check" CHECK ("exercicios"."dificuldade" IN ('facil','medio','dificil'))
);
--> statement-breakpoint
CREATE TABLE "tentativas_exercicio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercicio_id" uuid NOT NULL,
	"resposta_usuario" text NOT NULL,
	"correta" boolean,
	"pontuacao" numeric(5, 2),
	"feedback_ia" text,
	"tentativa_numero" integer DEFAULT 1 NOT NULL,
	"respondido_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avaliacao_exercicios" (
	"avaliacao_id" uuid NOT NULL,
	"exercicio_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	CONSTRAINT "avaliacao_exercicios_avaliacao_id_exercicio_id_pk" PRIMARY KEY("avaliacao_id","exercicio_id")
);
--> statement-breakpoint
CREATE TABLE "avaliacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modulo_id" uuid,
	"trilha_id" uuid,
	"titulo" text NOT NULL,
	"tipo" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "avaliacoes_tipo_check" CHECK ("avaliacoes"."tipo" IN ('diagnostica','formativa','somativa','simulado'))
);
--> statement-breakpoint
CREATE TABLE "resultados_avaliacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"avaliacao_id" uuid NOT NULL,
	"pontuacao_total" numeric(5, 2) NOT NULL,
	"pontos_fortes" text,
	"pontos_fracos" text,
	"recomendacoes" text,
	"realizada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revisao_espacada" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_tipo" text NOT NULL,
	"item_id" uuid NOT NULL,
	"fator_facilidade" numeric(4, 2) DEFAULT '2.5' NOT NULL,
	"intervalo_dias" integer DEFAULT 1 NOT NULL,
	"repeticoes" integer DEFAULT 0 NOT NULL,
	"proxima_revisao" date DEFAULT now() NOT NULL,
	"ultima_revisao" date,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revisao_item_tipo_check" CHECK ("revisao_espacada"."item_tipo" IN ('conteudo','exercicio','competencia'))
);
--> statement-breakpoint
CREATE TABLE "diario_aprendizagem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"perfil_id" uuid NOT NULL,
	"data" date DEFAULT now() NOT NULL,
	"tempo_investido_min" integer DEFAULT 0 NOT NULL,
	"dificuldades" text,
	"conquistas" text,
	"recomendacoes_ia" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "diario_perfil_data_unique" UNIQUE("perfil_id","data")
);
--> statement-breakpoint
CREATE TABLE "diario_modulos" (
	"diario_id" uuid NOT NULL,
	"modulo_id" uuid NOT NULL,
	CONSTRAINT "diario_modulos_diario_id_modulo_id_pk" PRIMARY KEY("diario_id","modulo_id")
);
--> statement-breakpoint
CREATE TABLE "competencia_progresso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competencia_id" uuid NOT NULL,
	"perfil_id" uuid NOT NULL,
	"nivel_atual" text DEFAULT 'nao_iniciado' NOT NULL,
	"evidencia" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competencia_progresso_unique" UNIQUE("competencia_id","perfil_id"),
	CONSTRAINT "competencia_progresso_nivel_check" CHECK ("competencia_progresso"."nivel_atual" IN ('nao_iniciado','aprendendo','praticando','dominado'))
);
--> statement-breakpoint
CREATE TABLE "competencia_relacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competencia_origem_id" uuid NOT NULL,
	"competencia_destino_id" uuid NOT NULL,
	"tipo_relacao" text NOT NULL,
	CONSTRAINT "competencia_relacoes_unique" UNIQUE("competencia_origem_id","competencia_destino_id","tipo_relacao"),
	CONSTRAINT "competencia_relacoes_tipo_check" CHECK ("competencia_relacoes"."tipo_relacao" IN ('pre_requisito','relacionada','aprofundamento')),
	CONSTRAINT "competencia_relacoes_nao_autoref_check" CHECK ("competencia_relacoes"."competencia_origem_id" <> "competencia_relacoes"."competencia_destino_id")
);
--> statement-breakpoint
CREATE TABLE "competencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"categoria" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modulo_competencias" (
	"modulo_id" uuid NOT NULL,
	"competencia_id" uuid NOT NULL,
	CONSTRAINT "modulo_competencias_modulo_id_competencia_id_pk" PRIMARY KEY("modulo_id","competencia_id")
);
--> statement-breakpoint
CREATE TABLE "agentes_execucoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agente" text NOT NULL,
	"entrada" jsonb,
	"saida" jsonb,
	"modelo_usado" text,
	"tokens_utilizados" integer,
	"duracao_ms" integer,
	"status" text DEFAULT 'sucesso' NOT NULL,
	"erro_mensagem" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agentes_execucoes_agente_check" CHECK ("agentes_execucoes"."agente" IN ('planner','researcher','teacher','evaluator','reviewer')),
	CONSTRAINT "agentes_execucoes_status_check" CHECK ("agentes_execucoes"."status" IN ('sucesso','erro'))
);
--> statement-breakpoint
ALTER TABLE "objetivos_estudo" ADD CONSTRAINT "objetivos_estudo_perfil_id_perfil_aprendizagem_id_fk" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfil_aprendizagem"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modulos_trilha" ADD CONSTRAINT "modulos_trilha_trilha_id_trilhas_estudo_id_fk" FOREIGN KEY ("trilha_id") REFERENCES "public"."trilhas_estudo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trilhas_estudo" ADD CONSTRAINT "trilhas_estudo_objetivo_id_objetivos_estudo_id_fk" FOREIGN KEY ("objetivo_id") REFERENCES "public"."objetivos_estudo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fontes_pesquisa" ADD CONSTRAINT "fontes_pesquisa_modulo_id_modulos_trilha_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulos_trilha"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteudo_chunks" ADD CONSTRAINT "conteudo_chunks_conteudo_id_conteudos_id_fk" FOREIGN KEY ("conteudo_id") REFERENCES "public"."conteudos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteudo_chunks" ADD CONSTRAINT "conteudo_chunks_fonte_id_fontes_pesquisa_id_fk" FOREIGN KEY ("fonte_id") REFERENCES "public"."fontes_pesquisa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteudo_fontes" ADD CONSTRAINT "conteudo_fontes_conteudo_id_conteudos_id_fk" FOREIGN KEY ("conteudo_id") REFERENCES "public"."conteudos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteudo_fontes" ADD CONSTRAINT "conteudo_fontes_fonte_id_fontes_pesquisa_id_fk" FOREIGN KEY ("fonte_id") REFERENCES "public"."fontes_pesquisa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteudos" ADD CONSTRAINT "conteudos_modulo_id_modulos_trilha_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulos_trilha"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercicios" ADD CONSTRAINT "exercicios_modulo_id_modulos_trilha_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulos_trilha"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tentativas_exercicio" ADD CONSTRAINT "tentativas_exercicio_exercicio_id_exercicios_id_fk" FOREIGN KEY ("exercicio_id") REFERENCES "public"."exercicios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacao_exercicios" ADD CONSTRAINT "avaliacao_exercicios_avaliacao_id_avaliacoes_id_fk" FOREIGN KEY ("avaliacao_id") REFERENCES "public"."avaliacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacao_exercicios" ADD CONSTRAINT "avaliacao_exercicios_exercicio_id_exercicios_id_fk" FOREIGN KEY ("exercicio_id") REFERENCES "public"."exercicios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_modulo_id_modulos_trilha_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulos_trilha"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_trilha_id_trilhas_estudo_id_fk" FOREIGN KEY ("trilha_id") REFERENCES "public"."trilhas_estudo"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resultados_avaliacao" ADD CONSTRAINT "resultados_avaliacao_avaliacao_id_avaliacoes_id_fk" FOREIGN KEY ("avaliacao_id") REFERENCES "public"."avaliacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diario_aprendizagem" ADD CONSTRAINT "diario_aprendizagem_perfil_id_perfil_aprendizagem_id_fk" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfil_aprendizagem"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diario_modulos" ADD CONSTRAINT "diario_modulos_diario_id_diario_aprendizagem_id_fk" FOREIGN KEY ("diario_id") REFERENCES "public"."diario_aprendizagem"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diario_modulos" ADD CONSTRAINT "diario_modulos_modulo_id_modulos_trilha_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulos_trilha"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competencia_progresso" ADD CONSTRAINT "competencia_progresso_competencia_id_competencias_id_fk" FOREIGN KEY ("competencia_id") REFERENCES "public"."competencias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competencia_progresso" ADD CONSTRAINT "competencia_progresso_perfil_id_perfil_aprendizagem_id_fk" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfil_aprendizagem"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competencia_relacoes" ADD CONSTRAINT "competencia_relacoes_competencia_origem_id_competencias_id_fk" FOREIGN KEY ("competencia_origem_id") REFERENCES "public"."competencias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competencia_relacoes" ADD CONSTRAINT "competencia_relacoes_competencia_destino_id_competencias_id_fk" FOREIGN KEY ("competencia_destino_id") REFERENCES "public"."competencias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modulo_competencias" ADD CONSTRAINT "modulo_competencias_modulo_id_modulos_trilha_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulos_trilha"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modulo_competencias" ADD CONSTRAINT "modulo_competencias_competencia_id_competencias_id_fk" FOREIGN KEY ("competencia_id") REFERENCES "public"."competencias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_conteudo_chunks_embedding" ON "conteudo_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_revisao_proxima" ON "revisao_espacada" USING btree ("proxima_revisao");--> statement-breakpoint
CREATE INDEX "idx_competencia_relacoes_origem" ON "competencia_relacoes" USING btree ("competencia_origem_id");--> statement-breakpoint
CREATE INDEX "idx_agentes_execucoes_agente" ON "agentes_execucoes" USING btree ("agente","criado_em");