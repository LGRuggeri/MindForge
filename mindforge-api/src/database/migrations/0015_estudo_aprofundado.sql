ALTER TABLE "fontes_pesquisa" ADD COLUMN "trecho_consultado" text;--> statement-breakpoint
ALTER TABLE "fontes_pesquisa" ADD COLUMN "localizador" text;--> statement-breakpoint
ALTER TABLE "fontes_pesquisa" ADD COLUMN "consultado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exercicios" ADD COLUMN "comentario" jsonb;