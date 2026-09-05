import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { KnowledgeGraphService } from './knowledge-graph.service';

const mockService = {
  criarCompetencia: jest.fn(),
  listarCompetencias: jest.fn().mockResolvedValue([]),
  buscarCompetenciaPorId: jest.fn(),
  buscarCaminhoDePreRequisitos: jest.fn().mockResolvedValue([]),
  buscarDependentes: jest.fn().mockResolvedValue([]),
  criarRelacao: jest.fn(),
  listarGrafoDoPerfil: jest.fn().mockResolvedValue([]),
  recomendarCompetencias: jest.fn().mockResolvedValue([]),
  buscarGrafoVisual: jest.fn().mockResolvedValue({ nodes: [], edges: [] }),
  atualizarProgresso: jest.fn(),
  marcarProgressoPorModulo: jest.fn(),
};

describe('KnowledgeGraphController', () => {
  let controller: KnowledgeGraphController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeGraphController],
      providers: [{ provide: KnowledgeGraphService, useValue: mockService }],
    }).compile();
    controller = module.get(KnowledgeGraphController);
  });

  it('deve criar competência', async () => {
    mockService.criarCompetencia.mockResolvedValue({ id: 'c1' });
    const result = await controller.criarCompetencia({ nome: 'Rust' });
    expect(result.id).toBe('c1');
  });

  it('deve buscar pré-requisitos', async () => {
    await controller.buscarPreRequisitos('c1');
    expect(mockService.buscarCaminhoDePreRequisitos).toHaveBeenCalledWith('c1');
  });

  it('deve marcar progresso por módulo', async () => {
    mockService.marcarProgressoPorModulo.mockResolvedValue({ atualizados: 1 });
    const result = await controller.marcarProgressoPorModulo({ moduloId: 'm1', perfilId: 'p1' });
    expect(result.atualizados).toBe(1);
  });

  it('deve listar próximos passos do perfil', async () => {
    mockService.recomendarCompetencias.mockResolvedValue([
      { id: 'c1', nome: 'Rust', progresso: null, prerequisitosPendentes: 0 },
    ]);

    const result = await controller.proximosPassos('p1');

    expect(mockService.recomendarCompetencias).toHaveBeenCalledWith('p1');
    expect(result).toHaveLength(1);
  });

  it('deve buscar grafo visual do perfil', async () => {
    mockService.buscarGrafoVisual.mockResolvedValue({
      nodes: [{ id: 'c1', nome: 'Rust', nivelAtual: 'nao_iniciado' }],
      edges: [],
    });

    const result = await controller.buscarGrafoVisual('p1');

    expect(mockService.buscarGrafoVisual).toHaveBeenCalledWith('p1');
    expect(result.nodes).toHaveLength(1);
  });
});
