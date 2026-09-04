import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import {
  avaliacoes,
  avaliacaoExercicios,
  exercicios,
  modulosTrilha,
  NovaAvaliacao,
  NovoExercicio,
  NovaTentativaExercicio,
  resultadosAvaliacao,
  tentativasExercicio,
} from '../../database/schema';

@Injectable()
export class ExerciciosAvaliacoesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async criarExercicio(dados: NovoExercicio) {
    const [registro] = await this.db.insert(exercicios).values(dados).returning();
    return registro;
  }

  async buscarExercicioPorId(id: string) {
    return this.db.query.exercicios.findFirst({
      where: eq(exercicios.id, id),
      with: { modulo: true },
    });
  }

  async listarExerciciosPorModulo(moduloId: string) {
    return this.db.query.exercicios.findMany({
      where: eq(exercicios.moduloId, moduloId),
      orderBy: [desc(exercicios.criadoEm)],
    });
  }

  async listarExerciciosPublicosPorModulo(moduloId: string) {
    return this.db.query.exercicios.findMany({
      where: eq(exercicios.moduloId, moduloId),
      orderBy: [desc(exercicios.criadoEm)],
      columns: {
        id: true,
        moduloId: true,
        tipo: true,
        enunciado: true,
        dificuldade: true,
        criadoEm: true,
      },
    });
  }

  async listarExerciciosPorModulos(moduloIds: string[]) {
    if (moduloIds.length === 0) {
      return [];
    }
    return this.db.query.exercicios.findMany({
      where: inArray(exercicios.moduloId, moduloIds),
      orderBy: [desc(exercicios.criadoEm)],
    });
  }

  async listarExerciciosPorTrilha(trilhaId: string) {
    const modulos = await this.db.query.modulosTrilha.findMany({
      where: eq(modulosTrilha.trilhaId, trilhaId),
      columns: { id: true },
    });
    if (modulos.length === 0) {
      return [];
    }
    return this.db.query.exercicios.findMany({
      where: inArray(
        exercicios.moduloId,
        modulos.map((m) => m.id),
      ),
      orderBy: [desc(exercicios.criadoEm)],
    });
  }

  async listarModulosDaTrilha(trilhaId: string) {
    return this.db.query.modulosTrilha.findMany({
      where: eq(modulosTrilha.trilhaId, trilhaId),
      orderBy: [modulosTrilha.ordem],
    });
  }

  async contarTentativasPorExercicio(exercicioId: string) {
    const [resultado] = await this.db
      .select({ total: count() })
      .from(tentativasExercicio)
      .where(eq(tentativasExercicio.exercicioId, exercicioId));
    return resultado?.total ?? 0;
  }

  async salvarTentativa(dados: NovaTentativaExercicio) {
    const [registro] = await this.db.insert(tentativasExercicio).values(dados).returning();
    return registro;
  }

  async listarTentativasPorExercicio(exercicioId: string) {
    return this.db.query.tentativasExercicio.findMany({
      where: eq(tentativasExercicio.exercicioId, exercicioId),
      orderBy: [desc(tentativasExercicio.respondidoEm)],
    });
  }

  async listarTentativasPorExercicioEAvaliacao(
    exercicioId: string,
    avaliacaoId: string,
    perfilId: string,
  ) {
    return this.db.query.tentativasExercicio.findMany({
      where: and(
        eq(tentativasExercicio.exercicioId, exercicioId),
        eq(tentativasExercicio.avaliacaoId, avaliacaoId),
        eq(tentativasExercicio.perfilId, perfilId),
      ),
      orderBy: [desc(tentativasExercicio.respondidoEm)],
    });
  }

  async calcularEstatisticasPorExercicio(exercicioId: string) {
    const tentativas = await this.listarTentativasPorExercicio(exercicioId);
    const total = tentativas.length;
    const corretas = tentativas.filter((t) => t.correta === true).length;
    const pontuacaoMedia =
      total === 0
        ? null
        : tentativas.reduce((soma, t) => soma + Number(t.pontuacao ?? 0), 0) / total;

    return { total, corretas, incorretas: total - corretas, pontuacaoMedia };
  }

  async criarAvaliacao(dados: NovaAvaliacao, tx?: DrizzleDb) {
    const client = tx ?? this.db;
    const [registro] = await client.insert(avaliacoes).values(dados).returning();
    return registro;
  }

  async adicionarExerciciosNaAvaliacao(
    itens: Array<{ avaliacaoId: string; exercicioId: string; ordem: number }>,
    tx?: DrizzleDb,
  ) {
    if (itens.length === 0) {
      return [];
    }
    const client = tx ?? this.db;
    return client.insert(avaliacaoExercicios).values(itens).returning();
  }

  private getClient(tx?: DrizzleDb) {
    return tx ?? this.db;
  }

  async criarAvaliacaoComExercicios(
    dados: NovaAvaliacao,
    exerciciosIds: string[],
  ): Promise<{ avaliacaoId: string; exerciciosAdicionados: number }> {
    return this.db.transaction(async (tx) => {
      const avaliacao = await this.criarAvaliacao(dados, tx);

      if (exerciciosIds.length > 0) {
        await this.adicionarExerciciosNaAvaliacao(
          exerciciosIds.map((exercicioId, indice) => ({
            avaliacaoId: avaliacao.id,
            exercicioId,
            ordem: indice + 1,
          })),
          tx,
        );
      }

      return { avaliacaoId: avaliacao.id, exerciciosAdicionados: exerciciosIds.length };
    });
  }

  async salvarResultadoAvaliacao(dados: typeof resultadosAvaliacao.$inferInsert, tx?: DrizzleDb) {
    const client = tx ?? this.db;
    const [registro] = await client
      .insert(resultadosAvaliacao)
      .values(dados)
      .onConflictDoNothing()
      .returning();
    return registro;
  }

  async buscarResultadoPorAvaliacaoEPerfil(avaliacaoId: string, perfilId: string, tx?: DrizzleDb) {
    const client = tx ?? this.db;
    return client.query.resultadosAvaliacao.findFirst({
      where: and(
        eq(resultadosAvaliacao.avaliacaoId, avaliacaoId),
        eq(resultadosAvaliacao.perfilId, perfilId),
      ),
    });
  }

  async buscarAvaliacaoPorId(id: string) {
    return this.db.query.avaliacoes.findFirst({
      where: eq(avaliacoes.id, id),
      with: {
        modulo: { with: { trilha: { with: { objetivo: true } } } },
        trilha: { with: { objetivo: true } },
        exercicios: {
          with: {
            exercicio: {
              columns: {
                id: true,
                moduloId: true,
                tipo: true,
                enunciado: true,
                dificuldade: true,
                criadoEm: true,
              },
            },
          },
        },
      },
    });
  }
}
