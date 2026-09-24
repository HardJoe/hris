import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';

jest.mock('argon2', () => ({
  argon2id: 2,
  hash: jest.fn(),
  verify: jest.fn(),
}));

import * as argon2 from 'argon2';

describe('AuthService', () => {
  const query = {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };
  const repository = { createQueryBuilder: jest.fn(() => query) };
  const jwt = { signAsync: jest.fn() };
  const config = {
    getOrThrow: jest.fn((key: string) =>
      ({ JWT_EXPIRES_IN: '1h', JWT_ISSUER: 'hris', JWT_AUDIENCE: 'hris-web' })[key],
    ),
  };
  const service = new AuthService(repository as never, jwt as never, config as never);

  beforeEach(() => jest.clearAllMocks());

  it('creates a dummy hash during startup to make unknown-user checks safe', async () => {
    jest.mocked(argon2.hash).mockResolvedValue('dummy-hash');

    await service.onModuleInit();

    expect(argon2.hash).toHaveBeenCalledWith('not-a-real-user-password', expect.objectContaining({ type: argon2.argon2id }));
  });

  it('issues a scoped bearer token for an active user with a matching password', async () => {
    query.getOne.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      isActive: true,
      passwordHash: 'stored-hash',
    });
    jest.mocked(argon2.verify).mockResolvedValue(true);
    jwt.signAsync.mockResolvedValue('signed-token');

    await expect(service.login({ email: 'Admin@Example.com', password: 'password123' })).resolves.toEqual({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: '1h',
    });
    expect(query.where).toHaveBeenCalledWith('LOWER(user.email) = LOWER(:email)', {
      email: 'Admin@Example.com',
    });
    expect(jwt.signAsync).toHaveBeenCalledWith(
      { email: 'admin@example.com' },
      expect.objectContaining({ subject: 'user-1', issuer: 'hris', audience: 'hris-web' }),
    );
  });

  it.each([
    ['an unknown user', undefined, true],
    ['an inactive user', { id: 'user-1', isActive: false, passwordHash: 'stored-hash' }, true],
    ['a wrong password', { id: 'user-1', isActive: true, passwordHash: 'stored-hash' }, false],
  ])('rejects %s without issuing a token', async (_case, user, passwordMatches) => {
    query.getOne.mockResolvedValue(user);
    (service as unknown as { dummyPasswordHash: string }).dummyPasswordHash = 'dummy-hash';
    jest.mocked(argon2.verify).mockResolvedValue(passwordMatches);

    await expect(service.login({ email: 'admin@example.com', password: 'password123' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});
