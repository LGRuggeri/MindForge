import { sql } from 'drizzle-orm';
import { check, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { modulosTrilha } from './trilhas.schema';

export const fontesPesquisa = pgTable(
  'fontes_pesquisa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    moduloId: uuid('modulo_id').references(() => modulosTrilha.id, { onDelete: 'set null' }),
    tipo: text('tipo').notNull(),
    titulo: text('titulo').notNull(),
    url: text('url'),
    autor: text('autor'),
    confiabilidadeScore: numeric('confiabilidade_score', { precision: 3, scale: 2 }),
    resumo: text('resumo'),
    coletadoEm: timestamp('coletado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'fontes_tipo_check',
      sql`${table.tipo} IN ('documentacao_oficial','livro','artigo','video','outro')`,
    ),
  ],
);

export type FontePesquisa = typeof fontesPesquisa.$inferSelect;
export type NovaFontePesquisa = typeof fontesPesquisa.$inferInsert;
