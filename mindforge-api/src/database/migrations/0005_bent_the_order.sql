DROP INDEX "idx_revisao_proxima";--> statement-breakpoint
ALTER TABLE "revisao_espacada" ADD COLUMN "perfil_id" uuid;--> statement-breakpoint
ALTER TABLE "revisao_espacada" ADD CONSTRAINT "revisao_espacada_perfil_id_perfil_aprendizagem_id_fk" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfil_aprendizagem"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_revisao_perfil_proxima" ON "revisao_espacada" USING btree ("perfil_id","proxima_revisao");