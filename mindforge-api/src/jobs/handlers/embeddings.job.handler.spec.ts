import { Job } from 'pg-boss';
import { JobsService } from '../jobs.service';
import {
  EmbeddingsJobHandler,
  IndexarEmbeddingJob,
  INDEXAR_EMBEDDING_JOB,
} from './embeddings.job.handler';

describe('EmbeddingsJobHandler', () => {
  let handler: EmbeddingsJobHandler;
  let queue: jest.Mocked<JobsService>;
  let biblioteca: { indexarTexto: jest.Mock };

  const criarJob = (dados: IndexarEmbeddingJob): Job<Record<string, unknown>> =>
    ({
      id: 'job-1',
      name: INDEXAR_EMBEDDING_JOB,
      data: dados as unknown as Record<string, unknown>,
    }) as Job<Record<string, unknown>>;

  beforeEach(() => {
    queue = {
      work: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<JobsService>;

    biblioteca = {
      indexarTexto: jest.fn().mockResolvedValue([{ id: 'chunk-1' }]),
    };

    handler = new EmbeddingsJobHandler(queue, biblioteca);
  });

  it('deve registrar o worker ao iniciar', async () => {
    await handler.onModuleInit();
    expect(queue.work).toHaveBeenCalledWith(INDEXAR_EMBEDDING_JOB, expect.any(Function));
  });

  it('deve indexar texto a partir do job', async () => {
    await handler.onModuleInit();
    const [[, registeredHandler]] = queue.work.mock.calls;

    const dados: IndexarEmbeddingJob = {
      texto: 'Texto para indexar',
      conteudoId: '123e4567-e89b-12d3-a456-426614174000',
    };

    await registeredHandler([criarJob(dados)]);

    expect(biblioteca.indexarTexto).toHaveBeenCalledWith(dados);
  });

  it('deve propagar erro de indexação', async () => {
    await handler.onModuleInit();
    const [[, registeredHandler]] = queue.work.mock.calls;

    biblioteca.indexarTexto.mockRejectedValue(new Error('falha no embedding'));

    await expect(
      registeredHandler([
        criarJob({
          texto: 'x',
          fonteId: '123e4567-e89b-12d3-a456-426614174000',
        }),
      ]),
    ).rejects.toThrow('falha no embedding');
  });
});
