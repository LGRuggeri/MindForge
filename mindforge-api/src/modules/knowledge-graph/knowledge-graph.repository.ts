import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import {
  competencias,
  competenciaRelacoes,
  competenciaProgresso,
  moduloCompetencias,
  modulosTrilha,
  objetivosEstudo,
  trilhasEstudo,
  Competencia,
  NovaCompetencia,
  NovoModuloCompetencia,
  CompetenciaProgresso,
} from '../../database/schema';

export interface CompetenciaComProgresso extends Competencia {
  progresso?: CompetenciaProgresso[] | null;
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

  async criarCompetencia(dados: NovaCompetencia, tx?: DrizzleDb) {
    const client = tx ?? this.db;
    const [competencia] = await client.insert(competencias).values(dados).returning();
    return competencia;
  }

  async buscarCompetenciaPorId(id: string, perfilId?: string) {
    return this.db.query.competencias.findFirst({
      where: eq(competencias.id, id),
      with: {
        relacoesOrigem: { with: { destino: true } },
        relacoesDestino: { with: { origem: true } },
        // Progresso é dado pessoal: só é exposto quando o perfil é informado.
        ...(perfilId ? { progresso: { where: eq(competenciaProgresso.perfilId, perfilId) } } : {}),
      },
    });
  }

  async buscarCompetenciaPorNome(nome: string, tx?: DrizzleDb) {
    const client = tx ?? this.db;
    return client.query.competencias.findFirst({
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

  async criarRelacaoSeNaoExistir(
    dados: {
      competenciaOrigemId: string;
      competenciaDestinoId: string;
      tipoRelacao: string;
    },
    tx?: DrizzleDb,
  ) {
    const client = tx ?? this.db;
    const [relacao] = await client
      .insert(competenciaRelacoes)
      .values(dados)
      .onConflictDoNothing()
      .returning();
    return relacao;
  }

  async vincularModuloCompetencias(dados: NovoModuloCompetencia[], tx?: DrizzleDb) {
    if (dados.length === 0) return [];
    const client = tx ?? this.db;
    return client.insert(moduloCompetencias).values(dados).onConflictDoNothing().returning();
  }

  async listarCompetenciasDoModulo(moduloId: string) {
    return this.db.query.moduloCompetencias.findMany({
      where: eq(moduloCompetencias.moduloId, moduloId),
      with: { competencia: true, modulo: true },
    });
  }

  async listarCompetenciasDoPerfil(perfilId: string) {
    const competenciasIds = this.db
      .select({ id: moduloCompetencias.competenciaId })
      .from(moduloCompetencias)
      .innerJoin(modulosTrilha, eq(modulosTrilha.id, moduloCompetencias.moduloId))
      .innerJoin(trilhasEstudo, eq(trilhasEstudo.id, modulosTrilha.trilhaId))
      .innerJoin(objetivosEstudo, eq(objetivosEstudo.id, trilhasEstudo.objetivoId))
      .where(eq(objetivosEstudo.perfilId, perfilId))
      .union(
        this.db
          .select({ id: competenciaProgresso.competenciaId })
          .from(competenciaProgresso)
          .where(eq(competenciaProgresso.perfilId, perfilId)),
      );

    return this.db.query.competencias.findMany({
      where: inArray(competencias.id, competenciasIds),
      orderBy: [competencias.nome],
      with: {
        progresso: {
          where: eq(competenciaProgresso.perfilId, perfilId),
          orderBy: [desc(competenciaProgresso.atualizadoEm)],
          limit: 1,
        },
        modulos: {
          // A condição competencia_id = competencias.id já é imposta pela relação;
          // repetí-la aqui fazia o Drizzle ligar competencias.id ao alias da
          // subquery lateral e gerar "column competencias_modulos.id does not exist".
          where: inArray(
            moduloCompetencias.moduloId,
            this.db
              .select({ id: modulosTrilha.id })
              .from(modulosTrilha)
              .innerJoin(trilhasEstudo, eq(trilhasEstudo.id, modulosTrilha.trilhaId))
              .innerJoin(objetivosEstudo, eq(objetivosEstudo.id, trilhasEstudo.objetivoId))
              .where(eq(objetivosEstudo.perfilId, perfilId)),
          ),
          with: { modulo: true },
        },
      },
    });
  }

  async atualizarProgresso(
    competenciaId: string,
    perfilId: string,
    nivel: string,
    evidencia?: string,
  ) {
    const agora = new Date();
    // A decisão entre inserir e atualizar é atômica, inclusive no primeiro
    // progresso concorrente do mesmo perfil e competência.
    const [registro] = await this.db
      .insert(competenciaProgresso)
      .values({
        competenciaId,
        perfilId,
        nivelAtual: nivel,
        evidencia,
        atualizadoEm: agora,
      })
      .onConflictDoUpdate({
        target: [competenciaProgresso.competenciaId, competenciaProgresso.perfilId],
        set: { nivelAtual: nivel, evidencia, atualizadoEm: agora },
      })
      .returning();
    return registro;
  }

  async buscarProgressoDoPerfil(perfilId: string, competenciaId: string) {
    return this.db.query.competenciaProgresso.findFirst({
      where: and(
        eq(competenciaProgresso.perfilId, perfilId),
        eq(competenciaProgresso.competenciaId, competenciaId),
      ),
    });
  }

  async recomendarCompetencias(perfilId: string): Promise<
    Array<{
      id: string;
      nome: string;
      descricao: string | null;
      categoria: string | null;
      nivelAtual: string | null;
      atualizadoEm: string | null;
      prerequisitosPendentes: number;
    }>
  > {
    const rows = await this.db.execute<{
      id: string;
      nome: string;
      descricao: string | null;
      categoria: string | null;
      nivelAtual: string | null;
      atualizadoEm: string | null;
      prerequisitosPendentes: number;
    }>(sql`
      WITH competencias_perfil AS (
        ${this.sqlCompetenciasDoPerfil(perfilId)}
      ),
      progresso AS (
        SELECT
          cp.competencia_id AS id,
          cp.nivel_atual AS nivel,
          cp.atualizado_em
        FROM competencia_progresso cp
        WHERE cp.perfil_id = ${perfilId}
      ),
      recomendadas AS (
        SELECT
          c.id,
          c.nome,
          c.descricao,
          c.categoria,
          p.nivel,
          p.atualizado_em
        FROM competencias c
        JOIN competencias_perfil cp ON cp.id = c.id
        LEFT JOIN progresso p ON p.id = c.id
        WHERE COALESCE(p.nivel, 'nao_iniciado') <> 'dominado'
      ),
      prerequisitos AS (
        SELECT
          r.competencia_destino_id AS destino_id,
          COUNT(*) FILTER (
            WHERE COALESCE(p.nivel, 'nao_iniciado') <> 'dominado'
          ) AS pendentes
        FROM competencia_relacoes r
        JOIN competencias_perfil cp ON cp.id = r.competencia_destino_id
        LEFT JOIN progresso p ON p.id = r.competencia_origem_id
        WHERE r.tipo_relacao = 'pre_requisito'
        GROUP BY r.competencia_destino_id
      )
      SELECT
        r.id,
        r.nome,
        r.descricao,
        r.categoria,
        r.nivel AS "nivelAtual",
        r.atualizado_em AS "atualizadoEm",
        COALESCE(pr.pendentes, 0)::int AS "prerequisitosPendentes"
      FROM recomendadas r
      LEFT JOIN prerequisitos pr ON pr.destino_id = r.id
      WHERE COALESCE(pr.pendentes, 0) = 0
      ORDER BY
        CASE COALESCE(r.nivel, 'nao_iniciado')
          WHEN 'nao_iniciado' THEN 0
          WHEN 'aprendendo' THEN 1
          WHEN 'praticando' THEN 2
          ELSE 3
        END,
        r.nome;
    `);

    return Array.isArray(rows) ? rows : rows.rows;
  }

  async buscarGrafoVisualDoPerfil(perfilId: string): Promise<{
    nodes: Array<{
      id: string;
      nome: string;
      descricao: string | null;
      categoria: string | null;
      nivelAtual: string;
    }>;
    edges: Array<{ id: string; source: string; target: string; tipo: string }>;
  }> {
    const nodesResult = await this.db.execute<{
      id: string;
      nome: string;
      descricao: string | null;
      categoria: string | null;
      nivelAtual: string;
    }>(sql`
      WITH competencias_perfil AS (
        ${this.sqlCompetenciasDoPerfil(perfilId)}
      ),
      progresso_recente AS (
        SELECT DISTINCT ON (cp.competencia_id)
          cp.competencia_id AS id,
          cp.nivel_atual
        FROM competencia_progresso cp
        WHERE cp.perfil_id = ${perfilId}
        ORDER BY cp.competencia_id, cp.atualizado_em DESC
      )
      SELECT
        c.id,
        c.nome,
        c.descricao,
        c.categoria,
        COALESCE(pr.nivel_atual, 'nao_iniciado') AS "nivelAtual"
      FROM competencias c
      JOIN competencias_perfil cpf ON cpf.id = c.id
      LEFT JOIN progresso_recente pr ON pr.id = c.id
      ORDER BY c.nome;
    `);

    const edgesResult = await this.db.execute<{
      id: string;
      source: string;
      target: string;
      tipo: string;
    }>(sql`
      WITH competencias_perfil AS (
        ${this.sqlCompetenciasDoPerfil(perfilId)}
      )
      SELECT
        r.id,
        r.competencia_origem_id AS "source",
        r.competencia_destino_id AS "target",
        r.tipo_relacao AS "tipo"
      FROM competencia_relacoes r
      JOIN competencias_perfil o ON o.id = r.competencia_origem_id
      JOIN competencias_perfil d ON d.id = r.competencia_destino_id;
    `);

    const nodes = Array.isArray(nodesResult) ? nodesResult : nodesResult.rows;
    const edges = Array.isArray(edgesResult) ? edgesResult : edgesResult.rows;
    return { nodes, edges };
  }

  private sqlCompetenciasDoPerfil(perfilId: string) {
    return sql`
      SELECT mc.competencia_id AS id
      FROM modulo_competencias mc
      JOIN modulos_trilha mt ON mt.id = mc.modulo_id
      JOIN trilhas_estudo te ON te.id = mt.trilha_id
      JOIN objetivos_estudo oe ON oe.id = te.objetivo_id
      WHERE oe.perfil_id = ${perfilId}
      UNION
      SELECT cp.competencia_id AS id
      FROM competencia_progresso cp
      WHERE cp.perfil_id = ${perfilId}
    `;
  }

  async buscarCaminhoDePreRequisitos(
    competenciaId: string,
    perfilId?: string,
  ): Promise<CaminhoNo[]> {
    return this.buscarCaminhoRecursivo(competenciaId, 'pre_requisito', perfilId, true);
  }

  async buscarDependentes(competenciaId: string, perfilId?: string): Promise<CaminhoNo[]> {
    return this.buscarCaminhoRecursivo(competenciaId, 'pre_requisito', perfilId, false);
  }

  private async buscarCaminhoRecursivo(
    competenciaId: string,
    tipoRelacao: string,
    perfilId: string | undefined,
    preRequisitos: boolean,
  ): Promise<CaminhoNo[]> {
    // Para pré-requisitos a âncora filtra pelo destino e seleciona a origem
    // (seguindo a aresta A -> B de volta em direção a A); para dependentes,
    // o sentido é o oposto.
    const sentidoOrigem = preRequisitos ? 'competencia_origem_id' : 'competencia_destino_id';
    const sentidoDestino = preRequisitos ? 'competencia_destino_id' : 'competencia_origem_id';
    const orderBy = preRequisitos ? 'profundidade DESC, nome' : 'profundidade, nome';

    if (!perfilId) {
      const result = await this.db.execute<CaminhoNo>(sql`
        WITH RECURSIVE cadeia AS (
          SELECT
            c.id,
            c.nome,
            r.tipo_relacao,
            1 AS profundidade
          FROM competencias c
          JOIN competencia_relacoes r ON r.${sql.identifier(sentidoOrigem)} = c.id
          WHERE r.${sql.identifier(sentidoDestino)} = ${competenciaId}
            AND r.tipo_relacao = ${tipoRelacao}
          UNION ALL
          SELECT
            c.id,
            c.nome,
            r.tipo_relacao,
            cadeia.profundidade + 1
          FROM competencia_relacoes r
          JOIN competencias c ON c.id = r.${sql.identifier(sentidoOrigem)}
          JOIN cadeia ON cadeia.id = r.${sql.identifier(sentidoDestino)}
          WHERE r.tipo_relacao = ${tipoRelacao}
            AND cadeia.profundidade < 10
        )
        SELECT * FROM cadeia ORDER BY ${sql.raw(orderBy)};
      `);
      return result.rows;
    }

    const result = await this.db.execute<CaminhoNo>(sql`
      WITH RECURSIVE competencias_perfil AS (
        SELECT mc.competencia_id AS id
        FROM modulo_competencias mc
        JOIN modulos_trilha mt ON mt.id = mc.modulo_id
        JOIN trilhas_estudo te ON te.id = mt.trilha_id
        JOIN objetivos_estudo oe ON oe.id = te.objetivo_id
        WHERE oe.perfil_id = ${perfilId}
        UNION
        SELECT cp.competencia_id AS id
        FROM competencia_progresso cp
        WHERE cp.perfil_id = ${perfilId}
      ),
      cadeia AS (
        SELECT
          c.id,
          c.nome,
          r.tipo_relacao,
          1 AS profundidade
        FROM competencias c
        JOIN competencia_relacoes r ON r.${sql.identifier(sentidoOrigem)} = c.id
        JOIN competencias_perfil cp ON cp.id = c.id
        WHERE r.${sql.identifier(sentidoDestino)} = ${competenciaId}
          AND r.tipo_relacao = ${tipoRelacao}
          AND ${competenciaId} IN (SELECT id FROM competencias_perfil)
        UNION ALL
        SELECT
          c.id,
          c.nome,
          r.tipo_relacao,
          cadeia.profundidade + 1
        FROM competencia_relacoes r
        JOIN competencias c ON c.id = r.${sql.identifier(sentidoOrigem)}
        JOIN competencias_perfil cp ON cp.id = c.id
        JOIN cadeia ON cadeia.id = r.${sql.identifier(sentidoDestino)}
        WHERE r.tipo_relacao = ${tipoRelacao}
          AND cadeia.profundidade < 10
      )
      SELECT * FROM cadeia ORDER BY ${sql.raw(orderBy)};
    `);
    return result.rows;
  }
}
