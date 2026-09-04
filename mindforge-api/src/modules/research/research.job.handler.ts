import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'pg-boss';
import { JOB_QUEUE } from '../../jobs/job-queue.token';
import { JobsService } from '../../jobs/jobs.service';
import { PesquisarDto } from './dto/pesquisar.dto';

export const RESEARCH_JOB = 'research.pesquisar';
export const RESEARCH_SERVICE = Symbol('RESEARCH_SERVICE');

@Injectable()
export class ResearchJobHandler implements OnModuleInit {
  private readonly logger = new Logger(ResearchJobHandler.name);

  constructor(
    @Inject(JOB_QUEUE) private readonly queue: JobsService,
    @Inject(RESEARCH_SERVICE)
    private readonly researchService: {
      pesquisar: (dto: PesquisarDto) => Promise<unknown>;
    },
  ) {}

  async onModuleInit() {
    await this.queue.work(RESEARCH_JOB, async (jobs: Job<Record<string, unknown>>[]) => {
      for (const job of jobs) {
        await this.processar(job);
      }
    });
    this.logger.log(`Handler registrado: ${RESEARCH_JOB}`);
  }

  private async processar(job: Job<Record<string, unknown>>) {
    const dados = job.data as unknown as PesquisarDto;
    this.logger.log(`Processando job ${RESEARCH_JOB} para módulo ${dados.moduloId}`);
    try {
      // Força execução síncrona dentro do worker para evitar re-enfileiramento.
      return await this.researchService.pesquisar({ ...dados, async: false });
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      this.logger.error(
        `Falha no job ${RESEARCH_JOB} para módulo ${dados.moduloId}: ${mensagem}`,
        erro instanceof Error ? erro.stack : undefined,
      );
      throw erro;
    }
  }
}
