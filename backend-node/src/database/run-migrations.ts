import { appDataSource } from './data-source';

async function run(): Promise<void> {
  await appDataSource.initialize();
  try {
    const migrations = await appDataSource.runMigrations({ transaction: 'all' });
    console.info(`Database migrations applied: ${migrations.length}`);
  } finally {
    await appDataSource.destroy();
  }
}

void run();
