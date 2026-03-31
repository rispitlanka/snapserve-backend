import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, OrderType, Prisma } from '@prisma/client';
import type { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthUser, dto: CreateCustomerDto) {
    if (!actor.restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }

    try {
      return await this.prisma.customer.create({
        data: {
          name: dto.name,
          mobileNumber: dto.mobileNumber,
          restaurantId: actor.restaurantId,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A customer with this mobile number already exists in this restaurant.',
        );
      }
      throw error;
    }
  }

  list(actor: AuthUser) {
    if (!actor.restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }

    return this.prisma.customer.findMany({
      where: { restaurantId: actor.restaurantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertCustomerInRestaurant(
    customerId: string,
    restaurantId: string,
  ) {
    const c = await this.prisma.customer.findFirst({
      where: { id: customerId, restaurantId },
      select: { id: true },
    });
    if (!c) {
      throw new NotFoundException('Customer not found.');
    }
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

  /** All completed sale orders for this customer (sales history). */
  async getSalesHistory(actor: AuthUser, customerId: string) {
    const restaurantId = actor.restaurantId;
    if (!restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }
    await this.assertCustomerInRestaurant(customerId, restaurantId);

    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        customerId,
        orderType: OrderType.SALE,
        status: OrderStatus.COMPLETED,
      },
      include: {
        lines: { include: { addons: true } },
        payments: { orderBy: { createdAt: 'asc' } },
        extraCharges: true,
        placedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
        register: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    return orders.map((o) => {
      const settlementTimes = o.payments.map((p) => p.createdAt.getTime());
      const lastSettlementAt =
        settlementTimes.length > 0
          ? new Date(Math.max(...settlementTimes))
          : null;

      return {
        id: o.id,
        invoiceId: o.invoiceId,
        invoiceDate: o.invoiceDate,
        totalAmount: o.totalAmount,
        returnedAmount: o.returnedAmount,
        paymentStatus: o.paymentStatus,
        paidTotal: this.orderPaidTotal(o.payments),
        creditOutstanding: this.orderCreditOutstanding(o),
        lastSettlementAt,
        saleType: o.saleType,
        remarks: o.remarks,
        lines: o.lines,
        payments: o.payments.map((p) => ({
          id: p.id,
          method: p.method,
          amount: p.amount,
          settledAt: p.createdAt,
        })),
        extraCharges: o.extraCharges,
        placedBy: o.placedBy,
        receivedBy: o.receivedBy,
        register: o.register,
      };
    });
  }

  /** Credit invoices for this customer with remaining balance > 0. */
  async getCreditOutstanding(actor: AuthUser, customerId: string) {
    const restaurantId = actor.restaurantId;
    if (!restaurantId) {
      throw new ForbiddenException('Restaurant context is required.');
    }
    await this.assertCustomerInRestaurant(customerId, restaurantId);

    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        customerId,
        orderType: OrderType.SALE,
        status: OrderStatus.COMPLETED,
      },
      include: { payments: { orderBy: { createdAt: 'asc' } } },
      orderBy: { invoiceDate: 'asc' },
    });

    return orders
      .map((o) => {
        const outstanding = this.orderCreditOutstanding(o);
        const settlementTimes = o.payments.map((p) => p.createdAt.getTime());
        const lastSettlementAt =
          settlementTimes.length > 0
            ? new Date(Math.max(...settlementTimes))
            : null;

        return {
          orderId: o.id,
          invoiceId: o.invoiceId,
          invoiceDate: o.invoiceDate,
          totalAmount: o.totalAmount,
          returnedAmount: o.returnedAmount,
          paymentStatus: o.paymentStatus,
          paidTotal: this.orderPaidTotal(o.payments),
          creditOutstanding: outstanding,
          lastSettlementAt,
          payments: o.payments.map((p) => ({
            id: p.id,
            method: p.method,
            amount: p.amount,
            settledAt: p.createdAt,
          })),
        };
      })
      .filter((row) => row.creditOutstanding.gt(0));
  }
}
