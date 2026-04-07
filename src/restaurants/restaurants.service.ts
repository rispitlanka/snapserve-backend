import {
  ForbiddenException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateLoyaltySettingsDto } from './dto/update-loyalty-settings.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  private requireRestaurant(actor: AuthUser): string {
    if (!actor.restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }
    return actor.restaurantId;
  }

  async create(dto: CreateRestaurantDto) {
    try {
      return await this.prisma.restaurant.create({
        data: {
          id: dto.id,
          name: dto.name,
          mobileNumber: dto.mobileNumber ?? null,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A restaurant with this id already exists. Choose a different id.',
        );
      }
      throw error;
    }
  }

  list() {
    return this.prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateRestaurantDto) {
    const existing = await this.prisma.restaurant.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Restaurant not found.');
    }

    return this.prisma.restaurant.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.mobileNumber !== undefined
          ? { mobileNumber: dto.mobileNumber }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async getLoyaltySettings(actor: AuthUser) {
    const restaurantId = this.requireRestaurant(actor);
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        loyaltyEnabled: true,
        loyaltyMargin: true,
        loyaltyPercentage: true,
      },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found.');
    }

    return {
      restaurantId: restaurant.id,
      loyaltyEnabled: restaurant.loyaltyEnabled,
      loyaltyMargin: restaurant.loyaltyMargin,
      loyaltyPercentage: restaurant.loyaltyPercentage,
    };
  }

  async updateLoyaltySettings(actor: AuthUser, dto: UpdateLoyaltySettingsDto) {
    const restaurantId = this.requireRestaurant(actor);
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found.');
    }

    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        loyaltyEnabled: dto.loyaltyEnabled,
        loyaltyMargin: new Prisma.Decimal(dto.loyaltyMargin.toFixed(2)),
        loyaltyPercentage: new Prisma.Decimal(dto.loyaltyPercentage.toFixed(2)),
      },
      select: {
        id: true,
        loyaltyEnabled: true,
        loyaltyMargin: true,
        loyaltyPercentage: true,
      },
    });
  }
}
