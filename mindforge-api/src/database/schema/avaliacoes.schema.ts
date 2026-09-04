import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { modulosTrilha, trilhasEstudo } from './trilhas.schema';
import { exercicios } from './exercicios.schema';
import { perfilAprendizagem } from './perfil.schema';

export const avaliacoes = pgTable(
  'avaliacoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    moduloId: uuid('modulo_id').references(() => modulosTrilha.id, { onDelete: 'set null' }),
    trilhaId: uuid('trilha_id').references(() => trilhasEstudo.id, { onDelete: 'set null' }),
    titulo: text('titulo').notNull(),
    tipo: text('tipo').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'avaliacoes_tipo_check',
      sql`${table.tipo} IN ('diagnostica','formativa','somativa','simulado')`,
    ),
  ],
);

export const avaliacaoExercicios = pgTable(
  'avaliacao_exercicios',
  {
    avaliacaoId: uuid('avaliacao_id')
      .notNull()
      .references(() => avaliacoes.id, { onDelete: 'cascade' }),
    exercicioId: uuid('exercicio_id')
      .notNull()
      .references(() => exercicios.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
  },
  (table) => [primaryKey({ columns: [table.avaliacaoId, table.exercicioId] })],
);

export const resultadosAvaliacao = pgTable(
  'resultados_avaliacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    perfilId: uuid('perfil_id')
      .notNull()
      .references(() => perfilAprendizagem.id, { onDelete: 'cascade' }),
    avaliacaoId: uuid('avaliacao_id')
      .notNull()
      .references(() => avaliacoes.id, { onDelete: 'cascade' }),
    pontuacaoTotal: numeric('pontuacao_total', { precision: 5, scale: 2 }).notNull(),
    pontosFortes: text('pontos_fortes'),
    pontosFracos: text('pontos_fracos'),
    recomendacoes: text('recomendacoes'),
    realizadaEm: timestamp('realizada_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('resultados_avaliacao_perfil_avaliacao_unique').on(table.perfilId, table.avaliacaoId),
  ],
);

export type Avaliacao = typeof avaliacoes.$inferSelect;
export type NovaAvaliacao = typeof avaliacoes.$inferInsert;
export type ResultadoAvaliacao = typeof resultadosAvaliacao.$inferSelect;
