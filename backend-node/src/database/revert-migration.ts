import { appDataSource } from './data-source';

async function revert(): Promise<void> {
  await appDataSource.initialize();
  try {
    await appDataSource.undoLastMigration({ transaction: 'all' });
    console.info('Last database migration reverted');
  } finally {
    await appDataSource.destroy();
  }
}

void revert();
