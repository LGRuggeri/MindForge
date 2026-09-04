import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeGraphRepository } from './knowledge-graph.repository';
import { DRIZZLE } from '../../database/database.module';

const createMockDb = () => ({
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([]),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  query: {
    competencias: { findFirst: jest.fn(), findMany: jest.fn() },
    moduloCompetencias: { findMany: jest.fn() },
    competenciaProgresso: { findFirst: jest.fn() },
  },
  execute: jest.fn().mockResolvedValue({ rows: [] }),
});

function mockSelectWhere(db: ReturnType<typeof createMockDb>, rows: unknown[]) {
  db.where.mockReturnValueOnce(Promise.resolve(rows));
}

function mockInsertReturning(db: ReturnType<typeof createMockDb>, rows: unknown[]) {
  db.returning.mockResolvedValueOnce(rows);
}

function mockUpdateReturning(db: ReturnType<typeof createMockDb>, rows: unknown[]) {
  db.returning.mockResolvedValueOnce(rows);
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

  it('deve vincular módulo a competências', async () => {
    const vinculos = [{ moduloId: 'm1', competenciaId: 'c1' }];
    mockDb.returning.mockResolvedValueOnce(vinculos);

    const result = await repo.vincularModuloCompetencias(vinculos);

    expect(result).toHaveLength(1);
  });

  it('deve atualizar progresso existente', async () => {
    const existente = {
      id: 'p1',
      competenciaId: 'c1',
      perfilId: 'perfil1',
      nivelAtual: 'nao_iniciado',
    };
    mockSelectWhere(mockDb, [existente]);
    mockUpdateReturning(mockDb, [{ ...existente, nivelAtual: 'dominado' }]);

    const result = await repo.atualizarProgresso('c1', 'perfil1', 'dominado');

    expect(result.nivelAtual).toBe('dominado');
  });

  it('deve criar progresso inexistente', async () => {
    mockSelectWhere(mockDb, []);
    mockInsertReturning(mockDb, [
      { id: 'p1', competenciaId: 'c1', perfilId: 'perfil1', nivelAtual: 'aprendendo' },
    ]);

    const result = await repo.atualizarProgresso('c1', 'perfil1', 'aprendendo');

    expect(result.nivelAtual).toBe('aprendendo');
  });

  it('deve buscar caminho de pré-requisitos', async () => {
    const rows = [{ id: 'c1', nome: 'Ownership', tipoRelacao: 'pre_requisito', profundidade: 1 }];
    mockDb.execute.mockResolvedValueOnce({ rows });

    const result = await repo.buscarCaminhoDePreRequisitos('c2');

    expect(result).toEqual(rows);
  });
});
