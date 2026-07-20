import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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
      with: { perfil: true, trilhas: { with: { modulos: true } } },
    });
  }

  async criarTrilha(dados: NovaTrilhaEstudo) {
    const [trilha] = await this.db.insert(trilhasEstudo).values(dados).returning();
    return trilha;
  }

  async criarModulos(dados: NovoModuloTrilha[]) {
    if (dados.length === 0) return [];
    return this.db.insert(modulosTrilha).values(dados).returning();
  }

  async listarObjetivosDoPerfil(perfilId: string) {
    return this.db.query.objetivosEstudo.findMany({
      where: eq(objetivosEstudo.perfilId, perfilId),
      with: { trilhas: true },
    });
  }
}
