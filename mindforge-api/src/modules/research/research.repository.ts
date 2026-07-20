import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { fontesPesquisa, modulosTrilha, NovaFontePesquisa } from '../../database/schema';

@Injectable()
export class ResearchRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async buscarModuloPorId(id: string) {
    return this.db.query.modulosTrilha.findFirst({
      where: eq(modulosTrilha.id, id),
      with: { trilha: { with: { objetivo: { with: { perfil: true } } } } },
    });
  }

  async criarFontes(dados: NovaFontePesquisa[]) {
    if (dados.length === 0) return [];
    return this.db.insert(fontesPesquisa).values(dados).returning();
  }

  async listarPorModulo(moduloId: string) {
    return this.db.query.fontesPesquisa.findMany({
      where: eq(fontesPesquisa.moduloId, moduloId),
    });
  }
}
