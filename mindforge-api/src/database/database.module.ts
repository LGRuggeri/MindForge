import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE_CLIENT');
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
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): DrizzleDb => {
        const pool = new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_URL'),
        });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
