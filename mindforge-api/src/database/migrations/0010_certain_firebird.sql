CREATE TABLE "projeto_entregas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projeto_id" uuid NOT NULL,
	"conteudo" text NOT NULL,
	"feedback" text,
	"pontuacao" numeric(5, 2),
	"numero_entrega" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projetos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modulo_id" uuid,
	"objetivo_id" uuid,
	"perfil_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text NOT NULL,
	"criterios" text[] DEFAULT '{}' NOT NULL,
	"dicas" text[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projetos_status_check" CHECK ("projetos"."status" IN ('pendente','em_andamento','concluido'))
);
--> statement-breakpoint
ALTER TABLE "projeto_entregas" ADD CONSTRAINT "projeto_entregas_projeto_id_projetos_id_fk" FOREIGN KEY ("projeto_id") REFERENCES "public"."projetos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_modulo_id_modulos_trilha_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulos_trilha"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_objetivo_id_objetivos_estudo_id_fk" FOREIGN KEY ("objetivo_id") REFERENCES "public"."objetivos_estudo"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_perfil_id_perfil_aprendizagem_id_fk" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfil_aprendizagem"("id") ON DELETE cascade ON UPDATE no action;