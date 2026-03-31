import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryMovementKind,
  OrderPayMethod,
  OrderPaymentStatus,
  OrderStatus,
  OrderType,
  Prisma,
} from '@prisma/client';
import type { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreditSettlementDto } from './dto/credit-settlement.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private generateInvoiceId(): string {
    const now = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `INV-${now}-${rnd}`;
  }

  private decimalToNumber(value: Prisma.Decimal): number {
    return Number(value.toFixed(2));
  }

  private orderPaidTotal(
    payments: { amount: Prisma.Decimal }[],
  ): Prisma.Decimal {
    return payments.reduce(
      (sum, p) => sum.add(new Prisma.Decimal(p.amount.toString())),
      new Prisma.Decimal(0),
    );
  }

  private orderCreditOutstanding(order: {
    totalAmount: Prisma.Decimal;
    returnedAmount: Prisma.Decimal;
    payments: { amount: Prisma.Decimal }[];
  }): Prisma.Decimal {
    const due = new Prisma.Decimal(order.totalAmount.toString()).sub(
      new Prisma.Decimal(order.returnedAmount.toString()),
    );
    const paid = this.orderPaidTotal(order.payments);
    const out = due.sub(paid);
    return out.lt(0) ? new Prisma.Decimal(0) : out;
  }

  private requireRestaurant(actor: AuthUser): string {
    if (!actor.restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }
    return actor.restaurantId;
  }

  private async assertUserInRestaurant(
    userId: string,
    restaurantId: string,
  ): Promise<void> {
    const u = await this.prisma.user.findFirst({
      where: { id: userId, restaurantId },
      select: { id: true },
    });
    if (!u) {
      throw new BadRequestException('User is not valid for this restaurant.');
    }
  }

  async create(actor: AuthUser, dto: CreateOrderDto) {
    const restaurantId = this.requireRestaurant(actor);
    if (!actor.registerId) {
      throw new ForbiddenException(
        'Cashier must select a register before creating orders.',
      );
    }
    const register = await this.prisma.register.findUnique({
      where: { id: actor.registerId },
      include: { occupiedBySession: true },
    });
    if (
      !register ||
      register.restaurantId !== restaurantId ||
      !register.occupiedBySession ||
      register.occupiedBySession.cashierUserId !== actor.sub ||
      register.occupiedBySession.endedAt !== null
    ) {
      throw new ForbiddenException('Register session is not active.');
    }

    const placedByUserId = dto.placedByUserId ?? actor.sub;
    const receivedByUserId = dto.receivedByUserId ?? actor.sub;
    await this.assertUserInRestaurant(placedByUserId, restaurantId);
    await this.assertUserInRestaurant(receivedByUserId, restaurantId);

    if (dto.customer) {
      const cust = await this.prisma.customer.findFirst({
        where: {
          id: dto.customer.id,
          restaurantId,
          name: dto.customer.name,
          mobileNumber: dto.customer.mobileNumber,
        },
        select: { id: true },
      });
      if (!cust) {
        throw new BadRequestException(
          'Customer does not match this restaurant.',
        );
      }
    }

    const consumption = new Map<string, Prisma.Decimal>();

    const addConsume = (inventoryItemId: string, qty: Prisma.Decimal) => {
      const prev = consumption.get(inventoryItemId) ?? new Prisma.Decimal(0);
      consumption.set(inventoryItemId, prev.add(qty));
    };

    for (const line of dto.items) {
      const menuItem = await this.prisma.menuItem.findFirst({
        where: { id: line.id, restaurantId },
        include: { ingredients: true },
      });
      if (!menuItem) {
        throw new BadRequestException(`Menu item not found: ${line.id}`);
      }

      const qty = new Prisma.Decimal(line.quantity);
      const returned = new Prisma.Decimal(line.returnedAmount ?? 0);
      const effective = qty.sub(returned);
      if (effective.lt(0)) {
        throw new BadRequestException(
          'Returned amount cannot exceed quantity.',
        );
      }

      for (const ing of menuItem.ingredients) {
        const perUnit = new Prisma.Decimal(ing.quantity.toString());
        addConsume(ing.inventoryItemId, perUnit.mul(effective));
      }

      for (const ad of line.addons ?? []) {
        const mia = await this.prisma.menuItemAddon.findFirst({
          where: { menuItemId: line.id, addonId: ad.addonId },
          include: { ingredients: true },
        });
        if (!mia) {
          throw new BadRequestException(
            `Addon ${ad.addonId} is not configured for this menu item.`,
          );
        }
        const addonPortions =
          ad.quantity !== undefined
            ? new Prisma.Decimal(ad.quantity)
            : effective;
        for (const ing of mia.ingredients) {
          const per = new Prisma.Decimal(ing.quantity.toString());
          addConsume(ing.inventoryItemId, per.mul(addonPortions));
        }
      }
    }

    const warnings: string[] = [];

    const invIds = [...consumption.keys()];
    const invRows =
      invIds.length > 0
        ? await this.prisma.inventoryItem.findMany({
            where: { id: { in: invIds }, restaurantId },
            select: { id: true, currentStock: true, name: true },
          })
        : [];
    const invById = new Map(invRows.map((r) => [r.id, r]));

    for (const [inventoryItemId, need] of consumption) {
      const inv = invById.get(inventoryItemId);
      if (!inv) {
        throw new BadRequestException(
          `Inventory item missing for consumption: ${inventoryItemId}`,
        );
      }
      const after = new Prisma.Decimal(inv.currentStock.toString()).sub(need);
      if (after.lt(0)) {
        warnings.push(
          `Stock negative for "${inv.name}" (${inventoryItemId}): after order ${after.toFixed(4)}.`,
        );
      }
    }

    const order = await this.prisma.order.create({
      data: {
        invoiceId: this.generateInvoiceId(),
        invoiceDate: new Date(),
        restaurantId,
        status: OrderStatus.COMPLETED,
        orderType: OrderType.SALE,
        saleType: dto.saleType,
        paymentStatus: dto.paymentStatus,
        billTotal: new Prisma.Decimal(dto.billTotal.toFixed(2)),
        billDiscountType: dto.billDiscount?.type,
        billDiscountValue:
          dto.billDiscount !== undefined
            ? new Prisma.Decimal(dto.billDiscount.value.toFixed(2))
            : null,
        vatAmount: new Prisma.Decimal(dto.vatAmount.toFixed(2)),
        serviceChargePercent: new Prisma.Decimal(
          dto.serviceChargePercent.toFixed(2),
        ),
        totalAmount: new Prisma.Decimal(dto.totalAmount.toFixed(2)),
        returnedAmount: new Prisma.Decimal(
          (dto.returnedAmount ?? 0).toFixed(2),
        ),
        remarks: dto.remarks,
        registerId: actor.registerId,
        placedByUserId,
        receivedByUserId,
        customerId: dto.customer?.id,
        customerName: dto.customer?.name,
        customerMobile: dto.customer?.mobileNumber,
        lines: {
          create: dto.items.map((line) => {
            const effectiveQty = Math.max(
              0,
              line.quantity - (line.returnedAmount ?? 0),
            );
            return {
              menuItemId: line.id,
              menuItemName: line.name,
              variantId: line.variantId,
              variantName: line.variantName,
              unitPrice: new Prisma.Decimal(line.price.toFixed(2)),
              quantity: new Prisma.Decimal(line.quantity),
              discount: new Prisma.Decimal(line.discount.toFixed(2)),
              netAmount: new Prisma.Decimal(line.netAmount.toFixed(2)),
              returnedAmount: new Prisma.Decimal(
                (line.returnedAmount ?? 0).toString(),
              ),
              addons: {
                create: (line.addons ?? []).map((a) => ({
                  addonId: a.addonId,
                  addonName: a.name,
                  addonPrice: new Prisma.Decimal(a.price.toFixed(2)),
                  quantity: new Prisma.Decimal(
                    (a.quantity ?? effectiveQty).toString(),
                  ),
                })),
              },
            };
          }),
        },
        payments: {
          create: dto.payments.map((p) => ({
            method: p.method,
            amount: new Prisma.Decimal(p.amount.toFixed(2)),
          })),
        },
        extraCharges: {
          create: dto.extraCharges.map((e) => ({
            reason: e.reason,
            amount: new Prisma.Decimal(e.amount.toFixed(2)),
          })),
        },
      },
      include: {
        lines: { include: { addons: true } },
        payments: true,
        extraCharges: true,
        placedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
        wastedBy: { select: { id: true, name: true } },
        register: true,
        customer: true,
      },
    });

    const stockOps: Prisma.PrismaPromise<unknown>[] = [];
    for (const [inventoryItemId, need] of consumption) {
      stockOps.push(
        this.prisma.inventoryItem.update({
          where: { id: inventoryItemId },
          data: {
            currentStock: { decrement: need },
          },
        }),
      );
      stockOps.push(
        this.prisma.inventoryMovement.create({
          data: {
            restaurantId,
            inventoryItemId,
            quantityDelta: need.mul(-1),
            kind: InventoryMovementKind.ORDER_USE,
            description: 'used',
            orderId: order.id,
          },
        }),
      );
    }

    try {
      if (stockOps.length > 0) {
        await this.prisma.$transaction(stockOps);
      }
    } catch (err) {
      await this.prisma.order.delete({ where: { id: order.id } });
      throw err;
    }

    return { order, warnings };
  }

  list(actor: AuthUser) {
    const restaurantId = this.requireRestaurant(actor);
    return this.prisma.order.findMany({
      where: { restaurantId },
      include: {
        lines: { include: { addons: true } },
        payments: true,
        extraCharges: true,
        placedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
        wastedBy: { select: { id: true, name: true } },
        register: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listSales(actor: AuthUser) {
    const restaurantId = this.requireRestaurant(actor);
    const sales = await this.prisma.order.findMany({
      where: {
        restaurantId,
        orderType: OrderType.SALE,
      },
      include: {
        lines: { include: { addons: true } },
        payments: true,
        extraCharges: true,
        placedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
        register: true,
        customer: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    return sales.map((s) => {
      const extraChargeAmount = s.extraCharges.reduce(
        (sum, e) => sum.add(new Prisma.Decimal(e.amount.toString())),
        new Prisma.Decimal(0),
      );
      const discount = new Prisma.Decimal(
        s.billDiscountValue ? s.billDiscountValue.toString() : 0,
      );
      return {
        id: s.id,
        invoiceId: s.invoiceId,
        invoiceDate: s.invoiceDate,
        type: s.saleType,
        totalAmount: s.billTotal,
        discount,
        vatAmount: s.vatAmount,
        serviceCharge: s.serviceChargePercent,
        extraCharge: extraChargeAmount,
        netAmount: s.totalAmount,
        returnedAmount: s.returnedAmount,
        status: s.status,
        remarks: s.remarks,
        order: {
          lines: s.lines,
          payments: s.payments,
          extraCharges: s.extraCharges,
          placedBy: s.placedBy,
          receivedBy: s.receivedBy,
          customer: s.customer,
          register: s.register,
          paymentStatus: s.paymentStatus,
        },
      };
    });
  }

  async todayPaymentSummary(actor: AuthUser) {
    const restaurantId = this.requireRestaurant(actor);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        orderType: OrderType.SALE,
        status: OrderStatus.COMPLETED,
        invoiceDate: {
          gte: start,
          lt: end,
        },
      },
      select: {
        totalAmount: true,
        paymentStatus: true,
        payments: {
          select: {
            method: true,
            amount: true,
          },
        },
      },
    });

    let cashPayment = new Prisma.Decimal(0);
    let cardPayment = new Prisma.Decimal(0);
    let bankTransfer = new Prisma.Decimal(0);
    let paymentReceived = new Prisma.Decimal(0);
    let creditSales = new Prisma.Decimal(0);

    for (const order of orders) {
      if (order.paymentStatus === OrderPaymentStatus.CREDIT) {
        creditSales = creditSales.add(new Prisma.Decimal(order.totalAmount));
      }

      for (const payment of order.payments) {
        const amount = new Prisma.Decimal(payment.amount);
        paymentReceived = paymentReceived.add(amount);
        if (payment.method === OrderPayMethod.CASH) {
          cashPayment = cashPayment.add(amount);
        } else if (payment.method === OrderPayMethod.CARD) {
          cardPayment = cardPayment.add(amount);
        } else if (payment.method === OrderPayMethod.BANK) {
          bankTransfer = bankTransfer.add(amount);
        }
      }
    }

    return {
      date: start.toISOString().slice(0, 10),
      paymentReceived: this.decimalToNumber(paymentReceived),
      cashPayment: this.decimalToNumber(cashPayment),
      cardPayment: this.decimalToNumber(cardPayment),
      bankTransfer: this.decimalToNumber(bankTransfer),
      creditSales: this.decimalToNumber(creditSales),
    };
  }

  async voidOrder(actor: AuthUser, orderId: string) {
    const restaurantId = this.requireRestaurant(actor);

    const existing = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: {
        inventoryMovements: {
          where: { kind: InventoryMovementKind.ORDER_USE },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException('Order not found.');
    }
    if (existing.status === OrderStatus.VOIDED) {
      throw new BadRequestException('Order is already voided.');
    }

    const voidOps: Prisma.PrismaPromise<unknown>[] = [];
    for (const m of existing.inventoryMovements) {
      const restoreQty = new Prisma.Decimal(m.quantityDelta.toString()).mul(-1);

      voidOps.push(
        this.prisma.inventoryItem.update({
          where: { id: m.inventoryItemId },
          data: {
            currentStock: { increment: restoreQty },
          },
        }),
      );
      voidOps.push(
        this.prisma.inventoryMovement.create({
          data: {
            restaurantId,
            inventoryItemId: m.inventoryItemId,
            quantityDelta: restoreQty,
            kind: InventoryMovementKind.VOID_RESTORE,
            description: 'void restore',
            orderId,
          },
        }),
      );
    }
    voidOps.push(
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.VOIDED },
        include: {
          lines: { include: { addons: true } },
          payments: true,
          extraCharges: true,
          placedBy: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, name: true } },
          wastedBy: { select: { id: true, name: true } },
          register: true,
          customer: true,
        },
      }),
    );

    const results = await this.prisma.$transaction(voidOps);
    return results[results.length - 1] as Awaited<
      ReturnType<typeof this.prisma.order.update>
    >;
  }

  async markWaste(actor: AuthUser, orderId: string, reason: string) {
    const restaurantId = this.requireRestaurant(actor);
    const existing = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: { payments: true },
    });
    if (!existing) {
      throw new NotFoundException('Order not found.');
    }
    if (existing.status === OrderStatus.VOIDED) {
      throw new BadRequestException('Cannot mark a voided order as waste.');
    }
    if (existing.orderType === OrderType.WASTE) {
      throw new BadRequestException('Order is already marked as waste.');
    }

    const paidAmount = existing.payments.reduce(
      (sum, p) => sum.add(new Prisma.Decimal(p.amount.toString())),
      new Prisma.Decimal(0),
    );
    if (
      paidAmount.gt(0) ||
      existing.paymentStatus === OrderPaymentStatus.PAID
    ) {
      throw new BadRequestException(
        'Paid orders cannot be marked as waste. Void/refund it first.',
      );
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        orderType: OrderType.WASTE,
        wasteReason: reason.trim(),
        wastedAt: new Date(),
        wastedByUserId: actor.sub,
        paymentStatus: OrderPaymentStatus.PENDING,
      },
      include: {
        lines: { include: { addons: true } },
        payments: true,
        extraCharges: true,
        placedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
        wastedBy: { select: { id: true, name: true } },
        register: true,
        customer: true,
      },
    });
  }

  /**
   * Record partial or full settlement against a credit invoice.
   * Outstanding = totalAmount - returnedAmount - sum(payments).
   */
  async settleCredit(
    actor: AuthUser,
    orderId: string,
    dto: CreditSettlementDto,
  ) {
    const restaurantId = this.requireRestaurant(actor);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: { payments: true, customer: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    if (order.status === OrderStatus.VOIDED) {
      throw new BadRequestException('Cannot settle a voided order.');
    }
    if (order.orderType !== OrderType.SALE) {
      throw new BadRequestException('Only sale orders can be credit-settled.');
    }
    if (!order.customerId) {
      throw new BadRequestException(
        'Order has no linked customer; credit settlement requires a customer.',
      );
    }

    const outstanding = this.orderCreditOutstanding(order);
    if (outstanding.lte(0)) {
      throw new BadRequestException(
        'This invoice has no outstanding credit balance.',
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
    const newPaymentStatus = newOutstanding.lte(0)
      ? OrderPaymentStatus.PAID
      : OrderPaymentStatus.CREDIT;

    await this.prisma.$transaction([
      this.prisma.orderPayment.create({
        data: {
          orderId,
          method: dto.method,
          amount: payAmount,
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: newPaymentStatus },
      }),
    ]);

    return this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: {
        lines: { include: { addons: true } },
        payments: true,
        extraCharges: true,
        placedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
        register: true,
        customer: true,
      },
    });
  }
}
