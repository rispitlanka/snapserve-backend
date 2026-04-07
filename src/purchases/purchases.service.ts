import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryMovementKind,
  Prisma,
  PurchasePaymentMethod,
  PurchasePaymentStatus,
} from '@prisma/client';
import type { AuthUser } from '../common/types/auth-user.type';
import { getPublicErrorMessage } from '../common/utils/prisma-error-mapper';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseCreditSettlementDto } from './dto/credit-settlement.dto';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  private decimalToNumber(value: Prisma.Decimal): number {
    return Number(value.toFixed(2));
  }

  private purchasePaidTotal(payments: { amount: Prisma.Decimal }[]): Prisma.Decimal {
    return payments.reduce(
      (sum, p) => sum.add(new Prisma.Decimal(p.amount.toString())),
      new Prisma.Decimal(0),
    );
  }

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
        paymentStatus:
          dto.paymentMethod === PurchasePaymentMethod.CREDIT
            ? PurchasePaymentStatus.CREDIT
            : PurchasePaymentStatus.PAID,
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
        payments: true,
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
    try {
      if (ops.length > 0) {
        await this.prisma.$transaction(ops);
      }
    } catch (err) {
      await this.prisma.purchase.delete({ where: { id: purchase.id } });
      throw new BadRequestException(
        `Could not update inventory for this purchase, so the purchase was rolled back. ${getPublicErrorMessage(err)}`,
      );
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
        payments: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { receiveDate: 'desc' },
    }).then((rows) =>
      rows.map((p) => {
        const paidTotal = this.purchasePaidTotal(p.payments);
        const outstanding = new Prisma.Decimal(p.subTotal.toString()).sub(paidTotal);
        return {
          ...p,
          paidTotal,
          outstanding: outstanding.lt(0) ? new Prisma.Decimal(0) : outstanding,
        };
      }),
    );
  }

  async settleCredit(
    actor: AuthUser,
    purchaseId: string,
    dto: PurchaseCreditSettlementDto,
  ) {
    const restaurantId = this.requireRestaurant(actor);

    const purchase = await this.prisma.purchase.findFirst({
      where: { id: purchaseId, restaurantId },
      include: {
        payments: { orderBy: { createdAt: 'asc' } },
        supplier: true,
        restaurantAdmin: { select: { id: true, name: true } },
        items: true,
      },
    });
    if (!purchase) {
      throw new NotFoundException('Purchase not found.');
    }
    if (purchase.paymentMethod !== PurchasePaymentMethod.CREDIT) {
      throw new BadRequestException(
        'Only purchases marked as CREDIT can be settled later.',
      );
    }

    const outstanding = new Prisma.Decimal(purchase.subTotal.toString()).sub(
      this.purchasePaidTotal(purchase.payments),
    );
    if (outstanding.lte(0)) {
      throw new BadRequestException(
        'This purchase has no outstanding credit balance.',
      );
    }

    const payAmount = new Prisma.Decimal(dto.amount.toFixed(2));
    if (payAmount.lte(0)) {
      throw new BadRequestException('Amount must be greater than zero.');
    }
    if (payAmount.gt(outstanding)) {
      throw new BadRequestException(
        `Amount exceeds outstanding balance (${this.decimalToNumber(outstanding)}).`,
      );
    }

    const newOutstanding = outstanding.sub(payAmount);
    const nextStatus = newOutstanding.lte(0)
      ? PurchasePaymentStatus.PAID
      : PurchasePaymentStatus.CREDIT;

    await this.prisma.$transaction([
      this.prisma.purchasePayment.create({
        data: {
          purchaseId,
          method: dto.method,
          amount: payAmount,
          note: dto.note?.trim() || null,
        },
      }),
      this.prisma.purchase.update({
        where: { id: purchaseId },
        data: { paymentStatus: nextStatus },
      }),
    ]);

    const updated = await this.prisma.purchase.findFirstOrThrow({
      where: { id: purchaseId, restaurantId },
      include: {
        supplier: true,
        restaurantAdmin: { select: { id: true, name: true } },
        items: true,
        payments: { orderBy: { createdAt: 'asc' } },
      },
    });

    const paidTotal = this.purchasePaidTotal(updated.payments);
    const remaining = new Prisma.Decimal(updated.subTotal.toString()).sub(paidTotal);
    return {
      ...updated,
      paidTotal,
      outstanding: remaining.lt(0) ? new Prisma.Decimal(0) : remaining,
    };
  }
}
