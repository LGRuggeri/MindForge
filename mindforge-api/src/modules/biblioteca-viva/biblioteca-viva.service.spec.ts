import { BibliotecaVivaService } from './biblioteca-viva.service';
import { chunkTexto } from './chunking';

describe('BibliotecaVivaService', () => {
  let repo: { buscarSimilares: jest.Mock; indexarChunks: jest.Mock };
  let embeddings: { gerar: jest.Mock };
  let queue: { send: jest.Mock };
  let service: BibliotecaVivaService;
  beforeEach(() => {
    repo = {
      buscarSimilares: jest.fn().mockResolvedValue([{ id: 'chunk', similaridade: 1 }]),
      indexarChunks: jest.fn().mockImplementation(async (dados) => dados),
    };
    embeddings = { gerar: jest.fn().mockResolvedValue([1, 0]) };
    queue = { send: jest.fn().mockResolvedValue('job') };
    service = new BibliotecaVivaService(repo as never, embeddings as never, queue as never);
  });
  it.each([undefined, 2])('aplica módulo/limite à busca (%s)', async (limite) => {
    expect(await service.buscar({ consulta: 'Conceito', moduloId: 'm', limite })).toEqual([
      { id: 'chunk', similaridade: 1 },
    ]);
    expect(repo.buscarSimilares).toHaveBeenCalledWith([1, 0], limite ?? 5, 'm');
  });
  it('propaga falha de embedding sem consultar banco', async () => {
    embeddings.gerar.mockRejectedValue(new Error('offline'));
    await expect(service.buscar({ consulta: 'Conceito' })).rejects.toThrow('offline');
    expect(repo.buscarSimilares).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    'valida origem exclusiva antes de executar ou enfileirar (%s)',
    async (async) => {
      for (const origem of [{}, { conteudoId: 'c', fonteId: 'f' }]) {
        await expect(service.indexarTexto({ texto: 'Texto', ...origem, async })).rejects.toThrow(
          'exatamente um',
        );
      }
      expect(queue.send).not.toHaveBeenCalled();
      expect(embeddings.gerar).not.toHaveBeenCalled();
    },
  );
  it.each(['conteudoId', 'fonteId'] as const)(
    'preserva texto, ordem e vetor da origem %s',
    async (origem) => {
      const texto = 'material '.repeat(900);
      embeddings.gerar.mockImplementation(async (pedaco: string) => [pedaco.length, 1]);
      await service.indexarTexto({ texto, [origem]: 'origem' });
      const registros = repo.indexarChunks.mock.calls[0][0];
      expect(registros).toEqual(
        chunkTexto(texto).map((pedaco, ordem) => ({
          texto: pedaco,
          ordem,
          embedding: [pedaco.length, 1],
          conteudoId: origem === 'conteudoId' ? 'origem' : null,
          fonteId: origem === 'fonteId' ? 'origem' : null,
        })),
      );
    },
  );
  it('não grava parcialmente quando um embedding posterior falha', async () => {
    embeddings.gerar.mockResolvedValueOnce([1]).mockRejectedValue(new Error('offline'));
    await expect(
      service.indexarTexto({ texto: 'material '.repeat(900), fonteId: 'f' }),
    ).rejects.toThrow('offline');
    expect(repo.indexarChunks).not.toHaveBeenCalled();
  });
  it('não chama provedor para texto vazio', async () => {
    expect(await service.indexarTexto({ texto: '   ', conteudoId: 'c' })).toEqual([]);
    expect(embeddings.gerar).not.toHaveBeenCalled();
    expect(repo.indexarChunks).not.toHaveBeenCalled();
  });
  it('enfileira sem gerar vetores e rejeita ausência de job', async () => {
    expect(await service.indexarTexto({ texto: 'Texto', fonteId: 'f', async: true })).toEqual({
      jobId: 'job',
      status: 'enfileirado',
    });
    expect(embeddings.gerar).not.toHaveBeenCalled();
    queue.send.mockResolvedValue(null);
    await expect(
      service.indexarTexto({ texto: 'Texto', fonteId: 'f', async: true }),
    ).rejects.toThrow('enfileirar');
  });
});
