import { Controller, Delete, Get, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import { JOB_QUEUE } from './job-queue.token';
import { JobsService } from './jobs.service';

const QUEUES = [
  'synthesizer.gerar-conteudo',
  'exercicios.gerar',
  'exercicios.corrigir-tentativa',
  'biblioteca-viva.indexar',
  'research.pesquisar',
];

@Controller('jobs')
export class JobsController {
  constructor(@Inject(JOB_QUEUE) private readonly jobs: JobsService) {}

  @Get('filas')
  async listarFilas() {
    const filas = await this.jobs.getQueues(QUEUES);
    return filas.map((f) => ({
      nome: f.name,
      enfileirados: f.queuedCount,
      prontos: f.readyCount,
      ativos: f.activeCount,
      falhos: f.failedCount,
      total: f.totalCount,
      atualizadoEm: f.updatedOn,
    }));
  }

  @Get(':nome/:id')
  async buscarJob(@Param('nome') nome: string, @Param('id', ParseUUIDPipe) id: string) {
    const job = await this.jobs.getJobById<Record<string, unknown>>(nome, id);
    if (!job) {
      return { encontrado: false };
    }
    return {
      encontrado: true,
      id: job.id,
      nome: job.name,
      status: job.state ?? 'desconhecido',
      criadoEm: job.createdOn,
      iniciadoEm: job.startedOn,
      finalizadoEm: job.completedOn,
      tentativas: job.retryCount,
    };
  }

  @Get(':nome/:id/estado')
  async estadoJob(@Param('nome') nome: string, @Param('id', ParseUUIDPipe) id: string) {
    const job = await this.jobs.getJobById<Record<string, unknown>>(nome, id);
    return {
      encontrado: !!job,
      id,
      nome,
      status: job?.state ?? null,
      retryCount: job?.retryCount ?? null,
    };
  }

  @Delete(':nome/:id')
  async cancelarJob(@Param('nome') nome: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.jobs.cancelJob(nome, id);
    const job = await this.jobs.getJobById<Record<string, unknown>>(nome, id);
    return {
      cancelado: job?.state === 'cancelled',
      id,
      nome,
      status: job?.state ?? null,
    };
  }
}
