import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    if (!databaseUrl) {
      if (nodeEnv === 'test') {
        this.logger.warn(
          'DATABASE_URL is not set. Skipping DB connection in test mode.',
        );
        return;
      }

      throw new Error('DATABASE_URL is not set. Add it to your environment.');
    }

    this.pool = new Pool({ connectionString: databaseUrl });

    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      this.logger.log('Connected to Postgres successfully.');
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool has not been initialized.');
    }

    return this.pool;
  }
}
