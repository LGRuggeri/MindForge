import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import {
  competencias,
  competenciaRelacoes,
  competenciaProgresso,
  moduloCompetencias,
  Competencia,
  NovaCompetencia,
  NovoModuloCompetencia,
  CompetenciaProgresso,
} from '../../database/schema';

export interface CompetenciaComProgresso extends Competencia {
  progresso?: CompetenciaProgresso[] | null;
}

export interface CompetenciaComProgressoERelacoes extends Competencia {
  progresso?: CompetenciaProgresso[] | null;
  relacoesOrigem: Array<{ destino: Competencia; tipoRelacao: string }>;
  relacoesDestino: Array<{ origem: Competencia; tipoRelacao: string }>;
}

export interface CaminhoNo {
  id: string;
  nome: string;
  tipoRelacao: string;
  profundidade: number;
  [key: string]: string | number;
}

@Injectable()
export class KnowledgeGraphRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async criarCompetencia(dados: NovaCompetencia) {
    const [competencia] = await this.db.insert(competencias).values(dados).returning();
    return competencia;
  }

  async buscarCompetenciaPorId(id: string) {
    return this.db.query.competencias.findFirst({
      where: eq(competencias.id, id),
      with: {
        relacoesOrigem: { with: { destino: true } },
        relacoesDestino: { with: { origem: true } },
        progresso: true,
      },
    });
  }

  async buscarCompetenciaPorNome(nome: string) {
    return this.db.query.competencias.findFirst({
      where: eq(competencias.nome, nome),
    });
  }

  async listarCompetencias() {
    return this.db.query.competencias.findMany({
      orderBy: [competencias.nome],
      with: {
        relacoesOrigem: { with: { destino: true } },
        relacoesDestino: { with: { origem: true } },
      },
    });
  }

  async criarRelacao(dados: {
    competenciaOrigemId: string;
    competenciaDestinoId: string;
    tipoRelacao: string;
  }) {
    const [relacao] = await this.db.insert(competenciaRelacoes).values(dados).returning();
    return relacao;
  }

  async vincularModuloCompetencias(dados: NovoModuloCompetencia[]) {
    if (dados.length === 0) return [];
    return this.db.insert(moduloCompetencias).values(dados).returning();
  }

  async listarCompetenciasDoModulo(moduloId: string) {
    return this.db.query.moduloCompetencias.findMany({
      where: eq(moduloCompetencias.moduloId, moduloId),
      with: { competencia: true, modulo: true },
    });
  }

  async listarCompetenciasDoPerfil(perfilId: string) {
    return this.db.query.competencias.findMany({
      orderBy: [competencias.nome],
      with: {
        progresso: {
          where: eq(competenciaProgresso.perfilId, perfilId),
          orderBy: [desc(competenciaProgresso.atualizadoEm)],
          limit: 1,
        },
        modulos: { with: { modulo: true } },
      },
    });
  }

  async listarCompetenciasDoPerfilComRelacoes(
    perfilId: string,
  ): Promise<CompetenciaComProgressoERelacoes[]> {
    return this.db.query.competencias.findMany({
      orderBy: [competencias.nome],
      with: {
        progresso: {
          where: eq(competenciaProgresso.perfilId, perfilId),
          orderBy: [desc(competenciaProgresso.atualizadoEm)],
          limit: 1,
        },
        relacoesOrigem: {
          with: { destino: true },
          where: eq(competenciaRelacoes.tipoRelacao, 'pre_requisito'),
        },
        relacoesDestino: {
          with: { origem: true },
          where: eq(competenciaRelacoes.tipoRelacao, 'pre_requisito'),
        },
        modulos: { with: { modulo: true } },
      },
    }) as Promise<CompetenciaComProgressoERelacoes[]>;
  }

  async atualizarProgresso(
    competenciaId: string,
    perfilId: string,
    nivel: string,
    evidencia?: string,
  ) {
    const agora = new Date();
    const [existente] = await this.db
      .select()
      .from(competenciaProgresso)
      .where(
        and(
          eq(competenciaProgresso.competenciaId, competenciaId),
          eq(competenciaProgresso.perfilId, perfilId),
        ),
      );

    if (existente) {
      const [atualizado] = await this.db
        .update(competenciaProgresso)
        .set({ nivelAtual: nivel, evidencia, atualizadoEm: agora })
        .where(eq(competenciaProgresso.id, existente.id))
        .returning();
      return atualizado;
    }

    const [novo] = await this.db
      .insert(competenciaProgresso)
      .values({
        competenciaId,
        perfilId,
        nivelAtual: nivel,
        evidencia,
        atualizadoEm: agora,
      })
      .returning();
    return novo;
  }

  async buscarProgressoDoPerfil(perfilId: string, competenciaId: string) {
    return this.db.query.competenciaProgresso.findFirst({
      where: and(
        eq(competenciaProgresso.perfilId, perfilId),
        eq(competenciaProgresso.competenciaId, competenciaId),
      ),
    });
  }

  async buscarCaminhoDePreRequisitos(competenciaId: string): Promise<CaminhoNo[]> {
    const result = await this.db.execute<CaminhoNo>(sql`
      WITH RECURSIVE cadeia AS (
        SELECT
          c.id,
          c.nome,
          r.tipo_relacao,
          0 AS profundidade
        FROM competencias c
        JOIN competencia_relacoes r ON r.competencia_destino_id = c.id
        WHERE c.id = ${competenciaId}
          AND r.tipo_relacao = 'pre_requisito'
        UNION ALL
        SELECT
          c.id,
          c.nome,
          r.tipo_relacao,
          cadeia.profundidade + 1
        FROM competencia_relacoes r
        JOIN competencias c ON c.id = r.competencia_destino_id
        JOIN cadeia ON cadeia.id = r.competencia_origem_id
        WHERE r.tipo_relacao = 'pre_requisito'
          AND cadeia.profundidade < 10
      )
      SELECT * FROM cadeia ORDER BY profundidade DESC, nome;
    `);
    return result.rows;
  }

  async buscarDependentes(competenciaId: string): Promise<CaminhoNo[]> {
    const result = await this.db.execute<CaminhoNo>(sql`
      WITH RECURSIVE cadeia AS (
        SELECT
          c.id,
          c.nome,
          r.tipo_relacao,
          0 AS profundidade
        FROM competencias c
        JOIN competencia_relacoes r ON r.competencia_origem_id = c.id
        WHERE c.id = ${competenciaId}
          AND r.tipo_relacao = 'pre_requisito'
        UNION ALL
        SELECT
          c.id,
          c.nome,
          r.tipo_relacao,
          cadeia.profundidade + 1
        FROM competencia_relacoes r
        JOIN competencias c ON c.id = r.competencia_origem_id
        JOIN cadeia ON cadeia.id = r.competencia_destino_id
        WHERE r.tipo_relacao = 'pre_requisito'
          AND cadeia.profundidade < 10
      )
      SELECT * FROM cadeia ORDER BY profundidade, nome;
    `);
    return result.rows;
  }
}
