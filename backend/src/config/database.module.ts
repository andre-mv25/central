import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from './database.constants';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const pool = new Pool({
          host: config.get<string>('database.host'),
          port: config.get<number>('database.port'),
          user: config.get<string>('database.user'),
          password: config.get<string>('database.password'),
          database: config.get<string>('database.name'),
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });

        pool.on('error', (err) => {
          Logger.error(`Error inesperado en el pool de PostgreSQL: ${err.message}`, 'DatabaseModule');
        });

        return pool;
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
