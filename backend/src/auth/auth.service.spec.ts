import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { DeviceTokenEntity } from './entities/device-token.entity';
import { UserEntity } from './entities/user.entity';

function createUserRepository() {
  const store = new Map<string, UserEntity>();
  let sequence = 0;
  return {
    store,
    findOne: jest.fn(async ({ where }: { where: Partial<UserEntity> }) => {
      for (const user of store.values()) {
        if (where.email !== undefined && user.email === where.email) {
          return user;
        }
        if (where.id !== undefined && user.id === where.id) {
          return user;
        }
      }
      return null;
    }),
    create: jest.fn((data: Partial<UserEntity>) => data as UserEntity),
    save: jest.fn(async (user: UserEntity) => {
      if (!user.id) {
        user.id = `user-${++sequence}`;
      }
      store.set(user.id, user);
      return user;
    }),
  };
}

function createDeviceTokenRepository() {
  const insertBuilder = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ identifiers: [] }),
  };
  return { insertBuilder, createQueryBuilder: jest.fn(() => insertBuilder) };
}

describe('AuthService', () => {
  let service: AuthService;
  let jwt: JwtService;
  let repository: ReturnType<typeof createUserRepository>;
  let deviceTokens: ReturnType<typeof createDeviceTokenRepository>;

  beforeEach(async () => {
    repository = createUserRepository();
    deviceTokens = createDeviceTokenRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '1h' } }) },
        { provide: getRepositoryToken(UserEntity), useValue: repository },
        { provide: getRepositoryToken(DeviceTokenEntity), useValue: deviceTokens },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    jwt = moduleRef.get(JwtService);
  });

  it('registers a new user, hashes the password, and returns a verifiable token', async () => {
    const { accessToken } = await service.register('alice@example.com', 'Secret123!');

    const stored = [...repository.store.values()][0];
    expect(stored.passwordHash).not.toBe('Secret123!');
    expect(await bcrypt.compare('Secret123!', stored.passwordHash)).toBe(true);
    const payload = jwt.verify(accessToken);
    expect(payload.sub).toBe(stored.id);
    expect(payload.email).toBe('alice@example.com');
  });

  it('rejects registration when the email already exists', async () => {
    await service.register('bob@example.com', 'Secret123!');
    await expect(service.register('bob@example.com', 'Another1!')).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with valid credentials and rejects a wrong password', async () => {
    await service.register('carol@example.com', 'Secret123!');

    const { accessToken } = await service.login('carol@example.com', 'Secret123!');
    expect(jwt.verify(accessToken).email).toBe('carol@example.com');

    await expect(service.login('carol@example.com', 'wrong-password')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.login('nobody@example.com', 'Secret123!')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('upserts an FCM device token without overwriting existing rows', async () => {
    const result = await service.saveFcmToken('user-1', 'device-token-1');

    expect(result).toEqual({ success: true });
    expect(deviceTokens.insertBuilder.values).toHaveBeenCalledWith({ userId: 'user-1', token: 'device-token-1' });
    expect(deviceTokens.insertBuilder.orIgnore).toHaveBeenCalled();
    expect(deviceTokens.insertBuilder.execute).toHaveBeenCalledTimes(1);
  });
});
