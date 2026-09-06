import { Test } from '@nestjs/testing';
import { PlannerController } from './planner.controller';
import { PlannerService } from './planner.service';

describe('PlannerController (integração)', () => {
  let controller: PlannerController;
  let service: PlannerService;

  const objetivoMock = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    perfilId: '660e8400-e29b-41d4-a716-446655440000',
    titulo: 'Aprender TypeScript',
    descricao: 'Do zero ao avançado',
    status: 'pendente',
    nivelDesejado: 'iniciante',
    prazoEstimado: null,
    criadoEm: new Date(),
  };

  const trilhaMock = {
    id: '770e8400-e29b-41d4-a716-446655440000',
    objetivoId: objetivoMock.id,
    versao: 1,
    status: 'ativa',
    geradoPorAgente: 'planner',
    metadata: { tituloTrilha: 'Trilha TypeScript' },
    criadoEm: new Date(),
    modulos: [],
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PlannerController],
      providers: [
        {
          provide: PlannerService,
          useValue: {
            criarObjetivo: jest.fn().mockResolvedValue(objetivoMock),
            buscarObjetivoPorId: jest.fn().mockResolvedValue(objetivoMock),
            listarObjetivosDoPerfil: jest.fn().mockResolvedValue([objetivoMock]),
            removerObjetivo: jest.fn().mockResolvedValue(objetivoMock),
            gerarTrilha: jest.fn().mockResolvedValue(trilhaMock),
          },
        },
      ],
    }).compile();

    controller = module.get(PlannerController);
    service = module.get(PlannerService);
  });

  it('deve criar objetivo', async () => {
    const dto = {
      perfilId: objetivoMock.perfilId,
      titulo: 'Aprender TypeScript',
      descricao: 'Do zero ao avançado',
      nivelDesejado: 'iniciante' as const,
    };

    const resultado = await controller.criarObjetivo(dto);

    expect(service.criarObjetivo).toHaveBeenCalledWith(dto);
    expect(resultado).toEqual(objetivoMock);
  });

  it('deve gerar trilha a partir do objetivo', async () => {
    const dto = { objetivoId: objetivoMock.id };
    const resultado = await controller.gerarTrilha(dto);

    expect(service.gerarTrilha).toHaveBeenCalledWith(dto.objetivoId);
    expect(resultado).toEqual(trilhaMock);
  });

  it('deve remover o objetivo pelo id', async () => {
    await controller.removerObjetivo(objetivoMock.id);

    expect(service.removerObjetivo).toHaveBeenCalledWith(objetivoMock.id);
  });
});
