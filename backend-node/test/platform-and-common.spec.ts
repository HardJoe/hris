import { BadRequestException, Logger, StreamableFile } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { lastValueFrom, of } from 'rxjs';
import { createDatabaseOptions } from '../src/config/database.config';
import { environmentSchema } from '../src/config/environment';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseEnvelopeInterceptor } from '../src/common/interceptors/response-envelope.interceptor';
import { JwtStrategy } from '../src/auth/jwt.strategy';

interface ErrorPayload {
  error: { code: string; message: string | string[] };
}

describe('platform configuration and common HTTP behavior', () => {
  it('builds database options with development logging and configurable SSL', () => {
    const values: Record<string, unknown> = {
      DATABASE_URL: 'postgresql://user:password@localhost:5432/hris', NODE_ENV: 'development', DB_SSL: true,
      DB_SSL_REJECT_UNAUTHORIZED: false,
    };
    const config = { getOrThrow: jest.fn((key: string) => values[key]), get: jest.fn((key: string) => values[key]) };

    expect(createDatabaseOptions(config as never)).toMatchObject({
      type: 'postgres', url: values.DATABASE_URL, logging: ['error', 'warn'], ssl: { rejectUnauthorized: false },
      synchronize: false, migrationsRun: false,
    });
    values.NODE_ENV = 'production';
    values.DB_SSL = false;
    expect(createDatabaseOptions(config as never)).toMatchObject({ logging: ['error'], ssl: false });
  });

  it('validates required environment values and applies defaults', () => {
    const valid = environmentSchema.validate({
      DATABASE_URL: 'postgresql://user:password@localhost:5432/hris', JWT_SECRET: 'a'.repeat(32),
    });
    expect(valid.error).toBeUndefined();
    expect(valid.value).toMatchObject({ NODE_ENV: 'development', PORT: 3000, JWT_EXPIRES_IN: '15m' });
    expect(environmentSchema.validate({ JWT_SECRET: 'short' }).error).toBeDefined();
  });

  it('wraps standard responses but leaves file responses intact', async () => {
    const interceptor = new ResponseEnvelopeInterceptor<string>();
    await expect(lastValueFrom(interceptor.intercept({} as never, { handle: () => of('value') }))).resolves.toEqual({ data: 'value' });
    const file = new StreamableFile(Buffer.from('file'));
    const fileInterceptor = new ResponseEnvelopeInterceptor<StreamableFile>();
    await expect(lastValueFrom(fileInterceptor.intercept({} as never, { handle: () => of(file) }))).resolves.toBe(file);
  });

  it('formats HTTP, database, and unexpected errors into the public envelope', () => {
    const filter = new GlobalExceptionFilter();
    const json = jest.fn<void, [ErrorPayload]>();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: (): {
        getResponse: () => { status: typeof status };
        getRequest: () => { method: string; url: string };
      } => ({
        getResponse: (): { status: typeof status } => ({ status }),
        getRequest: (): { method: string; url: string } => ({ method: 'POST', url: '/employees' }),
      }),
    };
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    filter.catch(new BadRequestException(['name is required']), host as never);
    expect(status).toHaveBeenLastCalledWith(400);
    expect(json.mock.calls.at(-1)?.[0]).toMatchObject({
      error: { code: 'BadRequestException', message: ['name is required'] },
    });

    filter.catch(queryError('23505'), host as never);
    expect(json.mock.calls.at(-1)?.[0].error.code).toBe('DUPLICATE_RESOURCE');
    filter.catch(queryError('23503'), host as never);
    expect(json.mock.calls.at(-1)?.[0].error.code).toBe('RESOURCE_IN_USE');

    filter.catch(new Error('unexpected'), host as never);
    expect(status).toHaveBeenLastCalledWith(500);
    expect(log).toHaveBeenCalledWith('POST /employees', expect.any(String));
    log.mockRestore();
  });

  it('loads active JWT users and rejects users that are no longer active', async () => {
    const config = { getOrThrow: jest.fn((key: string) => ({ JWT_SECRET: 'secret', JWT_ISSUER: 'issuer', JWT_AUDIENCE: 'audience' })[key]) };
    const repository = { findOne: jest.fn().mockResolvedValue({ id: 'user-1', email: 'admin@example.com' }) };
    const strategy = new JwtStrategy(config as never, repository as never);

    await expect(strategy.validate({ sub: 'user-1', email: 'ignored@example.com' })).resolves.toEqual({ sub: 'user-1', email: 'admin@example.com' });
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'user-1', isActive: true }, select: { id: true, email: true } });
    repository.findOne.mockResolvedValue(null);
    await expect(strategy.validate({ sub: 'user-1', email: 'admin@example.com' })).rejects.toThrow('User is no longer active');
  });
});

function queryError(code: string): QueryFailedError {
  const error = new QueryFailedError('INSERT', [], new Error('database error'));
  (error as unknown as { driverError: Error & { code: string } }).driverError = Object.assign(
    new Error('database error'),
    { code },
  );
  return error;
}
