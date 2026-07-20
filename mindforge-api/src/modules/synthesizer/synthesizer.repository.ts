import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import {
  conteudoFontes,
  conteudos,
  fontesPesquisa,
  modulosTrilha,
  NovoConteudo,
} from '../../database/schema';

@Injectable()
export class SynthesizerRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async buscarModuloPorId(id: string) {
    return this.db.query.modulosTrilha.findFirst({
      where: eq(modulosTrilha.id, id),
      with: { trilha: { with: { objetivo: { with: { perfil: true } } } } },
    });
  }

  async listarFontesPorModulo(moduloId: string) {
    return this.db.query.fontesPesquisa.findMany({
      where: eq(fontesPesquisa.moduloId, moduloId),
    });
  }

  async criarConteudo(dados: NovoConteudo) {
    const [conteudo] = await this.db.insert(conteudos).values(dados).returning();
    return conteudo;
  }

  async vincularFontes(conteudoId: string, fonteIds: string[]) {
    if (fonteIds.length === 0) return [];
    return this.db
      .insert(conteudoFontes)
      .values(fonteIds.map((fonteId) => ({ conteudoId, fonteId })))
      .onConflictDoNothing()
      .returning();
  }

  async listarConteudosPorModulo(moduloId: string) {
    return this.db.query.conteudos.findMany({
      where: eq(conteudos.moduloId, moduloId),
      orderBy: (tabela, { desc }) => [desc(tabela.criadoEm)],
    });
  }
}
