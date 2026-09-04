import { Test, TestingModule } from '@nestjs/testing';
import { ProjetosController } from './projetos.controller';
import { ProjetosService } from './projetos.service';

const mockService = {
  criar: jest.fn(),
  gerar: jest.fn(),
  listar: jest.fn(),
  buscarPorId: jest.fn(),
  submeterEntrega: jest.fn(),
  concluir: jest.fn(),
};

describe('ProjetosController', () => {
  let controller: ProjetosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjetosController],
      providers: [{ provide: ProjetosService, useValue: mockService }],
    }).compile();

    controller = module.get(ProjetosController);
  });

  it('deve criar projeto', async () => {
    mockService.criar.mockResolvedValue({ id: 'p1' });
    const resultado = await controller.criar({
      perfilId: 'perfil-1',
      titulo: 'Projeto',
      descricao: 'Descrição',
    });
    expect(resultado!.id).toBe('p1');
  });

  it('deve listar projetos por módulo', async () => {
    mockService.listar.mockResolvedValue([]);
    await controller.listar('modulo-1', undefined);
    expect(mockService.listar).toHaveBeenCalledWith({ moduloId: 'modulo-1', objetivoId: undefined });
  });

  it('deve submeter entrega', async () => {
    mockService.submeterEntrega.mockResolvedValue({ id: 'e1' });
    const resultado = await controller.submeterEntrega('p1', { conteudo: 'Entrega' }, 'perfil-1');
    expect(resultado.id).toBe('e1');
  });
});
