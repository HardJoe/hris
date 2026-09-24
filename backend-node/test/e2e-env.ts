const defaultDatabaseUrl = 'postgresql://hris_e2e:hris_e2e@127.0.0.1:5433/hris_e2e';
const databaseUrl = process.env.E2E_DATABASE_URL ?? defaultDatabaseUrl;
const databaseName = new URL(databaseUrl).pathname.slice(1);

if (databaseName !== 'hris_e2e') {
  throw new Error('E2E_DATABASE_URL must target the dedicated hris_e2e database');
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = databaseUrl;
process.env.DB_SSL = 'false';
process.env.JWT_SECRET = 'e2e-test-secret-that-is-at-least-thirty-two-characters';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_ISSUER = 'hris-e2e';
process.env.JWT_AUDIENCE = 'hris-e2e-client';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.UPLOAD_DIR = '/tmp/hris-e2e-uploads';
process.env.SWAGGER_ENABLED = 'false';
