import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';

export interface LoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private dummyPasswordHash = '';

  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyPasswordHash = await argon2.hash('not-a-real-user-password', {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async login(input: LoginDto): Promise<LoginResult> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = LOWER(:email)', { email: input.email })
      .getOne();

    const hash = user?.passwordHash ?? this.dummyPasswordHash;
    const passwordMatches = await argon2.verify(hash, input.password).catch(() => false);

    if (!user || !user.isActive || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const expiresIn = this.config.getOrThrow<string>('JWT_EXPIRES_IN');
    const accessToken = await this.jwtService.signAsync(
      { email: user.email },
      {
        subject: user.id,
        issuer: this.config.getOrThrow<string>('JWT_ISSUER'),
        audience: this.config.getOrThrow<string>('JWT_AUDIENCE'),
        expiresIn: expiresIn as never,
      },
    );

    return { accessToken, tokenType: 'Bearer', expiresIn };
  }
}
