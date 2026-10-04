import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { conteudos, NovaRespostaAtividade, respostasAtividades } from '../../database/schema';

@Injectable()
export class AtividadesConteudoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async buscarConteudo(id: string) {
    return this.db.query.conteudos.findFirst({
      where: eq(conteudos.id, id),
      with: { modulo: { with: { trilha: { with: { objetivo: true } } } } },
    });
  }

  async listarRespostas(conteudoId: string, perfilId: string) {
    return this.db
      .select()
      .from(respostasAtividades)
      .where(
        and(
          eq(respostasAtividades.conteudoId, conteudoId),
          eq(respostasAtividades.perfilId, perfilId),
        ),
      );
  }

  async salvarResposta(dados: NovaRespostaAtividade) {
    const [salva] = await this.db
      .insert(respostasAtividades)
      .values(dados)
      .onConflictDoUpdate({
        target: [
          respostasAtividades.conteudoId,
          respostasAtividades.perfilId,
          respostasAtividades.atividadeChave,
        ],
        set: { resposta: dados.resposta, atualizadoEm: new Date() },
      })
      .returning();
    return salva;
  }
}
