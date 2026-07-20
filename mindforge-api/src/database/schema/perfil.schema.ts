import { sql } from 'drizzle-orm';
import { check, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const perfilAprendizagem = pgTable(
  'perfil_aprendizagem',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    objetivosGerais: text('objetivos_gerais'),
    tempoDisponivelSemanalMin: integer('tempo_disponivel_semanal_min'),
    nivelAtual: text('nivel_atual').notNull().default('iniciante'),
    preferencias: jsonb('preferencias').notNull().default({}),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'nivel_atual_check',
      sql`${table.nivelAtual} IN ('iniciante','intermediario','avancado')`,
    ),
  ],
);

export type PerfilAprendizagem = typeof perfilAprendizagem.$inferSelect;
export type NovoPerfilAprendizagem = typeof perfilAprendizagem.$inferInsert;
