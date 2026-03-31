import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRestaurantDto) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        return await this.prisma.restaurant.create({
          data: {
            id: this.generateRestaurantId(),
            name: dto.name,
            isActive: dto.isActive ?? true,
          },
        });
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new InternalServerErrorException(
      'Failed to allocate a unique 6-character restaurant ID.',
    );
  }

  list() {
    return this.prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  private generateRestaurantId(): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = randomBytes(6);
    let id = '';

    for (let i = 0; i < 6; i += 1) {
      id += alphabet[bytes[i] % alphabet.length];
    }

    return id;
  }
}
