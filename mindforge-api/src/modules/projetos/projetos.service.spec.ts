import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjetosService } from './projetos.service';
import { ProjetosRepository } from './projetos.repository';
import { AgentesService } from '../agentes/agentes.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { BibliotecaVivaService } from '../biblioteca-viva/biblioteca-viva.service';

const projetoId = '123e4567-e89b-12d3-a456-426614174000';
const perfilId = '223e4567-e89b-12d3-a456-426614174000';
const moduloId = '323e4567-e89b-12d3-a456-426614174000';

const mockRepo = {
  criar: jest.fn(),
  buscarPorId: jest.fn(),
  buscarModulo: jest.fn(),
  buscarObjetivo: jest.fn(),
  listarPorModulo: jest.fn(),
  listarPorObjetivo: jest.fn(),
  atualizarStatus: jest.fn(),
  adicionarEntregaSequencial: jest.fn(),
  contarEntregas: jest.fn(),
};

const mockAgentes = {
  executar: jest.fn(),
};

const mockKnowledgeGraph = {
  marcarProgressoPorModulo: jest.fn(),
};

const mockBiblioteca = {
  buscar: jest.fn(),
};

describe('ProjetosService', () => {
  let service: ProjetosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjetosService,
        { provide: ProjetosRepository, useValue: mockRepo },
        { provide: AgentesService, useValue: mockAgentes },
        { provide: KnowledgeGraphService, useValue: mockKnowledgeGraph },
        { provide: BibliotecaVivaService, useValue: mockBiblioteca },
      ],
    }).compile();

    service = module.get(ProjetosService);
  });

  it('deve criar projeto', async () => {
    mockRepo.criar.mockResolvedValue({ id: projetoId });
    mockRepo.buscarPorId.mockResolvedValue({ id: projetoId, titulo: 'Projeto 1' });
    mockRepo.buscarModulo.mockResolvedValue({
      id: moduloId,
      titulo: 'Módulo',
      objetivoAprendizagem: null,
      trilha: { objetivo: { perfilId } },
    });

    const resultado = await service.criar({
      perfilId,
      moduloId,
      titulo: 'Projeto 1',
      descricao: 'Descrição do projeto',
    });

    expect(resultado!.id).toBe(projetoId);
    expect(mockRepo.criar).toHaveBeenCalled();
  });

  it('deve rejeitar criação sem módulo nem objetivo', async () => {
    await expect(
      service.criar({ perfilId, titulo: 'Projeto 1', descricao: 'Descrição do projeto' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockRepo.criar).not.toHaveBeenCalled();
  });

  it('deve rejeitar criação quando o módulo pertence a outro perfil', async () => {
    const outroPerfilId = '923e4567-e89b-12d3-a456-426614174000';
    mockRepo.buscarModulo.mockResolvedValue({
      id: moduloId,
      titulo: 'Módulo',
      objetivoAprendizagem: null,
      trilha: { objetivo: { perfilId: outroPerfilId } },
    });

    await expect(
      service.criar({ perfilId, moduloId, titulo: 'Projeto 1', descricao: 'Descrição do projeto' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockRepo.criar).not.toHaveBeenCalled();
  });

  it('deve rejeitar criação quando o objetivo pertence a outro perfil', async () => {
    const objetivoId = '423e4567-e89b-12d3-a456-426614174000';
    const outroPerfilId = '923e4567-e89b-12d3-a456-426614174000';
    mockRepo.buscarObjetivo.mockResolvedValue({
      id: objetivoId,
      titulo: 'Objetivo',
      descricao: null,
      perfilId: outroPerfilId,
    });

    await expect(
      service.criar({
        perfilId,
        objetivoId,
        titulo: 'Projeto 1',
        descricao: 'Descrição do projeto',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockRepo.criar).not.toHaveBeenCalled();
  });

  it('deve validar objetivo mesmo quando o módulo já foi validado', async () => {
    const objetivoId = '423e4567-e89b-12d3-a456-426614174000';
    const outroPerfilId = '923e4567-e89b-12d3-a456-426614174000';
    mockRepo.buscarModulo.mockResolvedValue({
      id: moduloId,
      titulo: 'Módulo',
      objetivoAprendizagem: null,
      trilha: { objetivo: { perfilId } },
    });
    mockRepo.buscarObjetivo.mockResolvedValue({
      id: objetivoId,
      titulo: 'Objetivo',
      descricao: null,
      perfilId: outroPerfilId,
    });

    await expect(
      service.criar({
        perfilId,
        moduloId,
        objetivoId,
        titulo: 'Projeto 1',
        descricao: 'Descrição do projeto',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockRepo.criar).not.toHaveBeenCalled();
  });

  it('deve rejeitar criação quando o objetivo informado não existe', async () => {
    const objetivoId = '423e4567-e89b-12d3-a456-426614174000';
    mockRepo.buscarObjetivo.mockResolvedValue(undefined);

    await expect(
      service.criar({
        perfilId,
        objetivoId,
        titulo: 'Projeto 1',
        descricao: 'Descrição do projeto',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockRepo.criar).not.toHaveBeenCalled();
  });

  it('deve rejeitar criação quando o módulo informado não existe', async () => {
    mockRepo.buscarModulo.mockResolvedValue(undefined);

    await expect(
      service.criar({
        perfilId,
        moduloId,
        titulo: 'Projeto 1',
        descricao: 'Descrição do projeto',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockRepo.criar).not.toHaveBeenCalled();
  });

  it('deve retornar a entrega mesmo se a sincronização com o knowledge graph falhar', async () => {
    mockRepo.buscarPorId.mockResolvedValue({
      id: projetoId,
      perfilId,
      moduloId,
      titulo: 'Projeto 1',
      descricao: 'Descrição',
      criterios: [],
      status: 'em_andamento',
    });
    mockRepo.contarEntregas.mockResolvedValue(0);
    mockAgentes.executar.mockResolvedValue({ pontuacao: 8, feedback: 'Bom!' });
    mockRepo.adicionarEntregaSequencial.mockResolvedValue({ id: 'entrega-1' });
    mockKnowledgeGraph.marcarProgressoPorModulo.mockRejectedValue(new Error('graph indisponível'));

    const resultado = await service.submeterEntrega(projetoId, { conteudo: 'Minha entrega' });

    expect(resultado.id).toBe('entrega-1');
    expect(mockRepo.adicionarEntregaSequencial).toHaveBeenCalled();
  });

  it('deve submeter entrega e creditar progresso ao dono do projeto quando nota >= 7', async () => {
    mockRepo.buscarPorId.mockResolvedValue({
      id: projetoId,
      perfilId,
      moduloId,
      titulo: 'Projeto 1',
      descricao: 'Descrição',
      criterios: ['Critério 1'],
      status: 'pendente',
    });
    mockRepo.contarEntregas.mockResolvedValue(0);
    mockAgentes.executar.mockResolvedValue({ pontuacao: 8, feedback: 'Bom!' });
    mockRepo.adicionarEntregaSequencial.mockResolvedValue({ id: 'entrega-1' });
    mockRepo.atualizarStatus.mockResolvedValue({ id: projetoId, status: 'em_andamento' });
    mockKnowledgeGraph.marcarProgressoPorModulo.mockResolvedValue({ atualizados: 1, moduloId });

    const resultado = await service.submeterEntrega(projetoId, { conteudo: 'Minha entrega' }, perfilId);

    expect(resultado.id).toBe('entrega-1');
    expect(mockRepo.adicionarEntregaSequencial).toHaveBeenCalledWith(
      projetoId,
      expect.objectContaining({ conteudo: 'Minha entrega', pontuacao: '8' }),
    );
    expect(mockKnowledgeGraph.marcarProgressoPorModulo).toHaveBeenCalledWith(
      moduloId,
      perfilId,
      'praticando',
    );
  });

  it('deve creditar progresso ao dono mesmo sem perfilId na requisição', async () => {
    mockRepo.buscarPorId.mockResolvedValue({
      id: projetoId,
      perfilId,
      moduloId,
      titulo: 'Projeto 1',
      descricao: 'Descrição',
      criterios: [],
      status: 'em_andamento',
    });
    mockRepo.contarEntregas.mockResolvedValue(1);
    mockAgentes.executar.mockResolvedValue({ pontuacao: 9, feedback: 'Excelente!' });
    mockRepo.adicionarEntregaSequencial.mockResolvedValue({ id: 'entrega-2' });

    await service.submeterEntrega(projetoId, { conteudo: 'Entrega sem perfilId' });

    expect(mockKnowledgeGraph.marcarProgressoPorModulo).toHaveBeenCalledWith(
      moduloId,
      perfilId,
      'dominado',
    );
  });

  it('deve rejeitar entrega quando o perfil informado não é o dono do projeto', async () => {
    const outroPerfilId = '923e4567-e89b-12d3-a456-426614174000';
    mockRepo.buscarPorId.mockResolvedValue({
      id: projetoId,
      perfilId,
      moduloId,
      titulo: 'Projeto 1',
      descricao: 'Descrição',
      criterios: [],
      status: 'em_andamento',
    });

    await expect(
      service.submeterEntrega(projetoId, { conteudo: 'Entrega alheia' }, outroPerfilId),
    ).rejects.toThrow('não é o dono do projeto');
    expect(mockAgentes.executar).not.toHaveBeenCalled();
    expect(mockRepo.adicionarEntregaSequencial).not.toHaveBeenCalled();
    expect(mockKnowledgeGraph.marcarProgressoPorModulo).not.toHaveBeenCalled();
  });

  it('deve gerar projeto usando o contexto do módulo (título + objetivo)', async () => {
    mockRepo.buscarModulo.mockResolvedValue({
      id: moduloId,
      titulo: 'Introdução a Algoritmos',
      objetivoAprendizagem: 'Escrever pseudocódigo',
      trilha: { objetivo: { perfilId } },
    });
    mockBiblioteca.buscar.mockResolvedValue([
      { id: 'chunk-1', texto: 'Material sobre algoritmos', similaridade: 0.9 },
    ]);
    mockAgentes.executar.mockResolvedValue({
      titulo: 'Projeto gerado',
      descricao: 'Descrição do projeto gerado',
      criterios: ['Critério'],
      dicas: ['Dica'],
    });
    mockRepo.criar.mockResolvedValue({ id: projetoId });
    mockRepo.buscarPorId.mockResolvedValue({ id: projetoId, titulo: 'Projeto gerado' });

    await service.gerar({ perfilId, moduloId });

    expect(mockBiblioteca.buscar).toHaveBeenCalledWith(
      expect.objectContaining({ moduloId, consulta: expect.stringContaining('Algoritmos') }),
    );
    const chamada = mockAgentes.executar.mock.calls[0][0] as { user: string };
    expect(chamada.user).toContain('Módulo: Introdução a Algoritmos');
    expect(chamada.user).toContain('Escrever pseudocódigo');
    expect(chamada.user).not.toContain(moduloId);
  });

  it('deve gerar projeto usando o contexto do objetivo quando não há módulo', async () => {
    const objetivoId = '423e4567-e89b-12d3-a456-426614174000';
    mockRepo.buscarObjetivo.mockResolvedValue({
      id: objetivoId,
      titulo: 'Aprender Rust',
      descricao: 'Do zero à produção',
      perfilId,
    });
    mockBiblioteca.buscar.mockResolvedValue([]);
    mockAgentes.executar.mockResolvedValue({
      titulo: 'Projeto gerado',
      descricao: 'Descrição do projeto gerado',
      criterios: [],
      dicas: [],
    });
    mockRepo.criar.mockResolvedValue({ id: projetoId });
    mockRepo.buscarPorId.mockResolvedValue({ id: projetoId, titulo: 'Projeto gerado' });

    await service.gerar({ perfilId, objetivoId });

    expect(mockBiblioteca.buscar).toHaveBeenCalledWith(
      expect.objectContaining({ consulta: expect.stringContaining('Rust') }),
    );
    const chamada = mockAgentes.executar.mock.calls[0][0] as { user: string };
    expect(chamada.user).toContain('Objetivo de aprendizado: Aprender Rust');
    expect(chamada.user).toContain('Do zero à produção');
  });

  it('deve rejeitar correção do evaluator com pontuação fora de 0-10', async () => {
    mockRepo.buscarPorId.mockResolvedValue({
      id: projetoId,
      perfilId,
      moduloId,
      titulo: 'Projeto 1',
      descricao: 'Descrição',
      criterios: [],
      status: 'em_andamento',
    });
    mockRepo.contarEntregas.mockResolvedValue(0);
    // Simula o fluxo real: o AgentesService aplica o parser à resposta bruta do LLM.
    mockAgentes.executar.mockImplementation(({ parser }: { parser: (raw: string) => unknown }) =>
      Promise.resolve(parser('{"pontuacao": 100, "feedback": "ok"}')),
    );

    await expect(
      service.submeterEntrega(projetoId, { conteudo: 'Minha entrega' }, perfilId),
    ).rejects.toThrow('formato inválido');
    expect(mockRepo.adicionarEntregaSequencial).not.toHaveBeenCalled();
    expect(mockKnowledgeGraph.marcarProgressoPorModulo).not.toHaveBeenCalled();
  });

  it('deve rejeitar geração quando o evaluator retorna campo faltante', async () => {
    mockRepo.buscarModulo.mockResolvedValue({
      id: moduloId,
      titulo: 'Introdução a Algoritmos',
      objetivoAprendizagem: 'Escrever pseudocódigo',
      trilha: { objetivo: { perfilId } },
    });
    mockBiblioteca.buscar.mockResolvedValue([]);
    mockAgentes.executar.mockImplementation(({ parser }: { parser: (raw: string) => unknown }) =>
      Promise.resolve(parser('{"titulo": "Só título"}')),
    );

    await expect(service.gerar({ perfilId, moduloId })).rejects.toThrow('formato inválido');
    expect(mockRepo.criar).not.toHaveBeenCalled();
  });

  it('deve concluir projeto', async () => {
    mockRepo.buscarPorId.mockResolvedValue({ id: projetoId });
    mockRepo.atualizarStatus.mockResolvedValue({ id: projetoId, status: 'concluido' });

    const resultado = await service.concluir(projetoId);

    expect(resultado.status).toBe('concluido');
  });
});
