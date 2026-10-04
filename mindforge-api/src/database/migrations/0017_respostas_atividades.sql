CREATE TABLE "respostas_atividades" (
	"conteudo_id" uuid NOT NULL,
	"perfil_id" uuid NOT NULL,
	"atividade_chave" text NOT NULL,
	"enunciado" text NOT NULL,
	"resposta" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "respostas_atividades_conteudo_id_perfil_id_atividade_chave_pk" PRIMARY KEY("conteudo_id","perfil_id","atividade_chave"),
	CONSTRAINT "respostas_atividades_chave_check" CHECK ("respostas_atividades"."atividade_chave" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "respostas_atividades_texto_check" CHECK (char_length(btrim("respostas_atividades"."resposta")) BETWEEN 1 AND 10000)
);
--> statement-breakpoint
ALTER TABLE "respostas_atividades" ADD CONSTRAINT "respostas_atividades_conteudo_id_conteudos_id_fk" FOREIGN KEY ("conteudo_id") REFERENCES "public"."conteudos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas_atividades" ADD CONSTRAINT "respostas_atividades_perfil_id_perfil_aprendizagem_id_fk" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfil_aprendizagem"("id") ON DELETE cascade ON UPDATE no action;