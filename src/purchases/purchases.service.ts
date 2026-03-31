import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryMovementKind, Prisma } from '@prisma/client';
import type { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  private requireRestaurant(actor: AuthUser): string {
    if (!actor.restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }
    return actor.restaurantId;
  }

  async create(actor: AuthUser, dto: CreatePurchaseDto) {
    const restaurantId = this.requireRestaurant(actor);

    const sum = dto.items.reduce((acc, line) => acc + line.total, 0);
    if (Math.abs(sum - dto.subTotal) > 0.01) {
      throw new BadRequestException(
        'subTotal must equal the sum of all line totals.',
      );
    }

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, restaurantId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found for this restaurant.');
    }

    const itemIds = [...new Set(dto.items.map((i) => i.inventoryItemId))];
    const invItems = await this.prisma.inventoryItem.findMany({
      where: { id: { in: itemIds }, restaurantId },
      select: { id: true },
    });
    if (invItems.length !== itemIds.length) {
      throw new BadRequestException(
        'One or more inventory items are invalid for this restaurant.',
      );
    }

    const purchase = await this.prisma.purchase.create({
      data: {
        restaurantId,
        supplierId: dto.supplierId,
        receiveDate: new Date(dto.receiveDate),
        notes: dto.notes,
        refNo: dto.refNo,
        paymentMethod: dto.paymentMethod,
        restaurantAdminId: actor.sub,
        subTotal: new Prisma.Decimal(dto.subTotal.toFixed(2)),
        items: {
          create: dto.items.map((line) => ({
            inventoryItemId: line.inventoryItemId,
            itemName: line.itemName,
            quantity: new Prisma.Decimal(line.quantity),
            description: line.description ?? 'purchase',
            purchasePrice: new Prisma.Decimal(line.purchasePrice.toFixed(2)),
            sellingPrice: new Prisma.Decimal(line.sellingPrice.toFixed(2)),
            total: new Prisma.Decimal(line.total.toFixed(2)),
          })),
        },
      },
      include: {
        supplier: true,
        restaurantAdmin: { select: { id: true, name: true } },
        items: true,
      },
    });

    const ops: Prisma.PrismaPromise<unknown>[] = [];
    for (const pItem of purchase.items) {
      const qty = new Prisma.Decimal(pItem.quantity.toString());
      ops.push(
        this.prisma.inventoryItem.update({
          where: { id: pItem.inventoryItemId },
          data: { currentStock: { increment: qty } },
        }),
      );
      ops.push(
        this.prisma.inventoryMovement.create({
          data: {
            restaurantId,
            inventoryItemId: pItem.inventoryItemId,
            quantityDelta: qty,
            kind: InventoryMovementKind.PURCHASE,
            description: 'purchase',
            purchaseId: purchase.id,
          },
        }),
      );
    }
    if (ops.length > 0) {
      await this.prisma.$transaction(ops);
    }

    return purchase;
  }

  list(actor: AuthUser) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.purchase.findMany({
      where: { restaurantId },
      include: {
        supplier: true,
        restaurantAdmin: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { receiveDate: 'desc' },
    });
  }
}
