import { Job } from 'pg-boss';
import { JobsService } from '../../jobs/jobs.service';
import { PesquisarDto } from './dto/pesquisar.dto';
import { RESEARCH_JOB, ResearchJobHandler } from './research.job.handler';

describe('ResearchJobHandler', () => {
  let handler: ResearchJobHandler;
  let queue: jest.Mocked<JobsService>;
  let research: { pesquisar: jest.Mock };

  const criarJob = (dados: PesquisarDto): Job<Record<string, unknown>> =>
    ({
      id: 'job-1',
      name: RESEARCH_JOB,
      data: dados as unknown as Record<string, unknown>,
    }) as Job<Record<string, unknown>>;

  beforeEach(() => {
    queue = {
      work: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<JobsService>;

    research = {
      pesquisar: jest.fn().mockResolvedValue({ moduloId: 'mod-1', fontes: [] }),
    };

    handler = new ResearchJobHandler(queue, research);
  });

  it('deve registrar o worker ao iniciar o módulo', async () => {
    await handler.onModuleInit();
    expect(queue.work).toHaveBeenCalledWith(RESEARCH_JOB, expect.any(Function));
  });

  it('retorna somente identificadores e origens das fontes para o pg-boss', async () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    const fontes = [
      { id, origem: 'busca_web' },
      { id, origem: 'sugestao_ia' },
    ];
    research.pesquisar.mockResolvedValue({
      moduloId: id,
      fontes,
      resultadosWeb: 1,
      topico: 'SEGREDO',
    });
    await handler.onModuleInit();
    const [[, executar]] = queue.work.mock.calls;
    expect(await executar([criarJob({ moduloId: id, async: true })])).toEqual({
      moduloId: id,
      fontes,
      resultadosWeb: 1,
    });
  });

  it('deve processar o job chamando pesquisar do serviço', async () => {
    await handler.onModuleInit();
    const [[, registeredHandler]] = queue.work.mock.calls;

    const dados: PesquisarDto = {
      moduloId: '123e4567-e89b-12d3-a456-426614174000',
      topico: 'Variáveis',
      webSearch: true,
    };

    await registeredHandler([criarJob(dados)]);

    expect(research.pesquisar).toHaveBeenCalledWith({ ...dados, async: false });
    expect(research.pesquisar).toHaveBeenCalledTimes(1);
  });

  it('deve propagar erro ao processar job', async () => {
    await handler.onModuleInit();
    const [[, registeredHandler]] = queue.work.mock.calls;

    research.pesquisar.mockRejectedValue(new Error('falha na pesquisa'));

    await expect(
      registeredHandler([criarJob({ moduloId: '123e4567-e89b-12d3-a456-426614174000' })]),
    ).rejects.toThrow('falha na pesquisa');
  });
});
