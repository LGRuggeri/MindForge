import { relations } from 'drizzle-orm';
import { perfilAprendizagem } from './perfil.schema';
import { objetivosEstudo } from './objetivos.schema';
import { trilhasEstudo, modulosTrilha, historicoDuvidas } from './trilhas.schema';
import { fontesPesquisa } from './pesquisa.schema';
import { conteudos, conteudoFontes, conteudoChunks } from './conteudos.schema';
import { exercicios, tentativasExercicio } from './exercicios.schema';
import { avaliacoes, avaliacaoExercicios, resultadosAvaliacao } from './avaliacoes.schema';
import { diarioAprendizagem, diarioModulos } from './diario.schema';
import {
  competencias,
  competenciaRelacoes,
  competenciaProgresso,
  moduloCompetencias,
} from './competencias.schema';
import { projetos, projetoEntregas } from './projetos.schema';

export * from './perfil.schema';
export * from './objetivos.schema';
export * from './trilhas.schema';
export * from './pesquisa.schema';
export * from './conteudos.schema';
export * from './atividades-conteudo.schema';
export * from './exercicios.schema';
export * from './avaliacoes.schema';
export * from './revisao.schema';
export * from './diario.schema';
export * from './competencias.schema';
export * from './projetos.schema';
export * from './agentes.schema';

export const perfilRelations = relations(perfilAprendizagem, ({ many }) => ({
  objetivos: many(objetivosEstudo),
  diario: many(diarioAprendizagem),
  competenciaProgresso: many(competenciaProgresso),
  historicoDuvidas: many(historicoDuvidas),
}));

export const objetivosRelations = relations(objetivosEstudo, ({ one, many }) => ({
  perfil: one(perfilAprendizagem, {
    fields: [objetivosEstudo.perfilId],
    references: [perfilAprendizagem.id],
  }),
  trilhas: many(trilhasEstudo),
}));

export const trilhasRelations = relations(trilhasEstudo, ({ one, many }) => ({
  objetivo: one(objetivosEstudo, {
    fields: [trilhasEstudo.objetivoId],
    references: [objetivosEstudo.id],
  }),
  modulos: many(modulosTrilha),
  avaliacoes: many(avaliacoes),
}));

export const modulosRelations = relations(modulosTrilha, ({ one, many }) => ({
  trilha: one(trilhasEstudo, {
    fields: [modulosTrilha.trilhaId],
    references: [trilhasEstudo.id],
  }),
  fontes: many(fontesPesquisa),
  conteudos: many(conteudos),
  exercicios: many(exercicios),
  competencias: many(moduloCompetencias),
  historicoDuvidas: many(historicoDuvidas),
}));

export const conteudosRelations = relations(conteudos, ({ one, many }) => ({
  modulo: one(modulosTrilha, {
    fields: [conteudos.moduloId],
    references: [modulosTrilha.id],
  }),
  chunks: many(conteudoChunks),
  fontesCitadas: many(conteudoFontes),
}));

export const conteudoChunksRelations = relations(conteudoChunks, ({ one }) => ({
  conteudo: one(conteudos, {
    fields: [conteudoChunks.conteudoId],
    references: [conteudos.id],
  }),
  fonte: one(fontesPesquisa, {
    fields: [conteudoChunks.fonteId],
    references: [fontesPesquisa.id],
  }),
}));

export const exerciciosRelations = relations(exercicios, ({ one, many }) => ({
  modulo: one(modulosTrilha, {
    fields: [exercicios.moduloId],
    references: [modulosTrilha.id],
  }),
  tentativas: many(tentativasExercicio),
}));

export const avaliacoesRelations = relations(avaliacoes, ({ one, many }) => ({
  modulo: one(modulosTrilha, {
    fields: [avaliacoes.moduloId],
    references: [modulosTrilha.id],
  }),
  trilha: one(trilhasEstudo, {
    fields: [avaliacoes.trilhaId],
    references: [trilhasEstudo.id],
  }),
  exercicios: many(avaliacaoExercicios),
  resultados: many(resultadosAvaliacao),
}));

export const avaliacaoExerciciosRelations = relations(avaliacaoExercicios, ({ one }) => ({
  avaliacao: one(avaliacoes, {
    fields: [avaliacaoExercicios.avaliacaoId],
    references: [avaliacoes.id],
  }),
  exercicio: one(exercicios, {
    fields: [avaliacaoExercicios.exercicioId],
    references: [exercicios.id],
  }),
}));

export const competenciasRelations = relations(competencias, ({ many }) => ({
  relacoesOrigem: many(competenciaRelacoes, { relationName: 'origem' }),
  relacoesDestino: many(competenciaRelacoes, { relationName: 'destino' }),
  progresso: many(competenciaProgresso),
  modulos: many(moduloCompetencias),
}));

export const competenciaRelacoesRelations = relations(competenciaRelacoes, ({ one }) => ({
  origem: one(competencias, {
    fields: [competenciaRelacoes.competenciaOrigemId],
    references: [competencias.id],
    relationName: 'origem',
  }),
  destino: one(competencias, {
    fields: [competenciaRelacoes.competenciaDestinoId],
    references: [competencias.id],
    relationName: 'destino',
  }),
}));

export const moduloCompetenciasRelations = relations(moduloCompetencias, ({ one }) => ({
  modulo: one(modulosTrilha, {
    fields: [moduloCompetencias.moduloId],
    references: [modulosTrilha.id],
  }),
  competencia: one(competencias, {
    fields: [moduloCompetencias.competenciaId],
    references: [competencias.id],
  }),
}));

export const competenciaProgressoRelations = relations(competenciaProgresso, ({ one }) => ({
  competencia: one(competencias, {
    fields: [competenciaProgresso.competenciaId],
    references: [competencias.id],
  }),
  perfil: one(perfilAprendizagem, {
    fields: [competenciaProgresso.perfilId],
    references: [perfilAprendizagem.id],
  }),
}));

export const diarioRelations = relations(diarioAprendizagem, ({ one, many }) => ({
  perfil: one(perfilAprendizagem, {
    fields: [diarioAprendizagem.perfilId],
    references: [perfilAprendizagem.id],
  }),
  modulos: many(diarioModulos),
}));

export const diarioModulosRelations = relations(diarioModulos, ({ one }) => ({
  diario: one(diarioAprendizagem, {
    fields: [diarioModulos.diarioId],
    references: [diarioAprendizagem.id],
  }),
  modulo: one(modulosTrilha, {
    fields: [diarioModulos.moduloId],
    references: [modulosTrilha.id],
  }),
}));

export const historicoDuvidasRelations = relations(historicoDuvidas, ({ one }) => ({
  perfil: one(perfilAprendizagem, {
    fields: [historicoDuvidas.perfilId],
    references: [perfilAprendizagem.id],
  }),
  modulo: one(modulosTrilha, {
    fields: [historicoDuvidas.moduloId],
    references: [modulosTrilha.id],
  }),
}));

export const projetosRelations = relations(projetos, ({ one, many }) => ({
  modulo: one(modulosTrilha, {
    fields: [projetos.moduloId],
    references: [modulosTrilha.id],
  }),
  objetivo: one(objetivosEstudo, {
    fields: [projetos.objetivoId],
    references: [objetivosEstudo.id],
  }),
  perfil: one(perfilAprendizagem, {
    fields: [projetos.perfilId],
    references: [perfilAprendizagem.id],
  }),
  entregas: many(projetoEntregas),
}));

export const projetoEntregasRelations = relations(projetoEntregas, ({ one }) => ({
  projeto: one(projetos, {
    fields: [projetoEntregas.projetoId],
    references: [projetos.id],
  }),
}));
