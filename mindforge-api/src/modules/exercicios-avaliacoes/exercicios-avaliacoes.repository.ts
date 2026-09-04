import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import {
  avaliacoes,
  avaliacaoExercicios,
  exercicios,
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

  async contarTentativasPorExercicio(exercicioId: string) {
    const tentativas = await this.db.query.tentativasExercicio.findMany({
      where: eq(tentativasExercicio.exercicioId, exercicioId),
      columns: { id: true },
    });
    return tentativas.length;
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

  async criarAvaliacao(dados: NovaAvaliacao) {
    const [registro] = await this.db.insert(avaliacoes).values(dados).returning();
    return registro;
  }

  async adicionarExerciciosNaAvaliacao(
    itens: Array<{ avaliacaoId: string; exercicioId: string; ordem: number }>,
  ) {
    if (itens.length === 0) {
      return [];
    }
    return this.db.insert(avaliacaoExercicios).values(itens).returning();
  }

  async salvarResultadoAvaliacao(dados: typeof resultadosAvaliacao.$inferInsert) {
    const [registro] = await this.db.insert(resultadosAvaliacao).values(dados).returning();
    return registro;
  }

  async buscarAvaliacaoPorId(id: string) {
    return this.db.query.avaliacoes.findFirst({
      where: eq(avaliacoes.id, id),
      with: {
        modulo: true,
        trilha: true,
        exercicios: { with: { exercicio: true } },
      },
    });
  }
}
