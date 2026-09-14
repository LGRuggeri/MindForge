import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RevisaoEspacadaService } from './revisao-espacada.service';

describe('Realizar revisão agendada', () => {
  const registro = {
    id: 'rev-1',
    perfilId: 'perfil-1',
    itemTipo: 'exercicio',
    itemId: 'ex-1',
    proximaRevisao: '2026-09-13',
    ultimaRevisao: '2026-09-12',
    intervaloDias: 1,
    repeticoes: 1,
    fatorFacilidade: '2.5',
  };
  const item = { titulo: 'Exercício', texto: 'Quanto é 2 + 2?', resposta: '4', moduloId: 'mod-1' };
  const dto = { perfilId: 'perfil-1', qualidade: 4, proximaRevisaoEsperada: '2026-09-13' };
  let repo: { buscarPorId: jest.Mock; buscarItem: jest.Mock; atualizarSeAtual: jest.Mock };
  let service: RevisaoEspacadaService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 13, 12));
    repo = {
      buscarPorId: jest.fn().mockResolvedValue({ ...registro }),
      buscarItem: jest.fn().mockResolvedValue(item),
      atualizarSeAtual: jest
        .fn()
        .mockImplementation((_anterior, dados) => Promise.resolve({ ...registro, ...dados })),
    };
    service = new RevisaoEspacadaService(repo as never);
  });
  afterEach(() => jest.useRealTimers());

  it('avança a segunda lembrança correta para seis dias depois', async () => {
    const resultado = await service.concluir('rev-1', dto);
    expect(resultado).toMatchObject({
      proximaRevisao: '2026-09-19',
      ultimaRevisao: '2026-09-13',
      repeticoes: 2,
      intervaloDias: 6,
    });
  });

  it('reinicia o intervalo quando o aluno não lembra', async () => {
    repo.buscarPorId.mockResolvedValue({ ...registro, repeticoes: 4, intervaloDias: 30 });
    const resultado = await service.concluir('rev-1', { ...dto, qualidade: 0 });
    expect(resultado).toMatchObject({
      proximaRevisao: '2026-09-14',
      repeticoes: 0,
      intervaloDias: 1,
      fatorFacilidade: '1.7',
    });
  });

  it('recusa agenda de outro perfil sem expor o item', async () => {
    repo.buscarPorId.mockResolvedValue(undefined);
    await expect(service.concluir('rev-1', dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.buscarPorId).toHaveBeenCalledWith('rev-1', 'perfil-1');
    expect(repo.buscarItem).not.toHaveBeenCalled();
  });

  it('recusa item removido ou fora do perfil', async () => {
    repo.buscarItem.mockResolvedValue(undefined);
    await expect(service.concluir('rev-1', dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.atualizarSeAtual).not.toHaveBeenCalled();
  });

  it('recusa revisão futura', async () => {
    repo.buscarPorId.mockResolvedValue({ ...registro, proximaRevisao: '2026-09-14' });
    await expect(
      service.concluir('rev-1', { ...dto, proximaRevisaoEsperada: '2026-09-14' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recusa reenvio de uma agenda já atualizada', async () => {
    repo.buscarPorId.mockResolvedValue({ ...registro, proximaRevisao: '2026-09-19' });
    await expect(service.concluir('rev-1', dto)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.atualizarSeAtual).not.toHaveBeenCalled();
  });

  it('recusa atualização concorrente sem sobrescrever a agenda', async () => {
    repo.atualizarSeAtual.mockResolvedValue(undefined);
    await expect(service.concluir('rev-1', dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([-1, 6, 2.5, NaN])('rejeita qualidade inválida %s', async (qualidade) => {
    await expect(service.concluir('rev-1', { ...dto, qualidade })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repo.atualizarSeAtual).not.toHaveBeenCalled();
  });

  it('retorna material para a sessão de revisão', async () => {
    await expect(service.buscarDetalhe('rev-1', 'perfil-1')).resolves.toMatchObject({
      ...registro,
      item,
    });
  });
});
