import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  create(actor: AuthUser, dto: CreateSupplierDto) {
    if (!actor.restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }

    return this.prisma.supplier.create({
      data: {
        name: dto.name,
        contactNumber: dto.contactNumber,
        description: dto.description,
        restaurantId: actor.restaurantId,
      },
    });
  }

  list(actor: AuthUser) {
    if (!actor.restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }

    return this.prisma.supplier.findMany({
      where: { restaurantId: actor.restaurantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
