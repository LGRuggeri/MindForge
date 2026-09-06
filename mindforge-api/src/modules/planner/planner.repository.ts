import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import {
  competencias,
  modulosTrilha,
  moduloCompetencias,
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

  /**
   * Remove o objetivo e, em cascata no banco, suas trilhas, módulos,
   * conteúdos, exercícios e vínculos de diário. Avaliações, projetos e
   * fontes de pesquisa sobrevivem com a referência anulada (set null).
   */
  async removerObjetivo(id: string) {
    const [removido] = await this.db
      .delete(objetivosEstudo)
      .where(eq(objetivosEstudo.id, id))
      .returning();
    return removido;
  }

  /** Competências vinculadas a qualquer módulo das trilhas do objetivo. */
  async listarCompetenciasDosModulosDoObjetivo(objetivoId: string): Promise<string[]> {
    const linhas = await this.db
      .selectDistinct({ competenciaId: moduloCompetencias.competenciaId })
      .from(moduloCompetencias)
      .innerJoin(modulosTrilha, eq(moduloCompetencias.moduloId, modulosTrilha.id))
      .innerJoin(trilhasEstudo, eq(modulosTrilha.trilhaId, trilhasEstudo.id))
      .where(eq(trilhasEstudo.objetivoId, objetivoId));
    return linhas.map((linha) => linha.competenciaId);
  }

  /**
   * Remove competências auto-derivadas (planner/synthesizer) que ficaram sem
   * nenhum vínculo com módulo — ou seja, pertenciam só ao conteúdo excluído.
   * Competências compartilhadas com outros objetivos são preservadas.
   * Relações e progresso em cascata no banco.
   */
  async removerCompetenciasOrfas(competenciaIds: string[]): Promise<number> {
    if (competenciaIds.length === 0) return 0;
    const aindaVinculadas = await this.db
      .selectDistinct({ competenciaId: moduloCompetencias.competenciaId })
      .from(moduloCompetencias)
      .where(inArray(moduloCompetencias.competenciaId, competenciaIds));
    const semVinculo = competenciaIds.filter(
      (id) => !aindaVinculadas.some((linha) => linha.competenciaId === id),
    );
    if (semVinculo.length === 0) return 0;
    const removidas = await this.db
      .delete(competencias)
      .where(
        and(
          inArray(competencias.id, semVinculo),
          inArray(competencias.categoria, ['planner', 'synthesizer']),
        ),
      )
      .returning({ id: competencias.id });
    return removidas.length;
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
