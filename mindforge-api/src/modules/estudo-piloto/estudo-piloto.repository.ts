import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import {
  avaliacoes,
  avaliacaoExercicios,
  conteudos,
  conteudoFontes,
  exercicios,
  fontesPesquisa,
  modulosTrilha,
  objetivosEstudo,
  perfilAprendizagem,
  trilhasEstudo,
} from '../../database/schema';
import { aulasLibras, codigoPiloto } from './libras.catalogo';
import { matrizLibras } from './libras.matriz';
import { questoesAvaliacaoLibras } from './libras.avaliacao';

@Injectable()
export class EstudoPilotoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async instalar(perfilId: string) {
    return this.db.transaction(async (tx) => {
      // Serializa instalações do mesmo perfil sem criar nem substituir dados antigos.
      const [perfil] = await tx
        .select({ id: perfilAprendizagem.id })
        .from(perfilAprendizagem)
        .where(eq(perfilAprendizagem.id, perfilId))
        .for('update');
      if (!perfil) return null;
      const [existente] = await tx
        .select({ objetivoId: objetivosEstudo.id, trilhaId: trilhasEstudo.id })
        .from(trilhasEstudo)
        .innerJoin(objetivosEstudo, eq(objetivosEstudo.id, trilhasEstudo.objetivoId))
        .where(
          and(
            eq(objetivosEstudo.perfilId, perfilId),
            sql`${trilhasEstudo.metadata}->>'pilotoCodigo' = ${codigoPiloto}`,
          ),
        );
      if (existente) {
        const modulos = await tx
          .select({ id: modulosTrilha.id, titulo: modulosTrilha.titulo })
          .from(modulosTrilha)
          .where(eq(modulosTrilha.trilhaId, existente.trilhaId))
          .orderBy(asc(modulosTrilha.ordem));
        const [avaliacao] = await tx
          .select({ id: avaliacoes.id })
          .from(avaliacoes)
          .where(eq(avaliacoes.trilhaId, existente.trilhaId));
        const [total] = avaliacao
          ? await tx
              .select({ quantidade: count() })
              .from(avaliacaoExercicios)
              .where(eq(avaliacaoExercicios.avaliacaoId, avaliacao.id))
          : [];
        if (
          modulos.length !== aulasLibras.length ||
          !avaliacao ||
          total?.quantidade !== questoesAvaliacaoLibras.length
        )
          throw new ConflictException(
            'Piloto existente incompleto; revise os registros antes de reinstalar.',
          );
        return { ...existente, modulos, avaliacaoId: avaliacao.id, criado: false, conteudos: [] };
      }
      const [objetivo] = await tx
        .insert(objetivosEstudo)
        .values({
          perfilId,
          titulo: 'Professor Intérprete de Libras — conhecimentos específicos',
          descricao:
            'Onze aulas para os 19 itens específicos do edital, 26 questões de treino e avaliação com 19 questões distintas. Os núcleos comuns não integram esta trilha.',
          nivelDesejado: 'intermediario',
        })
        .returning();
      const [trilha] = await tx
        .insert(trilhasEstudo)
        .values({
          objetivoId: objetivo.id,
          geradoPorAgente: 'curadoria-editorial',
          metadata: {
            pilotoCodigo: codigoPiloto,
            revisadoEm: '2026-10-03',
            parcial: true,
            escopo: 'conhecimentos_especificos',
            matriz: matrizLibras,
          },
        })
        .returning();
      const [avaliacao] = await tx
        .insert(avaliacoes)
        .values({
          trilhaId: trilha.id,
          titulo: 'Avaliação autoral — conhecimentos específicos de Libras (19 questões)',
          tipo: 'formativa',
        })
        .returning();
      const modulos: { id: string; titulo: string }[] = [];
      const textos: { id: string; corpoMarkdown: string }[] = [];
      let ordemQuestao = 1;
      for (const [indice, aula] of aulasLibras.entries()) {
        const [modulo] = await tx
          .insert(modulosTrilha)
          .values({
            trilhaId: trilha.id,
            ordem: indice + 1,
            titulo: aula.titulo,
            objetivoAprendizagem: aula.objetivoAprendizagem,
            tempoEstimadoMin: aula.tempoEstimadoMin,
          })
          .returning();
        modulos.push({ id: modulo.id, titulo: modulo.titulo });
        const [conteudo] = await tx
          .insert(conteudos)
          .values({
            moduloId: modulo.id,
            titulo: aula.titulo,
            corpoMarkdown: aula.corpoMarkdown,
            status: 'publicado',
          })
          .returning();
        textos.push({ id: conteudo.id, corpoMarkdown: conteudo.corpoMarkdown });
        for (const fonte of aula.fontes) {
          const [registro] = await tx
            .insert(fontesPesquisa)
            .values({
              ...fonte,
              moduloId: modulo.id,
              tipo: 'documentacao_oficial',
              origem: 'busca_web',
              consultadoEm: new Date('2026-10-03T12:00:00Z'),
            })
            .returning();
          await tx.insert(conteudoFontes).values({ conteudoId: conteudo.id, fonteId: registro.id });
        }
        for (const questao of aula.questoes) {
          await tx.insert(exercicios).values({
            ...questao,
            moduloId: modulo.id,
            tipo: 'questao_objetiva',
            dificuldade: 'medio',
            finalidade: 'treino',
          });
        }
        for (const {
          itemEdital: _item,
          aulaCodigo: _codigo,
          ...questao
        } of aula.questoesAvaliacao) {
          void _item;
          void _codigo;
          const [registro] = await tx
            .insert(exercicios)
            .values({
              ...questao,
              moduloId: modulo.id,
              tipo: 'questao_objetiva',
              dificuldade: 'medio',
              finalidade: 'avaliacao',
            })
            .returning();
          await tx
            .insert(avaliacaoExercicios)
            .values({ avaliacaoId: avaliacao.id, exercicioId: registro.id, ordem: ordemQuestao++ });
        }
      }
      return {
        objetivoId: objetivo.id,
        trilhaId: trilha.id,
        modulos,
        avaliacaoId: avaliacao.id,
        criado: true,
        conteudos: textos,
      };
    });
  }
}
