import { Inject, Injectable } from '@nestjs/common';
import { and, eq, exists, isNull, or } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import {
  competenciaProgresso,
  competencias,
  conteudos,
  exercicios,
  moduloCompetencias,
  modulosTrilha,
  NovaRevisaoEspacada,
  objetivosEstudo,
  RevisaoEspacada,
  revisaoEspacada,
  trilhasEstudo,
} from '../../database/schema';

export interface ItemParaRevisao {
  titulo: string;
  texto: string;
  resposta: string | null;
  moduloId: string | null;
}

@Injectable()
export class RevisaoEspacadaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async buscarPorItem(
    perfilId: string,
    itemTipo: string,
    itemId: string,
    tx?: DrizzleDb,
  ): Promise<RevisaoEspacada | undefined> {
    return (tx ?? this.db).query.revisaoEspacada.findFirst({
      where: and(
        eq(revisaoEspacada.perfilId, perfilId),
        eq(revisaoEspacada.itemTipo, itemTipo),
        eq(revisaoEspacada.itemId, itemId),
      ),
    });
  }

  async buscarPorId(id: string, perfilId: string): Promise<RevisaoEspacada | undefined> {
    return this.db.query.revisaoEspacada.findFirst({
      where: and(eq(revisaoEspacada.id, id), eq(revisaoEspacada.perfilId, perfilId)),
    });
  }

  async criar(dados: NovaRevisaoEspacada, tx?: DrizzleDb) {
    const [registro] = await (tx ?? this.db).insert(revisaoEspacada).values(dados).returning();
    return registro;
  }

  async atualizarSeAtual(anterior: RevisaoEspacada, dados: NovaRevisaoEspacada, tx?: DrizzleDb) {
    // Compare-and-swap: somente a versão lida pode avançar a agenda.
    const [registro] = await (tx ?? this.db)
      .update(revisaoEspacada)
      .set(dados)
      .where(
        and(
          eq(revisaoEspacada.id, anterior.id),
          anterior.perfilId
            ? eq(revisaoEspacada.perfilId, anterior.perfilId)
            : isNull(revisaoEspacada.perfilId),
          eq(revisaoEspacada.proximaRevisao, anterior.proximaRevisao),
          eq(revisaoEspacada.repeticoes, anterior.repeticoes),
          eq(revisaoEspacada.intervaloDias, anterior.intervaloDias),
          eq(revisaoEspacada.fatorFacilidade, anterior.fatorFacilidade),
          anterior.ultimaRevisao
            ? eq(revisaoEspacada.ultimaRevisao, anterior.ultimaRevisao)
            : isNull(revisaoEspacada.ultimaRevisao),
        ),
      )
      .returning();
    return registro;
  }

  private competenciaDoPerfil(competenciaId: typeof competencias.id, perfilId: string) {
    return or(
      exists(
        this.db
          .select({ id: competenciaProgresso.id })
          .from(competenciaProgresso)
          .where(
            and(
              eq(competenciaProgresso.competenciaId, competenciaId),
              eq(competenciaProgresso.perfilId, perfilId),
            ),
          ),
      ),
      exists(
        this.db
          .select({ id: moduloCompetencias.competenciaId })
          .from(moduloCompetencias)
          .innerJoin(modulosTrilha, eq(modulosTrilha.id, moduloCompetencias.moduloId))
          .innerJoin(trilhasEstudo, eq(trilhasEstudo.id, modulosTrilha.trilhaId))
          .innerJoin(objetivosEstudo, eq(objetivosEstudo.id, trilhasEstudo.objetivoId))
          .where(
            and(
              eq(moduloCompetencias.competenciaId, competenciaId),
              eq(objetivosEstudo.perfilId, perfilId),
            ),
          ),
      ),
    );
  }

  async listar(perfilId: string, data?: string) {
    // As referências são polimórficas: itens excluídos ou de outro perfil
    // não devem continuar aparecendo na agenda. EXISTS evita N+1 e duplicatas.
    const exercicioValido = this.db
      .select({ id: exercicios.id })
      .from(exercicios)
      .innerJoin(modulosTrilha, eq(modulosTrilha.id, exercicios.moduloId))
      .innerJoin(trilhasEstudo, eq(trilhasEstudo.id, modulosTrilha.trilhaId))
      .innerJoin(objetivosEstudo, eq(objetivosEstudo.id, trilhasEstudo.objetivoId))
      .where(
        and(eq(exercicios.id, revisaoEspacada.itemId), eq(objetivosEstudo.perfilId, perfilId)),
      );
    const conteudoValido = this.db
      .select({ id: conteudos.id })
      .from(conteudos)
      .innerJoin(modulosTrilha, eq(modulosTrilha.id, conteudos.moduloId))
      .innerJoin(trilhasEstudo, eq(trilhasEstudo.id, modulosTrilha.trilhaId))
      .innerJoin(objetivosEstudo, eq(objetivosEstudo.id, trilhasEstudo.objetivoId))
      .where(and(eq(conteudos.id, revisaoEspacada.itemId), eq(objetivosEstudo.perfilId, perfilId)));
    const competenciaValida = this.db
      .select({ id: competencias.id })
      .from(competencias)
      .where(
        and(
          eq(competencias.id, revisaoEspacada.itemId),
          this.competenciaDoPerfil(competencias.id, perfilId),
        ),
      );
    return this.db
      .select()
      .from(revisaoEspacada)
      .where(
        and(
          eq(revisaoEspacada.perfilId, perfilId),
          data ? eq(revisaoEspacada.proximaRevisao, data) : undefined,
          or(
            and(eq(revisaoEspacada.itemTipo, 'exercicio'), exists(exercicioValido)),
            and(eq(revisaoEspacada.itemTipo, 'conteudo'), exists(conteudoValido)),
            and(eq(revisaoEspacada.itemTipo, 'competencia'), exists(competenciaValida)),
          ),
        ),
      )
      .orderBy(revisaoEspacada.proximaRevisao, revisaoEspacada.id);
  }

  async buscarItem(
    itemTipo: string,
    itemId: string,
    perfilId: string,
  ): Promise<ItemParaRevisao | undefined> {
    if (itemTipo === 'exercicio') {
      const [item] = await this.db
        .select({
          texto: exercicios.enunciado,
          resposta: exercicios.gabarito,
          moduloId: exercicios.moduloId,
          titulo: modulosTrilha.titulo,
        })
        .from(exercicios)
        .innerJoin(modulosTrilha, eq(modulosTrilha.id, exercicios.moduloId))
        .innerJoin(trilhasEstudo, eq(trilhasEstudo.id, modulosTrilha.trilhaId))
        .innerJoin(objetivosEstudo, eq(objetivosEstudo.id, trilhasEstudo.objetivoId))
        .where(and(eq(exercicios.id, itemId), eq(objetivosEstudo.perfilId, perfilId)));
      return item;
    }
    if (itemTipo === 'conteudo') {
      const [item] = await this.db
        .select({
          texto: conteudos.corpoMarkdown,
          moduloId: conteudos.moduloId,
          titulo: conteudos.titulo,
        })
        .from(conteudos)
        .innerJoin(modulosTrilha, eq(modulosTrilha.id, conteudos.moduloId))
        .innerJoin(trilhasEstudo, eq(trilhasEstudo.id, modulosTrilha.trilhaId))
        .innerJoin(objetivosEstudo, eq(objetivosEstudo.id, trilhasEstudo.objetivoId))
        .where(and(eq(conteudos.id, itemId), eq(objetivosEstudo.perfilId, perfilId)));
      return item ? { ...item, resposta: null } : undefined;
    }
    if (itemTipo === 'competencia') {
      const [item] = await this.db
        .select({ titulo: competencias.nome, descricao: competencias.descricao })
        .from(competencias)
        .where(
          and(eq(competencias.id, itemId), this.competenciaDoPerfil(competencias.id, perfilId)),
        );
      return item
        ? {
            titulo: item.titulo,
            texto: item.descricao ?? item.titulo,
            resposta: null,
            moduloId: null,
          }
        : undefined;
    }
    return undefined;
  }
}
