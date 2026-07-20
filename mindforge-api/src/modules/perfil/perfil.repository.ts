import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { NovoPerfilAprendizagem, perfilAprendizagem } from '../../database/schema';

/**
 * Único ponto do módulo que importa `drizzle-orm` diretamente. O service
 * depende desta classe, não do client Drizzle — troca de ORM no futuro
 * fica confinada aqui (Dependency Inversion, sem precisar de uma interface
 * separada só para isso: para um projeto solo, a classe concreta já basta
 * como ponto único de substituição).
 */
@Injectable()
export class PerfilRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async criar(dados: NovoPerfilAprendizagem) {
    const [perfil] = await this.db.insert(perfilAprendizagem).values(dados).returning();
    return perfil;
  }

  async buscarPorId(id: string) {
    return this.db.query.perfilAprendizagem.findFirst({
      where: eq(perfilAprendizagem.id, id),
      with: { objetivos: true },
    });
  }

  async listar() {
    return this.db.query.perfilAprendizagem.findMany();
  }
}
