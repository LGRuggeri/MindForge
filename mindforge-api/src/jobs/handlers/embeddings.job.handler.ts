import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'pg-boss';
import { JOB_QUEUE } from '../../jobs/job-queue.token';
import { JobsService } from '../../jobs/jobs.service';

export interface IndexarEmbeddingJob {
  texto: string;
  conteudoId?: string;
  fonteId?: string;
  async?: boolean;
}

export const INDEXAR_EMBEDDING_JOB = 'biblioteca-viva.indexar';
export const BIBLIOTECA_VIVA_SERVICE = Symbol('BIBLIOTECA_VIVA_SERVICE');

@Injectable()
export class EmbeddingsJobHandler implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingsJobHandler.name);

  constructor(
    @Inject(JOB_QUEUE) private readonly queue: JobsService,
    @Inject(BIBLIOTECA_VIVA_SERVICE)
    private readonly bibliotecaService: {
      indexarTexto: (params: IndexarEmbeddingJob) => Promise<unknown>;
    },
  ) {}

  async onModuleInit() {
    await this.queue.work(INDEXAR_EMBEDDING_JOB, async (jobs: Job<Record<string, unknown>>[]) => {
      for (const job of jobs) {
        await this.processar(job);
      }
    });
    this.logger.log(`Handler registrado: ${INDEXAR_EMBEDDING_JOB}`);
  }

  private async processar(job: Job<Record<string, unknown>>) {
    const dados = job.data as unknown as IndexarEmbeddingJob;
    const origem = dados.conteudoId ?? dados.fonteId ?? 'desconhecida';
    this.logger.log(`Processando job ${INDEXAR_EMBEDDING_JOB} para origem ${origem}`);
    try {
      return await this.bibliotecaService.indexarTexto({ ...dados, async: false });
    } catch (erro) {
      this.logger.error(
        `Falha no job ${INDEXAR_EMBEDDING_JOB} para origem ${origem}`,
        erro instanceof Error ? erro.stack : String(erro),
      );
      throw erro;
    }
  }
}
