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

/**
 * Tabela polimórfica por design: item_tipo + item_id apontam para
 * conteudo, exercicio ou competencia, sem FK real. Trade-off consciente
 * documentado em 04-modelagem-dados.md §3.6.
 */
export const revisaoEspacada = pgTable(
  'revisao_espacada',
  {
    id: uuid('id').primaryKey().defaultRandom(),
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
    index('idx_revisao_proxima').on(table.proximaRevisao),
  ],
);

export type RevisaoEspacada = typeof revisaoEspacada.$inferSelect;
export type NovaRevisaoEspacada = typeof revisaoEspacada.$inferInsert;
