-- Remove duplicatas anteriores (mesmo perfil + avaliação), mantendo o registro mais recente.
DELETE FROM "resultados_avaliacao" antigo
USING "resultados_avaliacao" mais_novo
WHERE antigo."perfil_id" = mais_novo."perfil_id"
  AND antigo."avaliacao_id" = mais_novo."avaliacao_id"
  AND (
    mais_novo."realizada_em" > antigo."realizada_em"
    OR (mais_novo."realizada_em" = antigo."realizada_em" AND mais_novo."id" < antigo."id")
  );

ALTER TABLE "resultados_avaliacao" ADD CONSTRAINT "resultados_avaliacao_perfil_avaliacao_unique" UNIQUE("perfil_id","avaliacao_id");
