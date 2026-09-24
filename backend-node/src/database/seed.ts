import 'dotenv/config';
import * as argon2 from 'argon2';
import { Competency } from '../competencies/entities/competency.entity';
import { User } from '../users/entities/user.entity';
import { appDataSource } from './data-source';

async function seed(): Promise<void> {
  await appDataSource.initialize();
  try {
    await appDataSource
      .getRepository(Competency)
      .createQueryBuilder()
      .insert()
      .values([
        { name: 'Spring Boot' },
        { name: 'ReactJS' },
        { name: 'Node.js' },
      ])
      .orIgnore()
      .execute();

    const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    if (!email || !password) {
      console.info('Admin seed skipped: bootstrap credentials are not configured');
      return;
    }
    if (password.length < 12)
      throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters');

    const users = appDataSource.getRepository(User);
    const existing = await users
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
    if (!existing) {
      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
      });
      await users.save(users.create({ email, passwordHash, isActive: true }));
      console.info('Bootstrap administrator created');
    } else {
      console.info('Bootstrap administrator already exists');
    }
  } finally {
    await appDataSource.destroy();
  }
}

void seed();
