import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ne } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import {
  modulosTrilha,
  NovoModuloTrilha,
  NovaTrilhaEstudo,
  NovoObjetivoEstudo,
  objetivosEstudo,
  trilhasEstudo,
} from '../../database/schema';

@Injectable()
export class PlannerRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async criarObjetivo(dados: NovoObjetivoEstudo) {
    const [objetivo] = await this.db.insert(objetivosEstudo).values(dados).returning();
    return objetivo;
  }

  async buscarObjetivoPorId(id: string) {
    return this.db.query.objetivosEstudo.findFirst({
      where: eq(objetivosEstudo.id, id),
      with: {
        perfil: true,
        trilhas: {
          orderBy: [desc(trilhasEstudo.criadoEm)],
          with: { modulos: true },
        },
      },
    });
  }

  private getClient(tx?: DrizzleDb) {
    return tx ?? this.db;
  }

  async criarTrilha(dados: NovaTrilhaEstudo, tx?: DrizzleDb) {
    const client = this.getClient(tx);
    const [trilha] = await client.insert(trilhasEstudo).values(dados).returning();
    return trilha;
  }

  async substituirTrilhasAnteriores(
    objetivoId: string,
    trilhaAtualId: string,
    tx?: DrizzleDb,
  ): Promise<void> {
    const client = this.getClient(tx);
    await client
      .update(trilhasEstudo)
      .set({ status: 'substituida' })
      .where(
        and(
          eq(trilhasEstudo.objetivoId, objetivoId),
          ne(trilhasEstudo.id, trilhaAtualId),
          eq(trilhasEstudo.status, 'ativa'),
        ),
      );
  }

  async criarModulos(dados: NovoModuloTrilha[], tx?: DrizzleDb) {
    if (dados.length === 0) return [];
    const client = this.getClient(tx);
    return client.insert(modulosTrilha).values(dados).returning();
  }

  async executarEmTransacao<T>(fn: (tx: DrizzleDb) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  async listarObjetivosDoPerfil(perfilId: string) {
    return this.db.query.objetivosEstudo.findMany({
      where: eq(objetivosEstudo.perfilId, perfilId),
      with: { trilhas: true },
    });
  }

  async buscarModuloPorId(id: string) {
    return this.db.query.modulosTrilha.findFirst({
      where: eq(modulosTrilha.id, id),
      with: { trilha: { with: { objetivo: true } } },
    });
  }
}
