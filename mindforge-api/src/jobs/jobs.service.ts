import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConstructorOptions, Job, PgBoss, QueueResult, WorkHandler } from 'pg-boss';

export type JobHandler = (jobs: Job<Record<string, unknown>>[]) => Promise<unknown>;

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private boss: PgBoss;

  constructor(connectionString: string, options: Pick<ConstructorOptions, 'schema'> = {}) {
    this.boss = new PgBoss({ ...options, connectionString });
    this.boss.on('error', () => this.logger.error('Erro na fila de jobs (pg-boss)'));
  }

  private iniciado?: Promise<void>;

  private garantirIniciado(): Promise<void> {
    // `start()` migra/cria o schema pgboss; os handlers registram filas em
    // onModuleInit concorrentemente, então toda operação precisa esperar (e
    // deduplicar) a inicialização para não correr contra a criação do schema.
    this.iniciado ??= this.boss
      .start()
      .then(() => undefined)
      .catch((erro: unknown) => {
        this.iniciado = undefined;
        throw erro;
      });
    return this.iniciado;
  }

  async onModuleInit() {
    await this.garantirIniciado();
    this.logger.log('Fila de jobs (pg-boss) iniciada');
  }

  async onModuleDestroy() {
    await this.iniciado?.catch(() => undefined);
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
    const wrapped: WorkHandler<Record<string, unknown>, unknown> = async (jobs) => {
      return handler(jobs);
    };
    // pg-boss persiste o retorno automático somente para execução de um job.
    await this.boss.work(nome, { batchSize: 1 }, wrapped);
  }

  /**
   * pg-boss 12 não cria filas automaticamente em `work`/`send`; a fila precisa
   * existir antes. `createQueue` é idempotente, então chamá-lo por nome uma
   * vez por processo é suficiente.
   */
  private filasCriadas = new Map<string, Promise<void>>();

  private async criarFilaSeNecessario(nome: string): Promise<void> {
    let criacao = this.filasCriadas.get(nome);
    if (!criacao) {
      criacao = this.boss
        .createQueue(nome)
        .then(() => undefined)
        .catch((erro: unknown) => {
          this.filasCriadas.delete(nome);
          throw erro;
        });
      this.filasCriadas.set(nome, criacao);
    }
    await criacao;
  }

  async getQueues(names?: string[]): Promise<QueueResult[]> {
    await this.garantirIniciado();
    return this.boss.getQueues(names);
  }

  async getJobById<T>(nome: string, id: string) {
    await this.garantirIniciado();
    return this.boss.getJobById<T>(nome, id);
  }

  async cancelJob(nome: string, id: string) {
    await this.garantirIniciado();
    return this.boss.cancel(nome, id);
  }
}
