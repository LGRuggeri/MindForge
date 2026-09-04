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

  private iniciado?: Promise<void>;

  private garantirIniciado(): Promise<void> {
    // `start()` migra/cria o schema pgboss; os handlers registram filas em
    // onModuleInit concorrentemente, então toda operação precisa esperar (e
    // deduplicar) a inicialização para não correr contra a criação do schema.
    this.iniciado ??= this.boss.start().then(() => undefined);
    return this.iniciado;
  }

  async onModuleInit() {
    await this.garantirIniciado();
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
    await this.garantirIniciado();
    await this.criarFilaSeNecessario(nome);
    return this.boss.send(nome, dados, options);
  }

  async work(nome: string, handler: JobHandler): Promise<void> {
    await this.garantirIniciado();
    await this.criarFilaSeNecessario(nome);
    const wrapped: WorkHandler<Record<string, unknown>, void> = async (jobs) => {
      await handler(jobs);
    };
    await this.boss.work(nome, wrapped);
  }

  /**
   * pg-boss 12 não cria filas automaticamente em `work`/`send`; a fila precisa
   * existir antes. `createQueue` é idempotente, então chamá-lo por nome uma
   * vez por processo é suficiente.
   */
  private filasCriadas = new Set<string>();

  private async criarFilaSeNecessario(nome: string): Promise<void> {
    if (this.filasCriadas.has(nome)) return;
    await this.boss.createQueue(nome);
    this.filasCriadas.add(nome);
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
