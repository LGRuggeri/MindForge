import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { avaliacoes } from './avaliacoes.schema';
import { perfilAprendizagem } from './perfil.schema';
import { modulosTrilha } from './trilhas.schema';

export const exercicios = pgTable(
  'exercicios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    moduloId: uuid('modulo_id')
      .notNull()
      .references(() => modulosTrilha.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    enunciado: text('enunciado').notNull(),
    gabarito: text('gabarito'),
    criterios: jsonb('criterios').$type<string[]>(),
    dificuldade: text('dificuldade').notNull().default('medio'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'exercicios_tipo_check',
      sql`${table.tipo} IN ('questao_objetiva','dissertativa','codigo','projeto')`,
    ),
    check('exercicios_dificuldade_check', sql`${table.dificuldade} IN ('facil','medio','dificil')`),
  ],
);

export const tentativasExercicio = pgTable('tentativas_exercicio', {
  id: uuid('id').primaryKey().defaultRandom(),
  perfilId: uuid('perfil_id')
    .notNull()
    .references(() => perfilAprendizagem.id, { onDelete: 'cascade' }),
  exercicioId: uuid('exercicio_id')
    .notNull()
    .references(() => exercicios.id, { onDelete: 'cascade' }),
  avaliacaoId: uuid('avaliacao_id').references(() => avaliacoes.id, { onDelete: 'set null' }),
  respostaUsuario: text('resposta_usuario').notNull(),
  correta: boolean('correta'),
  pontuacao: numeric('pontuacao', { precision: 5, scale: 2 }),
  feedbackIa: text('feedback_ia'),
  tentativaNumero: integer('tentativa_numero').notNull().default(1),
  respondidoEm: timestamp('respondido_em', { withTimezone: true }).notNull().defaultNow(),
});

export type Exercicio = typeof exercicios.$inferSelect;
export type NovoExercicio = typeof exercicios.$inferInsert;
export type TentativaExercicio = typeof tentativasExercicio.$inferSelect;
export type NovaTentativaExercicio = typeof tentativasExercicio.$inferInsert;
