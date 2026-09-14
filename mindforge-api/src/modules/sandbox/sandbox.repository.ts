import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { exercicios, modulosTrilha, trilhasEstudo, objetivosEstudo } from '../../database/schema';

@Injectable()
export class SandboxRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async buscarExercicio(id: string) {
    const [registro] = await this.db
      .select({ tipo: exercicios.tipo, perfilId: objetivosEstudo.perfilId })
      .from(exercicios)
      .innerJoin(modulosTrilha, eq(exercicios.moduloId, modulosTrilha.id))
      .innerJoin(trilhasEstudo, eq(modulosTrilha.trilhaId, trilhasEstudo.id))
      .innerJoin(objetivosEstudo, eq(trilhasEstudo.objetivoId, objetivosEstudo.id))
      .where(eq(exercicios.id, id))
      .limit(1);
    return registro;
  }
}
