import { sql } from 'drizzle-orm';
import { check, date, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { perfilAprendizagem } from './perfil.schema';

export const objetivosEstudo = pgTable(
  'objetivos_estudo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    perfilId: uuid('perfil_id')
      .notNull()
      .references(() => perfilAprendizagem.id, { onDelete: 'cascade' }),
    titulo: text('titulo').notNull(),
    descricao: text('descricao'),
    status: text('status').notNull().default('pendente'),
    nivelDesejado: text('nivel_desejado'),
    prazoEstimado: date('prazo_estimado'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'objetivos_status_check',
      sql`${table.status} IN ('pendente','em_andamento','concluido','pausado')`,
    ),
    check(
      'objetivos_nivel_desejado_check',
      sql`${table.nivelDesejado} IN ('iniciante','intermediario','avancado')`,
    ),
  ],
);

export type ObjetivoEstudo = typeof objetivosEstudo.$inferSelect;
export type NovoObjetivoEstudo = typeof objetivosEstudo.$inferInsert;
