import { Inject, Injectable } from '@nestjs/common';
import { cosineDistance, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { conteudoChunks, NovoConteudoChunk } from '../../database/schema';

@Injectable()
export class BibliotecaVivaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async indexarChunk(dados: NovoConteudoChunk) {
    const [chunk] = await this.db.insert(conteudoChunks).values(dados).returning();
    return chunk;
  }

  async indexarChunks(dados: NovoConteudoChunk[]) {
    if (dados.length === 0) return [];
    return this.db.insert(conteudoChunks).values(dados).returning();
  }

  /**
   * Busca por similaridade de cosseno — a base do RAG da Biblioteca Viva.
   * `1 - cosineDistance` converte distância em score de similaridade
   * (1 = idêntico, 0 = ortogonal), mais intuitivo para consumir na API
   * do que a distância crua.
   */
  async buscarSimilares(embeddingConsulta: number[], limite: number) {
    const similaridade = sql<number>`1 - (${cosineDistance(
      conteudoChunks.embedding,
      embeddingConsulta,
    )})`;

    return this.db
      .select({
        id: conteudoChunks.id,
        texto: conteudoChunks.texto,
        conteudoId: conteudoChunks.conteudoId,
        fonteId: conteudoChunks.fonteId,
        similaridade,
      })
      .from(conteudoChunks)
      .orderBy(cosineDistance(conteudoChunks.embedding, embeddingConsulta))
      .limit(limite);
  }
}
