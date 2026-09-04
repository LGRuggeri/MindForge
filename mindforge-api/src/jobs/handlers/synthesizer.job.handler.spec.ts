import { Job } from 'pg-boss';
import { JobsService } from '../jobs.service';
import {
  GERAR_CONTEUDO_JOB,
  GerarConteudoJob,
  SynthesizerJobHandler,
} from './synthesizer.job.handler';

describe('SynthesizerJobHandler', () => {
  let handler: SynthesizerJobHandler;
  let queue: jest.Mocked<JobsService>;
  let synthesizer: { gerar: jest.Mock };

  const criarJob = (dados: GerarConteudoJob): Job<Record<string, unknown>> =>
    ({
      id: 'job-1',
      name: GERAR_CONTEUDO_JOB,
      data: dados as unknown as Record<string, unknown>,
    }) as Job<Record<string, unknown>>;

  beforeEach(() => {
    queue = {
      work: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<JobsService>;

    synthesizer = {
      gerar: jest.fn().mockResolvedValue({ id: 'conteudo-1' }),
    };

    handler = new SynthesizerJobHandler(queue, synthesizer);
  });

  it('deve registrar o worker ao iniciar o módulo', async () => {
    await handler.onModuleInit();
    expect(queue.work).toHaveBeenCalledWith(GERAR_CONTEUDO_JOB, expect.any(Function));
  });

  it('deve processar o job chamando gerar do serviço', async () => {
    await handler.onModuleInit();
    const [[, registeredHandler]] = queue.work.mock.calls;

    const dados: GerarConteudoJob = {
      moduloId: '123e4567-e89b-12d3-a456-426614174000',
      topico: 'Variáveis',
      nivelAlvo: 'iniciante',
    };
    const job = criarJob(dados);

    await registeredHandler([job]);

    expect(synthesizer.gerar).toHaveBeenCalledWith(dados);
    expect(synthesizer.gerar).toHaveBeenCalledTimes(1);
  });

  it('deve propagar erro ao processar job', async () => {
    await handler.onModuleInit();
    const [[, registeredHandler]] = queue.work.mock.calls;

    synthesizer.gerar.mockRejectedValue(new Error('falha na síntese'));

    const job = criarJob({
      moduloId: '123e4567-e89b-12d3-a456-426614174000',
      topico: 'Falha',
    });

    await expect(registeredHandler([job])).rejects.toThrow('falha na síntese');
  });
});
