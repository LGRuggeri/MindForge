import {
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { perfilAprendizagem } from './perfil.schema';
import { modulosTrilha } from './trilhas.schema';

export const diarioAprendizagem = pgTable(
  'diario_aprendizagem',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    perfilId: uuid('perfil_id')
      .notNull()
      .references(() => perfilAprendizagem.id, { onDelete: 'cascade' }),
    data: date('data').notNull().defaultNow(),
    tempoInvestidoMin: integer('tempo_investido_min').notNull().default(0),
    dificuldades: text('dificuldades'),
    conquistas: text('conquistas'),
    recomendacoesIa: text('recomendacoes_ia'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('diario_perfil_data_unique').on(table.perfilId, table.data)],
);

export const diarioModulos = pgTable(
  'diario_modulos',
  {
    diarioId: uuid('diario_id')
      .notNull()
      .references(() => diarioAprendizagem.id, { onDelete: 'cascade' }),
    moduloId: uuid('modulo_id')
      .notNull()
      .references(() => modulosTrilha.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.diarioId, table.moduloId] })],
);

export type DiarioAprendizagem = typeof diarioAprendizagem.$inferSelect;
export type NovoDiarioAprendizagem = typeof diarioAprendizagem.$inferInsert;
