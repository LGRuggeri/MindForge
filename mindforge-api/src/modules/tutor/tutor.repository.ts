import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { historicoDuvidas, modulosTrilha, NovoHistoricoDuvida } from '../../database/schema';

@Injectable()
export class TutorRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async buscarModuloPorId(id: string) {
    return this.db.query.modulosTrilha.findFirst({
      where: eq(modulosTrilha.id, id),
      with: {
        trilha: {
          with: {
            objetivo: {
              with: {
                perfil: true,
              },
            },
          },
        },
      },
    });
  }

  async salvarDuvida(dados: NovoHistoricoDuvida) {
    const [registro] = await this.db.insert(historicoDuvidas).values(dados).returning();
    return registro;
  }

  async buscarDuvidaPorId(id: string) {
    return this.db.query.historicoDuvidas.findFirst({
      where: eq(historicoDuvidas.id, id),
    });
  }

  async avaliarDuvida(id: string, avaliacao: number, feedback?: string) {
    const [atualizado] = await this.db
      .update(historicoDuvidas)
      .set({ avaliacao, feedback, atualizadoEm: new Date() })
      .where(eq(historicoDuvidas.id, id))
      .returning();
    return atualizado;
  }

  async listarHistoricoPorPerfil(perfilId: string, limite = 50) {
    return this.db.query.historicoDuvidas.findMany({
      where: eq(historicoDuvidas.perfilId, perfilId),
      orderBy: [desc(historicoDuvidas.criadoEm)],
      limit: limite,
      with: { modulo: true },
    });
  }

  async listarHistoricoRecentePorPerfil(perfilId: string, limite = 5) {
    return this.db.query.historicoDuvidas.findMany({
      where: eq(historicoDuvidas.perfilId, perfilId),
      orderBy: [desc(historicoDuvidas.criadoEm)],
      limit: limite,
    });
  }
}
