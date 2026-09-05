import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import {
  diarioAprendizagem,
  diarioModulos,
  modulosTrilha,
  NovoDiarioAprendizagem,
  objetivosEstudo,
  trilhasEstudo,
} from '../../database/schema';

@Injectable()
export class DiarioRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async criar(dados: NovoDiarioAprendizagem, moduloIds: string[] = []) {
    const [registro] = await this.db.insert(diarioAprendizagem).values(dados).returning();

    if (moduloIds.length > 0) {
      await this.db
        .insert(diarioModulos)
        .values(moduloIds.map((moduloId) => ({ diarioId: registro.id, moduloId })))
        .onConflictDoNothing();
    }

    return this.buscarPorId(registro.id);
  }

  /**
   * Conta quantos dos módulos informados pertencem a objetivos do perfil.
   * Usado para validar propriedade antes de vincular ao registro diário.
   */
  async contarModulosDoPerfil(perfilId: string, moduloIds: string[]): Promise<number> {
    if (moduloIds.length === 0) return 0;
    const [resultado] = await this.db
      .select({ total: count() })
      .from(modulosTrilha)
      .innerJoin(trilhasEstudo, eq(modulosTrilha.trilhaId, trilhasEstudo.id))
      .innerJoin(objetivosEstudo, eq(trilhasEstudo.objetivoId, objetivosEstudo.id))
      .where(and(eq(objetivosEstudo.perfilId, perfilId), inArray(modulosTrilha.id, moduloIds)));
    return resultado?.total ?? 0;
  }

  async buscarPorId(id: string) {
    return this.db.query.diarioAprendizagem.findFirst({
      where: eq(diarioAprendizagem.id, id),
      with: { modulos: { with: { modulo: true } } },
    });
  }

  async listarPorPerfil(perfilId: string, limite = 30) {
    return this.db.query.diarioAprendizagem.findMany({
      where: eq(diarioAprendizagem.perfilId, perfilId),
      orderBy: [desc(diarioAprendizagem.data)],
      limit: limite,
      with: { modulos: { with: { modulo: true } } },
    });
  }

  async atualizarRecomendacoes(id: string, recomendacoesIa: string) {
    const [atualizado] = await this.db
      .update(diarioAprendizagem)
      .set({ recomendacoesIa })
      .where(eq(diarioAprendizagem.id, id))
      .returning();
    return atualizado;
  }
}
