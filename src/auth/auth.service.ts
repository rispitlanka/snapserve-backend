import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.refreshTtlSeconds = Number(
      configService.get<string>('JWT_EXPIRES_IN') ?? '604800',
    );
  }

  async login(dto: LoginDto) {
    const isSuperAdminLogin = !dto.restaurantId && !dto.name;
    const isRestaurantLogin = !!dto.restaurantId && !!dto.name;

    if (!isSuperAdminLogin && !isRestaurantLogin) {
      throw new BadRequestException(
        'Provide either password-only (super admin) or restaurantId+name+password.',
      );
    }

    const user = isSuperAdminLogin
      ? await this.prisma.user.findFirst({
          where: { role: Role.SUPER_ADMIN },
          include: { restaurant: true },
        })
      : await this.prisma.user.findUnique({
          where: {
            restaurantId_name: {
              restaurantId: dto.restaurantId!,
              name: dto.name!,
            },
          },
          include: { restaurant: true },
        });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive.');
    }

    if (user.role !== Role.SUPER_ADMIN && !user.restaurant?.isActive) {
      throw new ForbiddenException('Restaurant is inactive.');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const tokens = await this.issueTokens(
      user.id,
      user.role,
      user.restaurantId,
    );
    return {
      ...tokens,
      requiresRegisterSelection: user.role === Role.CASHIER,
      registerId: null,
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const now = new Date();

    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: { include: { restaurant: true } } },
    });

    if (!session || session.revokedAt || session.expiresAt <= now) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (!session.user.isActive) {
      throw new ForbiddenException('User account is inactive.');
    }

    if (
      session.user.role !== Role.SUPER_ADMIN &&
      !session.user.restaurant?.isActive
    ) {
      throw new ForbiddenException('Restaurant is inactive.');
    }

    return this.prisma.$transaction(async (tx) => {
      const tokenBundle = this.buildTokenBundle(
        session.user.id,
        session.user.role,
        session.user.restaurantId,
        null,
      );

      const newSession = await tx.refreshSession.create({
        data: {
          userId: session.user.id,
          tokenHash: this.hashToken(tokenBundle.refreshToken),
          expiresAt: tokenBundle.refreshExpiresAt,
        },
      });

      await tx.refreshSession.update({
        where: { id: session.id },
        data: {
          revokedAt: now,
          replacedBySessionId: newSession.id,
        },
      });

      return {
        accessToken: tokenBundle.accessToken,
        refreshToken: tokenBundle.refreshToken,
        requiresRegisterSelection: session.user.role === Role.CASHIER,
        registerId: null,
      };
    });
  }

  async logout(refreshToken: string): Promise<{ success: true }> {
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (session?.user.role === Role.CASHIER && session.user.restaurantId) {
      await this.releaseCashierRegister(
        session.user.id,
        session.user.restaurantId,
      );
    }
    await this.prisma.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async selectRegister(actor: AuthUser, registerId: string) {
    if (actor.role !== Role.CASHIER) {
      throw new ForbiddenException('Only cashiers can select a register.');
    }
    if (!actor.restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }
    const restaurantId = actor.restaurantId;

    return this.prisma.$transaction(async (tx) => {
      // Interactive tx param is typed with Omit<>; cast restores full client surface for TS/IDE.
      const db = tx as unknown as PrismaClient;
      await this.releaseCashierRegister(actor.sub, restaurantId, db);

      const register = await db.register.findFirst({
        where: { id: registerId, restaurantId, isActive: true },
        select: { id: true },
      });
      if (!register) {
        throw new BadRequestException('Register is not available.');
      }

      const activeSession = await db.cashierRegisterSession.create({
        data: {
          restaurantId,
          registerId,
          cashierUserId: actor.sub,
        },
      });

      const acquired = await db.register.updateMany({
        where: {
          id: registerId,
          restaurantId,
          occupiedBySessionId: null,
        },
        data: { occupiedBySessionId: activeSession.id },
      });
      if (acquired.count !== 1) {
        throw new ConflictException('Register is already occupied.');
      }

      const tokens = this.buildTokenBundle(
        actor.sub,
        actor.role,
        restaurantId,
        registerId,
      );
      await db.refreshSession.create({
        data: {
          userId: actor.sub,
          tokenHash: this.hashToken(tokens.refreshToken),
          expiresAt: tokens.refreshExpiresAt,
        },
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        requiresRegisterSelection: false,
        registerId,
      };
    });
  }

  async changePassword(user: AuthUser, dto: ChangePasswordDto) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
    });

    if (!dbUser) {
      throw new UnauthorizedException('User not found.');
    }

    const valid = await bcrypt.compare(
      dto.currentPassword,
      dbUser.passwordHash,
    );
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      const db = tx as unknown as PrismaClient;
      await db.user.update({
        where: { id: user.sub },
        data: { passwordHash: newPasswordHash },
      });

      await db.refreshSession.updateMany({
        where: { userId: user.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return { success: true };
  }

  private async issueTokens(
    userId: string,
    role: Role,
    restaurantId: string | null,
  ) {
    const tokenBundle = this.buildTokenBundle(userId, role, restaurantId, null);
    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: this.hashToken(tokenBundle.refreshToken),
        expiresAt: tokenBundle.refreshExpiresAt,
      },
    });

    return {
      accessToken: tokenBundle.accessToken,
      refreshToken: tokenBundle.refreshToken,
    };
  }

  private buildTokenBundle(
    userId: string,
    role: Role,
    restaurantId: string | null,
    registerId: string | null,
  ) {
    const payload = { sub: userId, role, restaurantId, registerId };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = randomBytes(48).toString('hex');
    const refreshExpiresAt = new Date(
      Date.now() + this.refreshTtlSeconds * 1000,
    );

    return { accessToken, refreshToken, refreshExpiresAt };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async releaseCashierRegister(
    userId: string,
    restaurantId: string,
    db: PrismaClient = this.prisma as unknown as PrismaClient,
  ) {
    const activeSessions = await db.cashierRegisterSession.findMany({
      where: { cashierUserId: userId, restaurantId, endedAt: null },
      select: { id: true },
    });
    if (activeSessions.length === 0) {
      return;
    }

    const ids = activeSessions.map((s) => s.id);
    await db.register.updateMany({
      where: { restaurantId, occupiedBySessionId: { in: ids } },
      data: { occupiedBySessionId: null },
    });
    await db.cashierRegisterSession.updateMany({
      where: { id: { in: ids }, endedAt: null },
      data: { endedAt: new Date() },
    });
  }
}
