import { Job } from 'pg-boss';
import { JobsService } from '../jobs.service';
import {
  CORRIGIR_TENTATIVA_JOB,
  CorrigirTentativaJob,
  ExerciciosJobHandler,
  GerarExercicioJob,
  GERAR_EXERCICIO_JOB,
} from './exercicios.job.handler';

describe('ExerciciosJobHandler', () => {
  let handler: ExerciciosJobHandler;
  let queue: jest.Mocked<JobsService>;
  let exercicios: { gerarExercicio: jest.Mock; submeterTentativa: jest.Mock };

  const criarJob = <T>(nome: string, dados: T): Job<Record<string, unknown>> =>
    ({
      id: 'job-1',
      name: nome,
      data: dados as unknown as Record<string, unknown>,
    }) as Job<Record<string, unknown>>;

  beforeEach(() => {
    queue = {
      work: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<JobsService>;

    exercicios = {
      gerarExercicio: jest.fn().mockResolvedValue({ id: 'ex-1' }),
      submeterTentativa: jest.fn().mockResolvedValue({ id: 'tent-1' }),
    };

    handler = new ExerciciosJobHandler(queue, exercicios);
  });

  it('deve registrar os dois workers ao iniciar', async () => {
    await handler.onModuleInit();
    expect(queue.work).toHaveBeenCalledWith(GERAR_EXERCICIO_JOB, expect.any(Function));
    expect(queue.work).toHaveBeenCalledWith(CORRIGIR_TENTATIVA_JOB, expect.any(Function));
  });

  it('deve processar job de geração de exercício', async () => {
    await handler.onModuleInit();
    const calls = queue.work.mock.calls;
    const gerarCall = calls.find(([nome]) => nome === GERAR_EXERCICIO_JOB);
    expect(gerarCall).toBeDefined();

    const [, gerarHandler] = gerarCall!;

    const dados: GerarExercicioJob = {
      moduloId: '123e4567-e89b-12d3-a456-426614174000',
      tipo: 'questao_objetiva',
      dificuldade: 'medio',
      async: true,
    };

    await (gerarHandler as (jobs: Job<Record<string, unknown>>[]) => Promise<void>)([
      criarJob(GERAR_EXERCICIO_JOB, dados),
    ]);

    expect(exercicios.gerarExercicio).toHaveBeenCalledWith({ ...dados, async: false });
  });

  it('deve processar job de correção de tentativa', async () => {
    await handler.onModuleInit();
    const calls = queue.work.mock.calls;
    const corrigirCall = calls.find(([nome]) => nome === CORRIGIR_TENTATIVA_JOB);
    expect(corrigirCall).toBeDefined();

    const [, corrigirHandler] = corrigirCall!;

    const dados: CorrigirTentativaJob = {
      exercicioId: '123e4567-e89b-12d3-a456-426614174000',
      respostaUsuario: 'resposta',
      perfilId: '123e4567-e89b-12d3-a456-426614174001',
      async: true,
    };

    await (corrigirHandler as (jobs: Job<Record<string, unknown>>[]) => Promise<void>)([
      criarJob(CORRIGIR_TENTATIVA_JOB, dados),
    ]);

    expect(exercicios.submeterTentativa).toHaveBeenCalledWith({ ...dados, async: false });
  });

  it('deve propagar erro na correção', async () => {
    await handler.onModuleInit();
    const calls = queue.work.mock.calls;
    const corrigirCall = calls.find(([nome]) => nome === CORRIGIR_TENTATIVA_JOB);
    const [, corrigirHandler] = corrigirCall!;

    exercicios.submeterTentativa.mockRejectedValue(new Error('erro na correção'));

    await expect(
      (corrigirHandler as (jobs: Job<Record<string, unknown>>[]) => Promise<void>)([
        criarJob(CORRIGIR_TENTATIVA_JOB, {
          exercicioId: '123e4567-e89b-12d3-a456-426614174000',
          respostaUsuario: 'x',
        }),
      ]),
    ).rejects.toThrow('erro na correção');
  });
});
