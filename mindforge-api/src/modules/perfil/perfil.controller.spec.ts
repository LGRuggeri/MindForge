import { Test } from '@nestjs/testing';
import { PerfilController } from './perfil.controller';
import { PerfilService } from './perfil.service';

describe('PerfilController (integração)', () => {
  let controller: PerfilController;
  let service: PerfilService;

  const perfilMock = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'Ruggeri',
    nivelAtual: 'intermediario',
    preferencias: {},
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PerfilController],
      providers: [
        {
          provide: PerfilService,
          useValue: {
            criar: jest.fn().mockResolvedValue(perfilMock),
            listar: jest.fn().mockResolvedValue([perfilMock]),
            buscarPorId: jest.fn().mockResolvedValue(perfilMock),
          },
        },
      ],
    }).compile();

    controller = module.get(PerfilController);
    service = module.get(PerfilService);
  });

  it('deve criar um perfil', async () => {
    const dto = { nome: 'Ruggeri', nivelAtual: 'intermediario' as const };
    const resultado = await controller.criar(dto);

    expect(service.criar).toHaveBeenCalledWith(dto);
    expect(resultado).toEqual(perfilMock);
  });

  it('deve listar perfis', async () => {
    const resultado = await controller.listar();

    expect(service.listar).toHaveBeenCalled();
    expect(resultado).toEqual([perfilMock]);
  });

  it('deve buscar perfil por id', async () => {
    const id = perfilMock.id;
    const resultado = await controller.buscarPorId(id);

    expect(service.buscarPorId).toHaveBeenCalledWith(id);
    expect(resultado).toEqual(perfilMock);
  });
});
