import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { perfilAprendizagem } from './perfil.schema';

/**
 * Tabela polimórfica por design: item_tipo + item_id apontam para
 * conteudo, exercicio ou competencia, sem FK real. Trade-off consciente
 * documentado em 04-modelagem-dados.md §3.6.
 *
 * O estado SM-2 é escopado por perfil para evitar que um perfil
 * sobrescreva a agenda de revisão de outro.
 */
export const revisaoEspacada = pgTable(
  'revisao_espacada',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    perfilId: uuid('perfil_id').references(() => perfilAprendizagem.id),
    itemTipo: text('item_tipo').notNull(),
    itemId: uuid('item_id').notNull(),
    fatorFacilidade: numeric('fator_facilidade', { precision: 4, scale: 2 })
      .notNull()
      .default('2.5'),
    intervaloDias: integer('intervalo_dias').notNull().default(1),
    repeticoes: integer('repeticoes').notNull().default(0),
    proximaRevisao: date('proxima_revisao').notNull().defaultNow(),
    ultimaRevisao: date('ultima_revisao'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'revisao_item_tipo_check',
      sql`${table.itemTipo} IN ('conteudo','exercicio','competencia')`,
    ),
    index('idx_revisao_perfil_proxima').on(table.perfilId, table.proximaRevisao),
  ],
);

export type RevisaoEspacada = typeof revisaoEspacada.$inferSelect;
export type NovaRevisaoEspacada = typeof revisaoEspacada.$inferInsert;
