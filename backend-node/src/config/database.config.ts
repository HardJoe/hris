import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function createDatabaseOptions(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: config.getOrThrow<string>('DATABASE_URL'),
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: false,
    logging: config.get<string>('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
    ssl: config.get<boolean>('DB_SSL')
      ? { rejectUnauthorized: config.get<boolean>('DB_SSL_REJECT_UNAUTHORIZED', true) }
      : false,
  };
}
