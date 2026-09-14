import { Test, TestingModule } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/node-postgres';
import { PgDialect } from 'drizzle-orm/pg-core';
import { KnowledgeGraphRepository } from './knowledge-graph.repository';
import { DRIZZLE } from '../../database/database.module';
import { competencias } from '../../database/schema';

const createMockDb = () => ({
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([]),
  onConflictDoNothing: jest.fn().mockReturnThis(),
  onConflictDoUpdate: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  union: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  query: {
    competencias: { findFirst: jest.fn(), findMany: jest.fn() },
    moduloCompetencias: { findMany: jest.fn() },
    competenciaProgresso: { findFirst: jest.fn() },
  },
  execute: jest.fn().mockResolvedValue({ rows: [] }),
});

function mockInsertReturning(db: ReturnType<typeof createMockDb>, rows: unknown[]) {
  db.returning.mockResolvedValueOnce(rows);
}

function mockUpdateReturning(db: ReturnType<typeof createMockDb>, rows: unknown[]) {
  db.returning.mockResolvedValueOnce(rows);
}

interface CampoSql {
  table?: unknown;
  name?: string;
  queryChunks?: unknown[];
}

async function criarRepoComDbReal(db: unknown): Promise<KnowledgeGraphRepository> {
  const moduleReal: TestingModule = await Test.createTestingModule({
    providers: [{ provide: DRIZZLE, useValue: db }, KnowledgeGraphRepository],
  }).compile();
  return moduleReal.get(KnowledgeGraphRepository);
}

function extrairCampos(sql: unknown, acc: CampoSql[] = []): CampoSql[] {
  if (!sql || typeof sql !== 'object') return acc;
  const obj = sql as CampoSql;
  if (obj.table && typeof obj.name === 'string') acc.push(obj);
  if (Array.isArray(obj.queryChunks)) {
    for (const chunk of obj.queryChunks) extrairCampos(chunk, acc);
  }
  return acc;
}

describe('KnowledgeGraphRepository', () => {
  let repo: KnowledgeGraphRepository;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(async () => {
    mockDb = createMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: DRIZZLE, useValue: mockDb }, KnowledgeGraphRepository],
    }).compile();
    repo = module.get(KnowledgeGraphRepository);
  });

  it('deve criar competência', async () => {
    const competencia = { id: 'c1', nome: 'Rust básico' };
    mockDb.returning.mockResolvedValueOnce([competencia]);

    const result = await repo.criarCompetencia({ nome: 'Rust básico' });

    expect(result).toEqual(competencia);
  });

  it('deve criar relação entre competências', async () => {
    const relacao = {
      id: 'r1',
      competenciaOrigemId: 'c1',
      competenciaDestinoId: 'c2',
      tipoRelacao: 'pre_requisito',
    };
    mockDb.returning.mockResolvedValueOnce([relacao]);

    const result = await repo.criarRelacao(relacao);

    expect(result).toEqual(relacao);
  });

  it('deve vincular módulo a competências de forma idempotente', async () => {
    const vinculos = [{ moduloId: 'm1', competenciaId: 'c1' }];
    mockDb.returning.mockResolvedValueOnce(vinculos);

    const result = await repo.vincularModuloCompetencias(vinculos);

    expect(result).toHaveLength(1);
    expect(mockDb.onConflictDoNothing).toHaveBeenCalled();
  });

  it('deve atualizar progresso existente', async () => {
    const existente = {
      id: 'p1',
      competenciaId: 'c1',
      perfilId: 'perfil1',
      nivelAtual: 'nao_iniciado',
    };
    mockUpdateReturning(mockDb, [{ ...existente, nivelAtual: 'dominado' }]);

    const result = await repo.atualizarProgresso('c1', 'perfil1', 'dominado');

    expect(result.nivelAtual).toBe('dominado');
  });

  it('deve criar progresso inexistente', async () => {
    mockInsertReturning(mockDb, [
      { id: 'p1', competenciaId: 'c1', perfilId: 'perfil1', nivelAtual: 'aprendendo' },
    ]);

    const result = await repo.atualizarProgresso('c1', 'perfil1', 'aprendendo');

    expect(result.nivelAtual).toBe('aprendendo');
  });

  it('deve recomendar competências cujos pré-requisitos estão dominados', async () => {
    const rows = [
      { id: 'c2', nome: 'Borrow checker', progresso: 'nao_iniciado', prerequisitosPendentes: 0 },
    ];
    mockDb.execute.mockResolvedValueOnce({ rows });

    const result = await repo.recomendarCompetencias('perfil1');

    expect(result).toEqual(rows);
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
    const sqlWrapper = mockDb.execute.mock.calls[0][0];
    expect(sqlWrapper).toBeDefined();
    expect(typeof sqlWrapper.getSQL).toBe('function');
  });

  it('deve definir a coluna id na CTE de competências do perfil (regressão: alias perdido na UNION)', async () => {
    // Instância real do Drizzle sem conexão: gera o SQL verdadeiro que seria
    // enviado ao Postgres, e o execute é espionado para não tocar no banco.
    const db = drizzle({} as never);
    jest.spyOn(db, 'execute').mockResolvedValue({ rows: [] } as never);
    const repoReal = await criarRepoComDbReal(db);

    await repoReal.recomendarCompetencias('perfil1');

    expect(db.execute).toHaveBeenCalledTimes(1);
    const [query] = (db.execute as jest.Mock).mock.calls[0] as unknown as [never];
    const dialect = new PgDialect();
    const { sql: sqlTexto } = dialect.sqlToQuery(query);
    // A CTE precisa expor a coluna como "id": o restante da query faz JOIN via cp.id.
    // Quando a CTE era montada com o builder do Drizzle, o alias se perdia na UNION
    // e o Postgres rejeitava com "column cp.id does not exist".
    expect(sqlTexto).toContain('competencia_id AS id');
    expect(sqlTexto).toContain('JOIN competencias_perfil cp ON cp.id = c.id');
    expect(sqlTexto).toContain('JOIN competencias_perfil cp ON cp.id = r.competencia_destino_id');
  });

  it('deve expor nivelAtual e prerequisitosPendentes com alias e tipos corretos nas recomendações', async () => {
    const db = drizzle({} as never);
    jest.spyOn(db, 'execute').mockResolvedValue({ rows: [] } as never);
    const repoReal = await criarRepoComDbReal(db);

    await repoReal.recomendarCompetencias('perfil1');

    const [query] = (db.execute as jest.Mock).mock.calls[0] as unknown as [never];
    const { sql: sqlTexto } = new PgDialect().sqlToQuery(query);
    // Alias entre aspas: sem elas o Postgres devolve o nome em minúsculas
    // ("prerequisitospendentes") e o front não encontra o campo.
    expect(sqlTexto).toContain('AS "nivelAtual"');
    expect(sqlTexto).toContain('AS "atualizadoEm"');
    expect(sqlTexto).toContain('AS "prerequisitosPendentes"');
    // COUNT gera bigint (string no node-pg); o cast garante número no JSON.
    expect(sqlTexto).toContain('::int');
  });

  it('deve montar nodes e edges do grafo visual apenas com competências do perfil', async () => {
    const db = drizzle({} as never);
    jest.spyOn(db, 'execute').mockResolvedValue({ rows: [] } as never);
    const repoReal = await criarRepoComDbReal(db);

    const grafo = await repoReal.buscarGrafoVisualDoPerfil('perfil1');

    expect(grafo).toEqual({ nodes: [], edges: [] });
    expect(db.execute).toHaveBeenCalledTimes(2);
    const calls = (db.execute as jest.Mock).mock.calls as unknown as [[never], [never]];
    const sqlNodes = new PgDialect().sqlToQuery(calls[0][0]).sql;
    const sqlEdges = new PgDialect().sqlToQuery(calls[1][0]).sql;
    expect(sqlNodes).toContain('AS "nivelAtual"');
    expect(sqlNodes).toContain("COALESCE(pr.nivel_atual, 'nao_iniciado')");
    expect(sqlEdges).toContain('AS "source"');
    expect(sqlEdges).toContain('AS "target"');
    expect(sqlEdges).toContain('AS "tipo"');
    // Só arestas cujos dois extremos pertencem ao perfil entram no grafo.
    expect(sqlEdges).toContain('JOIN competencias_perfil o ON o.id = r.competencia_origem_id');
    expect(sqlEdges).toContain('JOIN competencias_perfil d ON d.id = r.competencia_destino_id');
  });

  it('não deve referenciar a tabela pai no filtro explícito de módulos (regressão: Drizzle ligava competencias.id ao alias da subquery)', async () => {
    await repo.listarCompetenciasDoPerfil('perfil1');

    expect(mockDb.query.competencias.findMany).toHaveBeenCalledTimes(1);
    const [opcoes] = mockDb.query.competencias.findMany.mock.calls[0] as unknown as [
      { with: { modulos: { where: unknown } } },
    ];
    const campos = extrairCampos(opcoes.with.modulos.where);
    // A relação já impõe modulo_competencias.competencia_id = competencias.id;
    // referenciar a tabela pai aqui gerava "column competencias_modulos.id does not exist".
    expect(campos.some((c) => c.table === competencias)).toBe(false);
  });

  it('deve buscar caminho de pré-requisitos partindo das arestas que chegam na competência', async () => {
    const rows = [{ id: 'c1', nome: 'Ownership', tipoRelacao: 'pre_requisito', profundidade: 1 }];
    mockDb.execute.mockResolvedValueOnce({ rows });

    const result = await repo.buscarCaminhoDePreRequisitos('c2');

    expect(result).toEqual(rows);
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
    const [query] = mockDb.execute.mock.calls[0] as unknown as [{ queryChunks: unknown[] }];
    const sqlTexto = query.queryChunks
      .map((c) => {
        if (typeof c === 'string') return c;
        const value = (c as { value?: unknown }).value;
        if (Array.isArray(value)) return value.join('');
        if (typeof value === 'string') return value;
        return '';
      })
      .join('');
    // A âncora deve filtrar pelo destino e selecionar a origem (pré-requisito),
    // seguindo a aresta A -> B de volta em direção a A.
    expect(sqlTexto).toContain('r.competencia_destino_id');
    expect(sqlTexto).toMatch(/JOIN competencias c ON c\.id = r\.competencia_origem_id/);
  });

  it('deve buscar caminho de pré-requisitos', async () => {
    const rows = [{ id: 'c1', nome: 'Ownership', tipoRelacao: 'pre_requisito', profundidade: 1 }];
    mockDb.execute.mockResolvedValueOnce({ rows });

    const result = await repo.buscarCaminhoDePreRequisitos('c2');

    expect(result).toEqual(rows);
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it('deve buscar dependentes', async () => {
    const rows = [
      { id: 'c2', nome: 'Borrow checker', tipoRelacao: 'pre_requisito', profundidade: 1 },
    ];
    mockDb.execute.mockResolvedValueOnce({ rows });

    const result = await repo.buscarDependentes('c1');

    expect(result).toEqual(rows);
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });
});
