import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { perfilAprendizagem } from './perfil.schema';
import { modulosTrilha } from './trilhas.schema';

export const competencias = pgTable('competencias', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  categoria: text('categoria'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
});

export const competenciaRelacoes = pgTable(
  'competencia_relacoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    competenciaOrigemId: uuid('competencia_origem_id')
      .notNull()
      .references(() => competencias.id, { onDelete: 'cascade' }),
    competenciaDestinoId: uuid('competencia_destino_id')
      .notNull()
      .references(() => competencias.id, { onDelete: 'cascade' }),
    tipoRelacao: text('tipo_relacao').notNull(),
  },
  (table) => [
    check(
      'competencia_relacoes_tipo_check',
      sql`${table.tipoRelacao} IN ('pre_requisito','relacionada','aprofundamento')`,
    ),
    check(
      'competencia_relacoes_nao_autoref_check',
      sql`${table.competenciaOrigemId} <> ${table.competenciaDestinoId}`,
    ),
    unique('competencia_relacoes_unique').on(
      table.competenciaOrigemId,
      table.competenciaDestinoId,
      table.tipoRelacao,
    ),
    index('idx_competencia_relacoes_origem').on(table.competenciaOrigemId),
  ],
);

export const competenciaProgresso = pgTable(
  'competencia_progresso',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    competenciaId: uuid('competencia_id')
      .notNull()
      .references(() => competencias.id, { onDelete: 'cascade' }),
    perfilId: uuid('perfil_id')
      .notNull()
      .references(() => perfilAprendizagem.id, { onDelete: 'cascade' }),
    nivelAtual: text('nivel_atual').notNull().default('nao_iniciado'),
    evidencia: text('evidencia'),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'competencia_progresso_nivel_check',
      sql`${table.nivelAtual} IN ('nao_iniciado','aprendendo','praticando','dominado')`,
    ),
    unique('competencia_progresso_unique').on(table.competenciaId, table.perfilId),
  ],
);

export const moduloCompetencias = pgTable(
  'modulo_competencias',
  {
    moduloId: uuid('modulo_id')
      .notNull()
      .references(() => modulosTrilha.id, { onDelete: 'cascade' }),
    competenciaId: uuid('competencia_id')
      .notNull()
      .references(() => competencias.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.moduloId, table.competenciaId] })],
);

export type Competencia = typeof competencias.$inferSelect;
export type NovaCompetencia = typeof competencias.$inferInsert;
export type CompetenciaRelacao = typeof competenciaRelacoes.$inferSelect;
export type CompetenciaProgresso = typeof competenciaProgresso.$inferSelect;
