import { Test } from '@nestjs/testing';
import { BibliotecaVivaController } from './biblioteca-viva.controller';
import { BibliotecaVivaService } from './biblioteca-viva.service';

describe('BibliotecaVivaController (integração)', () => {
  let controller: BibliotecaVivaController;
  let service: BibliotecaVivaService;

  const resultadoMock = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      texto: 'Teste de busca vetorial',
      conteudoId: '660e8400-e29b-41d4-a716-446655440000',
      fonteId: null,
      similaridade: 0.95,
    },
  ];

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [BibliotecaVivaController],
      providers: [
        {
          provide: BibliotecaVivaService,
          useValue: {
            buscar: jest.fn().mockResolvedValue(resultadoMock),
          },
        },
      ],
    }).compile();

    controller = module.get(BibliotecaVivaController);
    service = module.get(BibliotecaVivaService);
  });

  it('deve buscar chunks similares', async () => {
    const dto = { consulta: 'inteligência artificial', limite: 3 };
    const resultado = await controller.buscar(dto);

    expect(service.buscar).toHaveBeenCalledWith(dto);
    expect(resultado).toEqual(resultadoMock);
  });
});
