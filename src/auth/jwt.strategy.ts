import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

type JwtPayload = {
  sub: string;
  role: Role;
  restaurantId: string | null;
  registerId: string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not set.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { restaurant: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is inactive or does not exist.');
    }

    if (user.role !== Role.SUPER_ADMIN && !user.restaurant?.isActive) {
      throw new UnauthorizedException('Restaurant is inactive.');
    }

    if (payload.registerId) {
      const register = await this.prisma.register.findUnique({
        where: { id: payload.registerId },
        include: { occupiedBySession: true },
      });
      if (
        !register ||
        register.restaurantId !== user.restaurantId ||
        !register.occupiedBySession ||
        register.occupiedBySession.cashierUserId !== user.id ||
        register.occupiedBySession.endedAt !== null
      ) {
        throw new UnauthorizedException('Register session is not active.');
      }
    }

    return {
      sub: user.id,
      role: user.role,
      restaurantId: user.restaurantId,
      registerId: payload.registerId,
    };
  }
}
