import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE_CLIENT');
const DATABASE_POOL = Symbol('DATABASE_POOL');
export type DrizzleDb = NodePgDatabase<typeof schema>;

/**
 * @Global(): o client de banco é injetado em todos os módulos de domínio
 * sem precisar reimportar DatabaseModule em cada um deles. Para um monolito
 * modular de um único usuário, o ganho de simplicidade supera a perda de
 * explicitação de dependência módulo a módulo.
 */
@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Pool({ connectionString: config.getOrThrow<string>('DATABASE_URL') }),
    },
    {
      provide: DRIZZLE,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool): DrizzleDb => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    // Os hooks de destruição dos workers terminam antes de fechar o pool.
    await this.pool.end();
  }
}
