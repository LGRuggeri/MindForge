import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlannerService } from './planner.service';

describe('Conclusão de módulo', () => {
  const modulo = {
    id: 'mod-1',
    status: 'em_andamento',
    trilha: { objetivo: { perfilId: 'perfil-1' } },
  };
  const tx = {};
  const repo = {
    executarEmTransacao: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
    buscarModuloPorId: jest.fn(),
    marcarModuloConcluido: jest.fn(),
    registrarEstudoCompetencias: jest.fn(),
  };
  const service = new PlannerService(repo as never, {} as never, {} as never);
  beforeEach(() => {
    jest.clearAllMocks();
    repo.buscarModuloPorId.mockResolvedValue(modulo);
    repo.marcarModuloConcluido.mockResolvedValue({ ...modulo, status: 'concluido' });
    repo.registrarEstudoCompetencias.mockResolvedValue(undefined);
  });

  it('persiste a conclusão e as competências na mesma transação', async () => {
    await expect(service.concluirModulo('mod-1', 'perfil-1')).resolves.toMatchObject({
      status: 'concluido',
    });
    expect(repo.buscarModuloPorId).toHaveBeenCalledWith('mod-1', tx);
    expect(repo.marcarModuloConcluido).toHaveBeenCalledWith('mod-1', tx);
    expect(repo.registrarEstudoCompetencias).toHaveBeenCalledWith('mod-1', 'perfil-1', tx);
  });
  it('recusa módulo inexistente sem gravar', async () => {
    repo.buscarModuloPorId.mockResolvedValue(undefined);
    await expect(service.concluirModulo('mod-1', 'perfil-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.marcarModuloConcluido).not.toHaveBeenCalled();
  });
  it('recusa outro perfil sem alterar módulo ou competências', async () => {
    await expect(service.concluirModulo('mod-1', 'perfil-2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.marcarModuloConcluido).not.toHaveBeenCalled();
    expect(repo.registrarEstudoCompetencias).not.toHaveBeenCalled();
  });
  it('propaga falha de competências para reverter a transação', async () => {
    repo.registrarEstudoCompetencias.mockRejectedValueOnce(new Error('falha ao persistir'));
    await expect(service.concluirModulo('mod-1', 'perfil-1')).rejects.toThrow('falha ao persistir');
  });
  it('aceita módulo já concluído sem regravar progresso', async () => {
    repo.buscarModuloPorId.mockResolvedValue({ ...modulo, status: 'concluido' });
    await expect(service.concluirModulo('mod-1', 'perfil-1')).resolves.toMatchObject({
      status: 'concluido',
    });
    expect(repo.registrarEstudoCompetencias).not.toHaveBeenCalled();
    expect(repo.marcarModuloConcluido).not.toHaveBeenCalled();
  });
});
