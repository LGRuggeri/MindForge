ALTER TABLE "tentativas_exercicio" ADD COLUMN "perfil_id" uuid;--> statement-breakpoint
ALTER TABLE "resultados_avaliacao" ADD COLUMN "perfil_id" uuid;--> statement-breakpoint
-- Backfill: o perfil proprietário é derivado da cadeia módulo -> trilha -> objetivo.
UPDATE "tentativas_exercicio" AS t
SET "perfil_id" = oe."perfil_id"
FROM "exercicios" AS e
JOIN "modulos_trilha" AS mt ON mt."id" = e."modulo_id"
JOIN "trilhas_estudo" AS te ON te."id" = mt."trilha_id"
JOIN "objetivos_estudo" AS oe ON oe."id" = te."objetivo_id"
WHERE t."exercicio_id" = e."id"
  AND t."perfil_id" IS NULL;--> statement-breakpoint
UPDATE "resultados_avaliacao" AS r
SET "perfil_id" = oe."perfil_id"
FROM "avaliacoes" AS a
LEFT JOIN "modulos_trilha" AS mt ON mt."id" = a."modulo_id"
LEFT JOIN "trilhas_estudo" AS te ON te."id" = COALESCE(a."trilha_id", mt."trilha_id")
LEFT JOIN "objetivos_estudo" AS oe ON oe."id" = te."objetivo_id"
WHERE r."avaliacao_id" = a."id"
  AND r."perfil_id" IS NULL;--> statement-breakpoint
-- Garante que o backfill cobriu 100% das linhas antes de impor NOT NULL;
-- caso contrário falha aqui com diagnóstico claro em vez de erro genérico de constraint.
DO $$
DECLARE
  faltantes_tentativas bigint;
  faltantes_resultados bigint;
BEGIN
  SELECT count(*) INTO faltantes_tentativas FROM "tentativas_exercicio" WHERE "perfil_id" IS NULL;
  SELECT count(*) INTO faltantes_resultados FROM "resultados_avaliacao" WHERE "perfil_id" IS NULL;
  IF faltantes_tentativas > 0 OR faltantes_resultados > 0 THEN
    RAISE EXCEPTION 'Backfill de perfil_id incompleto: % tentativas e % resultados sem perfil',
      faltantes_tentativas, faltantes_resultados;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "tentativas_exercicio" ALTER COLUMN "perfil_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "resultados_avaliacao" ALTER COLUMN "perfil_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tentativas_exercicio" ADD CONSTRAINT "tentativas_exercicio_perfil_id_perfil_aprendizagem_id_fk" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfil_aprendizagem"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resultados_avaliacao" ADD CONSTRAINT "resultados_avaliacao_perfil_id_perfil_aprendizagem_id_fk" FOREIGN KEY ("perfil_id") REFERENCES "public"."perfil_aprendizagem"("id") ON DELETE cascade ON UPDATE no action;
