CREATE TABLE "historico_duvidas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"perfil_id" uuid NOT NULL,
	"modulo_id" uuid NOT NULL,
	"pergunta" text NOT NULL,
	"resposta" text NOT NULL,
	"citacoes" jsonb DEFAULT '[]' NOT NULL,
	"proximos_passos" jsonb DEFAULT '[]' NOT NULL,
	"chunks_ids" jsonb DEFAULT '[]' NOT NULL,
	"avaliacao" integer,
	"feedback" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "historico_duvidas" ADD CONSTRAINT "historico_duvidas_perfil_id_perfil_aprendizagem_id_fk" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfil_aprendizagem"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_duvidas" ADD CONSTRAINT "historico_duvidas_modulo_id_modulos_trilha_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulos_trilha"("id") ON DELETE cascade ON UPDATE no action;