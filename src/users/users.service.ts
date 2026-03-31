import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createRestaurantAdmin(dto: CreateAdminDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        passwordHash,
        role: Role.RESTAURANT_ADMIN,
        restaurantId: dto.restaurantId,
      },
    });
  }

  listRestaurantAdmins() {
    return this.prisma.user.findMany({
      where: { role: Role.RESTAURANT_ADMIN },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRestaurantAdmin(userId: string, dto: UpdateUserDto) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.role !== Role.RESTAURANT_ADMIN) {
      throw new NotFoundException('Restaurant admin not found.');
    }

    return this.updateUserById(userId, dto);
  }

  async deleteRestaurantAdmin(userId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.role !== Role.RESTAURANT_ADMIN) {
      throw new NotFoundException('Restaurant admin not found.');
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true };
  }

  async createRestaurantStaff(actor: AuthUser, dto: CreateStaffDto) {
    if (!actor.restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }

    if (!this.isStaffRole(dto.role)) {
      throw new BadRequestException('Staff role must be CASHIER or WAITER.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        passwordHash,
        role: dto.role,
        restaurantId: actor.restaurantId,
      },
    });
  }

  listRestaurantStaff(actor: AuthUser) {
    if (!actor.restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }

    return this.prisma.user.findMany({
      where: {
        restaurantId: actor.restaurantId,
        role: { in: [Role.CASHIER, Role.WAITER] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRestaurantStaff(
    actor: AuthUser,
    userId: string,
    dto: UpdateUserDto,
  ) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target || !this.isStaffRole(target.role)) {
      throw new NotFoundException('Staff user not found.');
    }

    if (target.restaurantId !== actor.restaurantId) {
      throw new ForbiddenException('Cross-restaurant access is not allowed.');
    }

    return this.updateUserById(userId, dto);
  }

  async deleteRestaurantStaff(actor: AuthUser, userId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target || !this.isStaffRole(target.role)) {
      throw new NotFoundException('Staff user not found.');
    }

    if (target.restaurantId !== actor.restaurantId) {
      throw new ForbiddenException('Cross-restaurant access is not allowed.');
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true };
  }

  private async updateUserById(userId: string, dto: UpdateUserDto) {
    const data: {
      name?: string;
      passwordHash?: string;
      isActive?: boolean;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  private isStaffRole(role: Role): role is 'CASHIER' | 'WAITER' {
    return role === Role.CASHIER || role === Role.WAITER;
  }
}
