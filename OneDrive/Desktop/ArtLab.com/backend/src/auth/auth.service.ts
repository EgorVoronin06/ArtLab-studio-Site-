import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import type { Response } from 'express';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { clearAuthCookies, setAuthCookies } from './cookie.util';
import type { JwtPayload } from './jwt.strategy';

const BCRYPT_ROUNDS = 12;

function sha256Hex(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function parseDurationToSeconds(raw: string): number {
  const m = /^(\d+)([smhd])$/i.exec(raw.trim());
  if (!m) return 900;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  if (u === 's') return n;
  if (u === 'm') return n * 60;
  if (u === 'h') return n * 3600;
  if (u === 'd') return n * 86400;
  return 900;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  private accessSecret() {
    return this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  private accessExpires() {
    return this.config.get<string>('JWT_ACCESS_EXPIRES') || '15m';
  }

  private refreshExpires() {
    return this.config.get<string>('JWT_REFRESH_EXPIRES') || '7d';
  }

  private accessTtlSec() {
    return parseDurationToSeconds(this.accessExpires());
  }

  private refreshTtlSec() {
    return parseDurationToSeconds(this.refreshExpires());
  }

  private signAccess(user: User) {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return this.jwt.sign(payload, {
      secret: this.accessSecret(),
      expiresIn: this.accessExpires() as `${number}${'s' | 'm' | 'h' | 'd'}`
    });
  }

  private async issueRefresh(userId: string) {
    const raw = randomBytes(48).toString('hex');
    const tokenHash = sha256Hex(raw);
    const expiresAt = new Date(Date.now() + this.refreshTtlSec() * 1000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt }
    });
    return raw;
  }

  async attachAuthCookies(res: Response, user: User) {
    const access = this.signAccess(user);
    const refresh = await this.issueRefresh(user.id);
    setAuthCookies(res, access, refresh, this.accessTtlSec(), this.refreshTtlSec());
  }

  async register(dto: RegisterDto, res: Response) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Пользователь с таким email уже существует');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash,
        role: UserRole.USER,
        telegram: null
      }
    });

    await this.attachAuthCookies(res, user);
    return this.publicUser(user);
  }

  async login(dto: LoginDto, res: Response) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Неверный email или пароль');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Неверный email или пароль');

    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await this.attachAuthCookies(res, user);
    return this.publicUser(user);
  }

  /**
   * Второй фактор: ADMIN_PANEL_PASSWORD в .env.
   * Пользователь в БД должен иметь role=ADMIN и email=ADMIN_PANEL_EMAIL.
   */
  async adminLogin(dto: AdminLoginDto, res: Response) {
    const expectedSecret = this.config.get<string>('ADMIN_PANEL_PASSWORD');
    if (!expectedSecret || expectedSecret.length < 8) {
      throw new BadRequestException('ADMIN_PANEL_PASSWORD не настроен на сервере');
    }
    if (dto.adminSecret !== expectedSecret) {
      throw new UnauthorizedException('Неверные данные для входа');
    }

    const adminEmail = (this.config.get<string>('ADMIN_PANEL_EMAIL') || '').trim().toLowerCase();
    if (!adminEmail) throw new BadRequestException('ADMIN_PANEL_EMAIL не настроен');
    if (dto.email.trim().toLowerCase() !== adminEmail) {
      throw new UnauthorizedException('Неверные данные для входа');
    }

    const user = await this.prisma.user.findUnique({ where: { email: adminEmail } });
    if (!user || user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Аккаунт администратора не найден или не помечен как ADMIN');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Неверные данные для входа');

    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await this.attachAuthCookies(res, user);
    return this.publicUser(user);
  }

  async forgot() {
    return {
      message: 'Если аккаунт существует, на указанный email отправлены инструкции.'
    };
  }

  async refreshTokens(res: Response, oldRefreshRaw: string | undefined) {
    if (!oldRefreshRaw) throw new UnauthorizedException('Нет refresh-токена');
    const oldHash = sha256Hex(oldRefreshRaw);
    const row = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: oldHash, expiresAt: { gt: new Date() } }
    });
    if (!row) throw new UnauthorizedException('Недействительный refresh-токен');

    await this.prisma.refreshToken.delete({ where: { id: row.id } });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: row.userId } });
    const newRefresh = await this.issueRefresh(user.id);
    const access = this.signAccess(user);
    setAuthCookies(res, access, newRefresh, this.accessTtlSec(), this.refreshTtlSec());
    return this.publicUser(user);
  }

  async logout(res: Response, userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    clearAuthCookies(res);
    return { ok: true };
  }

  publicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    };
  }
}
