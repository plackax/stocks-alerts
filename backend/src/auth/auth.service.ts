import { ConflictException, Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { DeviceTokenEntity } from './entities/device-token.entity';
import { UserEntity } from './entities/user.entity';

const SEED_EMAIL = 'test@test.com';
const SEED_PASSWORD = 'Test1234!';
const SALT_ROUNDS = 12;

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(DeviceTokenEntity)
    private readonly deviceTokens: Repository<DeviceTokenEntity>,
    private readonly jwt: JwtService,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    const existing = await this.users.findOne({ where: { email: SEED_EMAIL } });
    if (existing) {
      return;
    }
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
    await this.users.save(this.users.create({ email: SEED_EMAIL, passwordHash }));
    this.logger.log(`Seeded default user ${SEED_EMAIL}`);
  }

  async register(email: string, password: string) {
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.users.save(this.users.create({ email, passwordHash }));
    return this.buildToken(user);
  }

  async login(email: string, password: string) {
    const user = await this.users.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.buildToken(user);
  }

  async saveFcmToken(userId: string, token: string) {
    await this.deviceTokens
      .createQueryBuilder()
      .insert()
      .into(DeviceTokenEntity)
      .values({ userId, token })
      .orIgnore()
      .execute();
    return { success: true };
  }

  private buildToken(user: UserEntity) {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    return { accessToken };
  }
}
