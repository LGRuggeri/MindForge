import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { KnowledgeGraphRepository } from './knowledge-graph.repository';

const mockRepo = {
  criarCompetencia: jest.fn(),
  buscarCompetenciaPorNome: jest.fn().mockResolvedValue(null),
  buscarCompetenciaPorId: jest.fn(),
  criarRelacao: jest.fn(),
  listarCompetencias: jest.fn().mockResolvedValue([]),
  listarCompetenciasDoPerfil: jest.fn().mockResolvedValue([]),
  buscarCaminhoDePreRequisitos: jest.fn().mockResolvedValue([]),
  buscarDependentes: jest.fn().mockResolvedValue([]),
  atualizarProgresso: jest.fn(),
  listarCompetenciasDoModulo: jest.fn().mockResolvedValue([]),
  vincularModuloCompetencias: jest.fn().mockResolvedValue([]),
};

describe('KnowledgeGraphService', () => {
  let service: KnowledgeGraphService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo.buscarCompetenciaPorNome.mockResolvedValue(null);
    const module: TestingModule = await Test.createTestingModule({
      providers: [KnowledgeGraphService, { provide: KnowledgeGraphRepository, useValue: mockRepo }],
    }).compile();
    service = module.get(KnowledgeGraphService);
  });

  it('deve criar competência nova', async () => {
    mockRepo.criarCompetencia.mockResolvedValue({ id: 'c1', nome: 'Rust' });

    const result = await service.criarCompetencia({ nome: 'Rust' });

    expect(result.nome).toBe('Rust');
  });

  it('deve reutilizar competência existente pelo nome', async () => {
    mockRepo.buscarCompetenciaPorNome.mockResolvedValue({ id: 'c1', nome: 'Rust' });

    const result = await service.criarCompetencia({ nome: 'Rust' });

    expect(mockRepo.criarCompetencia).not.toHaveBeenCalled();
    expect(result.id).toBe('c1');
  });

  it('deve lançar NotFoundException ao buscar competência inexistente', async () => {
    mockRepo.buscarCompetenciaPorId.mockResolvedValue(null);

    await expect(service.buscarCompetenciaPorId('c99')).rejects.toThrow(NotFoundException);
  });

  it('deve atualizar progresso por módulo', async () => {
    mockRepo.listarCompetenciasDoModulo.mockResolvedValue([
      { competencia: { id: 'c1' }, moduloId: 'm1' },
    ]);
    mockRepo.atualizarProgresso.mockResolvedValue({ id: 'p1' });

    const result = await service.marcarProgressoPorModulo('m1', 'perfil1');

    expect(result.atualizados).toBe(1);
    expect(mockRepo.atualizarProgresso).toHaveBeenCalledWith(
      'c1',
      'perfil1',
      'aprendendo',
      expect.stringContaining('m1'),
    );
  });

  it('deve vincular competências extraídas ao módulo', async () => {
    mockRepo.criarCompetencia.mockResolvedValue({ id: 'c1', nome: 'Ownership' });
    mockRepo.vincularModuloCompetencias.mockResolvedValue([
      { moduloId: 'm1', competenciaId: 'c1' },
    ]);

    const result = await service.vincularCompetenciasAoModulo('m1', [
      { nome: 'Ownership', descricao: 'Gerenciamento de memória em Rust' },
    ]);

    expect(result.vinculados).toBe(1);
    expect(result.competenciaIds).toContain('c1');
  });

  it('deve criar cadeia de pré-requisitos entre módulos', async () => {
    mockRepo.criarCompetencia.mockResolvedValue({ id: 'c2', nome: 'Lifetimes' });
    mockRepo.criarRelacao.mockResolvedValue({ id: 'r1' });

    const result = await service.criarCadeiaDePreRequisitos(
      'm2',
      [{ nome: 'Lifetimes' }],
      [{ id: 'c1', nome: 'Ownership' }],
    );

    expect(result.relacoes).toBe(1);
  });
});
