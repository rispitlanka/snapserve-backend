import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  private requireRestaurant(actor: AuthUser): string {
    if (!actor.restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }
    return actor.restaurantId;
  }

  create(actor: AuthUser, dto: CreateExpenseDto) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.expense.create({
      data: {
        restaurantId,
        expenseDate: new Date(dto.expenseDate),
        refNo: dto.refNo,
        payeeName: dto.payeeName,
        description: dto.description,
        category: dto.category,
        paymentMethod: dto.paymentMethod,
        amount: new Prisma.Decimal(dto.amount.toFixed(2)),
        createdByUserId: actor.sub,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  list(actor: AuthUser) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.expense.findMany({
      where: { restaurantId },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { expenseDate: 'desc' },
    });
  }

  async update(actor: AuthUser, id: string, dto: UpdateExpenseDto) {
    const restaurantId = this.requireRestaurant(actor);
    const existing = await this.prisma.expense.findFirst({
      where: { id, restaurantId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Expense not found.');
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.expenseDate !== undefined
          ? { expenseDate: new Date(dto.expenseDate) }
          : {}),
        ...(dto.refNo !== undefined ? { refNo: dto.refNo } : {}),
        ...(dto.payeeName !== undefined ? { payeeName: dto.payeeName } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.paymentMethod !== undefined
          ? { paymentMethod: dto.paymentMethod }
          : {}),
        ...(dto.amount !== undefined
          ? { amount: new Prisma.Decimal(dto.amount.toFixed(2)) }
          : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async remove(actor: AuthUser, id: string) {
    const restaurantId = this.requireRestaurant(actor);
    const existing = await this.prisma.expense.findFirst({
      where: { id, restaurantId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Expense not found.');
    }
    await this.prisma.expense.delete({ where: { id } });
    return { success: true };
  }
}
