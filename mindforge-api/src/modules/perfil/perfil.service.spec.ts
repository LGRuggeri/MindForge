import { NotFoundException } from '@nestjs/common';
import { PerfilService } from './perfil.service';
import { PerfilRepository } from './perfil.repository';

describe('PerfilService', () => {
  let service: PerfilService;
  let repo: jest.Mocked<PerfilRepository>;

  const perfilMock = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'Ruggeri',
    nivelAtual: 'iniciante' as const,
    objetivosGerais: 'Aprender TypeScript',
    preferencias: {},
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  };

  beforeEach(() => {
    repo = {
      criar: jest.fn(),
      buscarPorId: jest.fn(),
      listar: jest.fn(),
      atualizar: jest.fn(),
    } as unknown as jest.Mocked<PerfilRepository>;
    service = new PerfilService(repo);
  });

  describe('atualizar', () => {
    it('deve atualizar e retornar o perfil', async () => {
      repo.buscarPorId.mockResolvedValue(perfilMock as never);
      repo.atualizar.mockResolvedValue({ ...perfilMock, nome: 'Luiz Gustavo' } as never);

      const dto = { nome: 'Luiz Gustavo' };
      const resultado = await service.atualizar(perfilMock.id, dto);

      expect(repo.buscarPorId).toHaveBeenCalledWith(perfilMock.id);
      expect(repo.atualizar).toHaveBeenCalledWith(perfilMock.id, dto);
      expect(resultado.nome).toBe('Luiz Gustavo');
    });

    it('deve lançar NotFoundException quando o perfil não existe', async () => {
      repo.buscarPorId.mockResolvedValue(undefined as never);

      await expect(service.atualizar('inexistente', { nome: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.atualizar).not.toHaveBeenCalled();
    });
  });
});
