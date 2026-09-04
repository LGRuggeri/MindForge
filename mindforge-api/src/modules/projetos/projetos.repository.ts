import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import {
  modulosTrilha,
  objetivosEstudo,
  projetos,
  projetoEntregas,
  NovoProjeto,
  NovaProjetoEntrega,
} from '../../database/schema';

@Injectable()
export class ProjetosRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async criar(dados: NovoProjeto) {
    const [registro] = await this.db.insert(projetos).values(dados).returning();
    return registro;
  }

  async listarPorModulo(moduloId: string) {
    return this.db.query.projetos.findMany({
      where: eq(projetos.moduloId, moduloId),
      orderBy: [desc(projetos.criadoEm)],
      with: { entregas: true },
    });
  }

  async listarPorObjetivo(objetivoId: string) {
    return this.db.query.projetos.findMany({
      where: eq(projetos.objetivoId, objetivoId),
      orderBy: [desc(projetos.criadoEm)],
      with: { entregas: true },
    });
  }

  async buscarPorId(id: string) {
    return this.db.query.projetos.findFirst({
      where: eq(projetos.id, id),
      with: { entregas: true, modulo: true, objetivo: true },
    });
  }

  async buscarModulo(moduloId: string) {
    return this.db.query.modulosTrilha.findFirst({
      where: eq(modulosTrilha.id, moduloId),
      columns: { id: true, titulo: true, objetivoAprendizagem: true },
      with: { trilha: { with: { objetivo: true } } },
    });
  }

  async buscarObjetivo(objetivoId: string) {
    return this.db.query.objetivosEstudo.findFirst({
      where: eq(objetivosEstudo.id, objetivoId),
      columns: { id: true, titulo: true, descricao: true, perfilId: true },
    });
  }

  async atualizarStatus(id: string, status: string) {
    const [atualizado] = await this.db
      .update(projetos)
      .set({ status, atualizadoEm: new Date() })
      .where(eq(projetos.id, id))
      .returning();
    return atualizado;
  }

  /**
   * Persiste a entrega alocando o número sequencial na mesma transação do
   * insert. A linha do projeto é travada com FOR UPDATE, então submissões
   * concorrentes do mesmo projeto serializam e não leem o mesmo contador.
   */
  async adicionarEntregaSequencial(
    projetoId: string,
    dados: Omit<NovaProjetoEntrega, 'projetoId' | 'numeroEntrega'>,
  ) {
    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: projetos.id })
        .from(projetos)
        .where(eq(projetos.id, projetoId))
        .for('update');

      const existentes = await tx
        .select({ id: projetoEntregas.id })
        .from(projetoEntregas)
        .where(eq(projetoEntregas.projetoId, projetoId));

      const [registro] = await tx
        .insert(projetoEntregas)
        .values({ ...dados, projetoId, numeroEntrega: existentes.length + 1 })
        .returning();
      return registro;
    });
  }

  async contarEntregas(projetoId: string) {
    const lista = await this.db.query.projetoEntregas.findMany({
      where: eq(projetoEntregas.projetoId, projetoId),
      columns: { id: true },
    });
    return lista.length;
  }
}
