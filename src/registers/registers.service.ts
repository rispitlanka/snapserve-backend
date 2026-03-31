import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegisterDto } from './dto/create-register.dto';
import { UpdateRegisterDto } from './dto/update-register.dto';

@Injectable()
export class RegistersService {
  constructor(private readonly prisma: PrismaService) {}

  private requireRestaurant(actor: AuthUser): string {
    if (!actor.restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }
    return actor.restaurantId;
  }

  async create(actor: AuthUser, dto: CreateRegisterDto) {
    const restaurantId = this.requireRestaurant(actor);
    try {
      return await this.prisma.register.create({
        data: {
          restaurantId,
          name: dto.name.trim(),
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Register name already exists.');
      }
      throw error;
    }
  }

  list(actor: AuthUser) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.register.findMany({
      where: { restaurantId },
      include: {
        occupiedBySession: {
          include: {
            cashier: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(actor: AuthUser, id: string, dto: UpdateRegisterDto) {
    const restaurantId = this.requireRestaurant(actor);
    const exists = await this.prisma.register.findFirst({
      where: { id, restaurantId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Register not found.');
    }

    try {
      return await this.prisma.register.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          isActive: dto.isActive,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Register name already exists.');
      }
      throw error;
    }
  }
}
