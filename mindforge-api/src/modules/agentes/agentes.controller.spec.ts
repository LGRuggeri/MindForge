import { Test } from '@nestjs/testing';
import { AgentesController } from './agentes.controller';
import { AgentesService } from './agentes.service';

describe('AgentesController (integração)', () => {
  let controller: AgentesController;
  let service: AgentesService;

  const execucaoMock = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    agente: 'planner',
    entrada: { objetivo: 'aprender TypeScript' },
    saida: { resultado: {} },
    modeloUsado: 'grok-4.5',
    tokensUtilizados: 120,
    duracaoMs: 900,
    status: 'sucesso',
    erroMensagem: null,
    criadoEm: new Date(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AgentesController],
      providers: [
        {
          provide: AgentesService,
          useValue: {
            listar: jest.fn().mockResolvedValue([execucaoMock]),
            buscarPorId: jest.fn().mockResolvedValue(execucaoMock),
          },
        },
      ],
    }).compile();

    controller = module.get(AgentesController);
    service = module.get(AgentesService);
  });

  it('deve listar execuções com filtros', async () => {
    const query = { agente: 'planner' as const, status: 'sucesso' as const, limite: 50, offset: 0 };

    const resultado = await controller.listarExecucoes(query);

    expect(service.listar).toHaveBeenCalledWith(query);
    expect(resultado).toEqual([execucaoMock]);
  });

  it('deve buscar execução por id', async () => {
    const resultado = await controller.buscarExecucaoPorId(execucaoMock.id);

    expect(service.buscarPorId).toHaveBeenCalledWith(execucaoMock.id);
    expect(resultado).toEqual(execucaoMock);
  });
});
