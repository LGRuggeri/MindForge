import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'pg-boss';
import { JOB_QUEUE } from '../../jobs/job-queue.token';
import { JobsService } from '../../jobs/jobs.service';

export interface GerarConteudoJob {
  moduloId: string;
  topico: string;
  nivelAlvo?: string;
  instrucoesExtras?: string;
}

export const GERAR_CONTEUDO_JOB = 'synthesizer:gerar-conteudo';
export const SYNTHESIZER_SERVICE = Symbol('SYNTHESIZER_SERVICE');

@Injectable()
export class SynthesizerJobHandler implements OnModuleInit {
  private readonly logger = new Logger(SynthesizerJobHandler.name);

  constructor(
    @Inject(JOB_QUEUE) private readonly queue: JobsService,
    @Inject(SYNTHESIZER_SERVICE)
    private readonly synthesizerService: {
      gerar: (dto: GerarConteudoJob) => Promise<unknown>;
    },
  ) {}

  async onModuleInit() {
    await this.queue.work(GERAR_CONTEUDO_JOB, async (jobs: Job<Record<string, unknown>>[]) => {
      for (const job of jobs) {
        await this.processar(job);
      }
    });
    this.logger.log(`Handler registrado: ${GERAR_CONTEUDO_JOB}`);
  }

  private async processar(job: Job<Record<string, unknown>>) {
    const dados = { ...(job.data as unknown as GerarConteudoJob), async: false };
    this.logger.log(`Processando job ${GERAR_CONTEUDO_JOB} para módulo ${dados.moduloId}`);
    try {
      await this.synthesizerService.gerar(dados);
    } catch (erro) {
      this.logger.error(
        `Falha no job ${GERAR_CONTEUDO_JOB} para módulo ${dados.moduloId}`,
        erro instanceof Error ? erro.stack : String(erro),
      );
      throw erro;
    }
  }
}
