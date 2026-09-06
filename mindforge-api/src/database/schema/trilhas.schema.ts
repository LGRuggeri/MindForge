import { check, integer, jsonb, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { objetivosEstudo } from './objetivos.schema';
import { perfilAprendizagem } from './perfil.schema';

export const trilhasEstudo = pgTable(
  'trilhas_estudo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    objetivoId: uuid('objetivo_id')
      .notNull()
      .references(() => objetivosEstudo.id, { onDelete: 'cascade' }),
    versao: integer('versao').notNull().default(1),
    status: text('status').notNull().default('ativa'),
    geradoPorAgente: text('gerado_por_agente'),
    metadata: jsonb('metadata').notNull().default({}),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('trilhas_status_check', sql`${table.status} IN ('ativa','concluida','substituida')`),
  ],
);

export const modulosTrilha = pgTable(
  'modulos_trilha',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trilhaId: uuid('trilha_id')
      .notNull()
      .references(() => trilhasEstudo.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    titulo: text('titulo').notNull(),
    objetivoAprendizagem: text('objetivo_aprendizagem'),
    status: text('status').notNull().default('nao_iniciado'),
    tempoEstimadoMin: integer('tempo_estimado_min'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'modulos_status_check',
      sql`${table.status} IN ('nao_iniciado','em_andamento','concluido')`,
    ),
    unique('modulos_trilha_ordem_unique').on(table.trilhaId, table.ordem),
  ],
);

export const historicoDuvidas = pgTable(
  'historico_duvidas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    perfilId: uuid('perfil_id')
      .notNull()
      .references(() => perfilAprendizagem.id, { onDelete: 'cascade' }),
    moduloId: uuid('modulo_id')
      .notNull()
      .references(() => modulosTrilha.id, { onDelete: 'cascade' }),
    pergunta: text('pergunta').notNull(),
    resposta: text('resposta').notNull(),
    citacoes: jsonb('citacoes').notNull().default('[]'),
    proximosPassos: jsonb('proximos_passos').notNull().default('[]'),
    chunksIds: jsonb('chunks_ids').notNull().default('[]'),
    avaliacao: integer('avaliacao'),
    feedback: text('feedback'),
    // Idioma (BCP-47) em que o tutor respondeu — usado para escolher a voz do
    // TTS ao ouvir a dúvida. Default pt-br: registros antigos pré-multimodalidade.
    idiomaResposta: varchar('idioma_resposta', { length: 10 }).notNull().default('pt-br'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'historico_duvidas_avaliacao_check',
      sql`${table.avaliacao} IS NULL OR (${table.avaliacao} >= 1 AND ${table.avaliacao} <= 5)`,
    ),
  ],
);

export type TrilhaEstudo = typeof trilhasEstudo.$inferSelect;
export type NovaTrilhaEstudo = typeof trilhasEstudo.$inferInsert;
export type ModuloTrilha = typeof modulosTrilha.$inferSelect;
export type NovoModuloTrilha = typeof modulosTrilha.$inferInsert;
export type HistoricoDuvida = typeof historicoDuvidas.$inferSelect;
export type NovoHistoricoDuvida = typeof historicoDuvidas.$inferInsert;
