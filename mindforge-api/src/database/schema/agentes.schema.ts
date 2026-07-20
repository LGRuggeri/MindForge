import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const agentesExecucoes = pgTable(
  'agentes_execucoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agente: text('agente').notNull(),
    entrada: jsonb('entrada'),
    saida: jsonb('saida'),
    modeloUsado: text('modelo_usado'),
    tokensUtilizados: integer('tokens_utilizados'),
    duracaoMs: integer('duracao_ms'),
    status: text('status').notNull().default('sucesso'),
    erroMensagem: text('erro_mensagem'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'agentes_execucoes_agente_check',
      sql`${table.agente} IN ('planner','researcher','synthesizer','teacher','evaluator','reviewer')`,
    ),
    check('agentes_execucoes_status_check', sql`${table.status} IN ('sucesso','erro')`),
    index('idx_agentes_execucoes_agente').on(table.agente, table.criadoEm),
  ],
);

export type AgenteExecucao = typeof agentesExecucoes.$inferSelect;
export type NovaAgenteExecucao = typeof agentesExecucoes.$inferInsert;
