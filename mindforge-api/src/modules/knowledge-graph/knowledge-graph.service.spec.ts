import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { KnowledgeGraphRepository } from './knowledge-graph.repository';

const mockRepo = {
  criarCompetencia: jest.fn(),
  buscarCompetenciaPorNome: jest.fn().mockResolvedValue(null),
  buscarCompetenciaPorId: jest.fn(),
  criarRelacao: jest.fn(),
  criarRelacaoSeNaoExistir: jest.fn(),
  listarCompetencias: jest.fn().mockResolvedValue([]),
  listarCompetenciasDoPerfil: jest.fn().mockResolvedValue([]),
  buscarCaminhoDePreRequisitos: jest.fn().mockResolvedValue([]),
  buscarDependentes: jest.fn().mockResolvedValue([]),
  atualizarProgresso: jest.fn(),
  listarCompetenciasDoModulo: jest.fn().mockResolvedValue([]),
  vincularModuloCompetencias: jest.fn().mockResolvedValue([]),
  recomendarCompetencias: jest.fn().mockResolvedValue([]),
};

describe('KnowledgeGraphService', () => {
  let service: KnowledgeGraphService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo.buscarCompetenciaPorNome.mockResolvedValue(null);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeGraphService,
        { provide: KnowledgeGraphRepository, useValue: mockRepo },
        {
          provide: DRIZZLE,
          useValue: {
            transaction: jest.fn(async <T>(callback: (tx: Record<string, never>) => Promise<T>) =>
              callback({}),
            ),
          },
        },
      ],
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
    mockRepo.criarRelacaoSeNaoExistir.mockResolvedValue({ id: 'r1' });

    const result = await service.criarCadeiaDePreRequisitos(
      'm2',
      [{ nome: 'Lifetimes' }],
      [{ id: 'c1', nome: 'Ownership' }],
    );

    expect(result.relacoes).toBe(1);
  });

  it('deve recomendar competências com pré-requisitos satisfeitos', async () => {
    mockRepo.recomendarCompetencias.mockResolvedValue([
      { id: 'c1', nome: 'Rust básico', progresso: 'nao_iniciado' },
    ]);

    const result = await service.recomendarCompetencias('perfil1');

    expect(result).toHaveLength(1);
    expect(result[0].nome).toBe('Rust básico');
    expect(mockRepo.recomendarCompetencias).toHaveBeenCalledWith('perfil1');
  });

  it('deve ignorar relações de pré-requisitos que já existem', async () => {
    mockRepo.criarCompetencia.mockResolvedValue({ id: 'c2', nome: 'Lifetimes' });
    mockRepo.criarRelacaoSeNaoExistir.mockResolvedValue(undefined);

    const result = await service.criarCadeiaDePreRequisitos(
      'm2',
      [{ nome: 'Lifetimes' }],
      [{ id: 'c1', nome: 'Ownership' }],
    );

    expect(result.relacoes).toBe(0);
  });
});
