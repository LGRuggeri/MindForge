import { Global, Inject, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service';

export const JOB_QUEUE = Symbol('JOB_QUEUE');

/**
 * pg-boss roda sobre o próprio PostgreSQL (LISTEN/NOTIFY) — sem Redis,
 * sem serviço novo para operar localmente. Ver decisão em
 * 01-filosofia.md e 03-stack-tecnologica.md.
 */
@Global()
@Module({
  providers: [
    {
      provide: JOB_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.getOrThrow<string>('DATABASE_URL');
        return new JobsService(connectionString);
      },
    },
  ],
  exports: [JOB_QUEUE],
})
export class JobsModule implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(JOB_QUEUE) private readonly queue: JobsService) {}

  onModuleInit() {
    return this.queue.onModuleInit();
  }

  onModuleDestroy() {
    return this.queue.onModuleDestroy();
  }
}
