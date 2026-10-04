import { sql } from 'drizzle-orm';
import { check, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { conteudos } from './conteudos.schema';
import { perfilAprendizagem } from './perfil.schema';

export const respostasAtividades = pgTable(
  'respostas_atividades',
  {
    conteudoId: uuid('conteudo_id')
      .notNull()
      .references(() => conteudos.id, { onDelete: 'cascade' }),
    perfilId: uuid('perfil_id')
      .notNull()
      .references(() => perfilAprendizagem.id, { onDelete: 'cascade' }),
    atividadeChave: text('atividade_chave').notNull(),
    enunciado: text('enunciado').notNull(),
    resposta: text('resposta').notNull(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.conteudoId, t.perfilId, t.atividadeChave] }),
    check('respostas_atividades_chave_check', sql`${t.atividadeChave} ~ '^[0-9a-f]{64}$'`),
    check(
      'respostas_atividades_texto_check',
      sql`char_length(btrim(${t.resposta})) BETWEEN 1 AND 10000`,
    ),
  ],
);

export type NovaRespostaAtividade = typeof respostasAtividades.$inferInsert;
