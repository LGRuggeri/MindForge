import { sql } from 'drizzle-orm';
import { EMBEDDING_DIMENSIONS } from '../../config/embedding';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';
import { modulosTrilha } from './trilhas.schema';
import { fontesPesquisa } from './pesquisa.schema';

export interface AtualizacaoFontes {
  tipo: 'busca_web' | 'fontes_salvas';
  realizadaEm: string | null;
  resultadosWeb: number;
  fontesEncontradas: number;
}

/**
 * Dimensão do vetor: 768, compatível com nomic-embed-text (Ollama local).
 * Trocar o modelo de embedding exige recriar esta coluna — vetores de
 * dimensões diferentes não são intercompatíveis. Ver 04-modelagem-dados.md §3.4
 * e docs/14-decisoes-arquiteturais.md ADR-016.
 */

export const conteudos = pgTable(
  'conteudos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    moduloId: uuid('modulo_id')
      .notNull()
      .references(() => modulosTrilha.id, { onDelete: 'cascade' }),
    titulo: text('titulo').notNull(),
    corpoMarkdown: text('corpo_markdown').notNull(),
    versao: integer('versao').notNull().default(1),
    status: text('status').notNull().default('rascunho'),
    atualizacaoFontes: jsonb('atualizacao_fontes').$type<AtualizacaoFontes>(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('conteudos_status_check', sql`${table.status} IN ('rascunho','revisado','publicado')`),
  ],
);

export const conteudoFontes = pgTable(
  'conteudo_fontes',
  {
    conteudoId: uuid('conteudo_id')
      .notNull()
      .references(() => conteudos.id, { onDelete: 'cascade' }),
    fonteId: uuid('fonte_id')
      .notNull()
      .references(() => fontesPesquisa.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.conteudoId, table.fonteId] })],
);

export const conteudoChunks = pgTable(
  'conteudo_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conteudoId: uuid('conteudo_id').references(() => conteudos.id, { onDelete: 'cascade' }),
    fonteId: uuid('fonte_id').references(() => fontesPesquisa.id, { onDelete: 'cascade' }),
    texto: text('texto').notNull(),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
    ordem: integer('ordem').notNull().default(0),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'conteudo_chunks_origem_check',
      sql`(${table.conteudoId} IS NOT NULL AND ${table.fonteId} IS NULL) OR (${table.conteudoId} IS NULL AND ${table.fonteId} IS NOT NULL)`,
    ),
    index('idx_conteudo_chunks_embedding').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ],
);

export type Conteudo = typeof conteudos.$inferSelect;
export type NovoConteudo = typeof conteudos.$inferInsert;
export type ConteudoChunk = typeof conteudoChunks.$inferSelect;
export type NovoConteudoChunk = typeof conteudoChunks.$inferInsert;
