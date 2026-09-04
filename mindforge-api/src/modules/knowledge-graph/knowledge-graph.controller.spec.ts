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
  listarGrafoVisualDoPerfil: jest.fn().mockResolvedValue({ nodes: [], edges: [] }),
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

  it('deve listar grafo visual do perfil', async () => {
    const grafo = {
      nodes: [{ id: 'c1', nome: 'Rust', descricao: null, categoria: 'planner', nivelAtual: 'dominado' }],
      edges: [],
    };
    mockService.listarGrafoVisualDoPerfil.mockResolvedValue(grafo);
    const result = await controller.listarGrafoVisualDoPerfil('p1');
    expect(mockService.listarGrafoVisualDoPerfil).toHaveBeenCalledWith('p1');
    expect(result).toEqual(grafo);
  });
});
