import { Logger } from '@nestjs/common';
import { ResearchJobHandler } from '../../modules/research/research.job.handler';
import { SynthesizerJobHandler } from './synthesizer.job.handler';
import { ExerciciosJobHandler } from './exercicios.job.handler';
import { EmbeddingsJobHandler } from './embeddings.job.handler';

describe('Workers — erros privados e retry', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each(['research', 'synthesizer', 'exercicios', 'embeddings'])(
    'oculta erro nos logs de %s sem impedir retry',
    async (tipo) => {
      const queue = { work: jest.fn() };
      const erro = new Error('SEGREDO de transporte');
      const falhar = jest.fn().mockRejectedValue(erro);
      const worker =
        tipo === 'research'
          ? new ResearchJobHandler(queue as never, { pesquisar: falhar })
          : tipo === 'synthesizer'
            ? new SynthesizerJobHandler(queue as never, { gerar: falhar })
            : tipo === 'exercicios'
              ? new ExerciciosJobHandler(queue as never, {
                  gerarExercicio: falhar,
                  submeterTentativa: falhar,
                })
              : new EmbeddingsJobHandler(queue as never, { indexarTexto: falhar });
      const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      await worker.onModuleInit();
      for (const [, executar] of queue.work.mock.calls) {
        await expect(
          executar([{ id: 'job', data: { moduloId: 'm', exercicioId: 'e', fonteId: 'f' } }]),
        ).rejects.toBe(erro);
      }
      expect(log).toHaveBeenCalled();
      expect(JSON.stringify(log.mock.calls)).not.toContain('SEGREDO');
    },
  );
});
