import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'pg-boss';
import { JOB_QUEUE } from '../../jobs/job-queue.token';
import { JobsService } from '../../jobs/jobs.service';

export interface GerarExercicioJob {
  moduloId: string;
  tipo: string;
  dificuldade?: string;
  instrucoesExtras?: string;
  async?: boolean;
}

export interface CorrigirTentativaJob {
  exercicioId: string;
  respostaUsuario: string;
  perfilId?: string;
  async?: boolean;
}

export const GERAR_EXERCICIO_JOB = 'exercicios.gerar';
export const CORRIGIR_TENTATIVA_JOB = 'exercicios.corrigir-tentativa';
export const EXERCICIOS_AVALIACOES_SERVICE = Symbol('EXERCICIOS_AVALIACOES_SERVICE');

@Injectable()
export class ExerciciosJobHandler implements OnModuleInit {
  private readonly logger = new Logger(ExerciciosJobHandler.name);

  constructor(
    @Inject(JOB_QUEUE) private readonly queue: JobsService,
    @Inject(EXERCICIOS_AVALIACOES_SERVICE)
    private readonly exerciciosService: {
      gerarExercicio: (dto: GerarExercicioJob) => Promise<unknown>;
      submeterTentativa: (dto: CorrigirTentativaJob) => Promise<unknown>;
    },
  ) {}

  async onModuleInit() {
    await this.queue.work(GERAR_EXERCICIO_JOB, async (jobs: Job<Record<string, unknown>>[]) => {
      for (const job of jobs) {
        await this.processarGerar(job);
      }
    });
    await this.queue.work(CORRIGIR_TENTATIVA_JOB, async (jobs: Job<Record<string, unknown>>[]) => {
      for (const job of jobs) {
        await this.processarCorrigir(job);
      }
    });
    this.logger.log(`Handlers registrados: ${GERAR_EXERCICIO_JOB}, ${CORRIGIR_TENTATIVA_JOB}`);
  }

  private async processarGerar(job: Job<Record<string, unknown>>) {
    const dados = job.data as unknown as GerarExercicioJob;
    this.logger.log(`Processando job ${GERAR_EXERCICIO_JOB} para módulo ${dados.moduloId}`);
    try {
      return await this.exerciciosService.gerarExercicio({ ...dados, async: false });
    } catch (erro) {
      this.logger.error(
        `Falha no job ${GERAR_EXERCICIO_JOB} para módulo ${dados.moduloId}`,
        erro instanceof Error ? erro.stack : String(erro),
      );
      throw erro;
    }
  }

  private async processarCorrigir(job: Job<Record<string, unknown>>) {
    const dados = job.data as unknown as CorrigirTentativaJob;
    this.logger.log(
      `Processando job ${CORRIGIR_TENTATIVA_JOB} para exercício ${dados.exercicioId}`,
    );
    try {
      return await this.exerciciosService.submeterTentativa({ ...dados, async: false });
    } catch (erro) {
      this.logger.error(
        `Falha no job ${CORRIGIR_TENTATIVA_JOB} para exercício ${dados.exercicioId}`,
        erro instanceof Error ? erro.stack : String(erro),
      );
      throw erro;
    }
  }
}
