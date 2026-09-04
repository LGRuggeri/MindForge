import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, PgBoss, QueueResult, WorkHandler } from 'pg-boss';

export type JobHandler = (jobs: Job<Record<string, unknown>>[]) => Promise<void>;

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private boss: PgBoss;

  constructor(connectionString: string) {
    this.boss = new PgBoss({ connectionString });
  }

  async onModuleInit() {
    await this.boss.start();
    this.logger.log('Fila de jobs (pg-boss) iniciada');
  }

  async onModuleDestroy() {
    await this.boss.stop();
    this.logger.log('Fila de jobs (pg-boss) encerrada');
  }

  async send(
    nome: string,
    dados: Record<string, unknown>,
    options?: { startAfter?: number | Date; retryLimit?: number },
  ): Promise<string | null> {
    return this.boss.send(nome, dados, options);
  }

  async work(nome: string, handler: JobHandler): Promise<void> {
    const wrapped: WorkHandler<Record<string, unknown>, void> = async (jobs) => {
      await handler(jobs);
    };
    await this.boss.work(nome, wrapped);
  }

  async getQueues(names?: string[]): Promise<QueueResult[]> {
    return this.boss.getQueues(names);
  }

  async getJobById<T>(nome: string, id: string) {
    return this.boss.getJobById<T>(nome, id);
  }

  async cancelJob(nome: string, id: string) {
    return this.boss.cancel(nome, id);
  }
}
