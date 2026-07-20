import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, PgBoss, WorkHandler } from 'pg-boss';

export type JobHandler = (jobs: Job<Record<string, unknown>>[]) => Promise<void>;

interface PgBossConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

function parsePostgresUrl(url: string): PgBossConfig {
  const match = url.match(/^postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  if (!match) {
    throw new Error(`DATABASE_URL inválida para pg-boss: ${url}`);
  }
  const [, user, password, host, port, database] = match;
  return { host, port: Number(port), database, user, password };
}

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private boss: PgBoss;

  constructor(connectionString: string) {
    const config = parsePostgresUrl(connectionString);
    this.boss = new PgBoss(config);
  }

  async onModuleInit() {
    await this.boss.start();
    this.logger.log('Fila de jobs (pg-boss) iniciada');
  }

  async onModuleDestroy() {
    await this.boss.stop();
    this.logger.log('Fila de jobs (pg-boss) encerrada');
  }

  async send(nome: string, dados: Record<string, unknown>): Promise<string | null> {
    return this.boss.send(nome, dados);
  }

  async work(nome: string, handler: JobHandler): Promise<void> {
    const wrapped: WorkHandler<Record<string, unknown>, void> = async (jobs) => {
      await handler(jobs);
    };
    await this.boss.work(nome, wrapped);
  }
}
