import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { modulosTrilha } from './trilhas.schema';
import { objetivosEstudo } from './objetivos.schema';
import { perfilAprendizagem } from './perfil.schema';

export const projetos = pgTable(
  'projetos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    moduloId: uuid('modulo_id').references(() => modulosTrilha.id, { onDelete: 'set null' }),
    objetivoId: uuid('objetivo_id').references(() => objetivosEstudo.id, { onDelete: 'set null' }),
    perfilId: uuid('perfil_id')
      .notNull()
      .references(() => perfilAprendizagem.id, { onDelete: 'cascade' }),
    titulo: text('titulo').notNull(),
    descricao: text('descricao').notNull(),
    criterios: text('criterios').array().notNull().default([]),
    dicas: text('dicas').array().notNull().default([]),
    status: text('status').notNull().default('pendente'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'projetos_status_check',
      sql`${table.status} IN ('pendente','em_andamento','concluido')`,
    ),
  ],
);

export const projetoEntregas = pgTable(
  'projeto_entregas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projetoId: uuid('projeto_id')
      .notNull()
      .references(() => projetos.id, { onDelete: 'cascade' }),
    conteudo: text('conteudo').notNull(),
    feedback: text('feedback'),
    pontuacao: numeric('pontuacao', { precision: 5, scale: 2 }),
    numeroEntrega: integer('numero_entrega').notNull().default(1),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Backstop da alocação transacional em ProjetosRepository: nenhum
    // caminho de insert pode persistir número de entrega duplicado.
    unique('projeto_entregas_projeto_numero_unique').on(table.projetoId, table.numeroEntrega),
  ],
);

export type Projeto = typeof projetos.$inferSelect;
export type NovoProjeto = typeof projetos.$inferInsert;
export type ProjetoEntrega = typeof projetoEntregas.$inferSelect;
export type NovaProjetoEntrega = typeof projetoEntregas.$inferInsert;
