import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreditSettlementDto } from './dto/credit-settlement.dto';
import { MarkWasteDto } from './dto/mark-waste.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({
    summary:
      'Create completed order (cashier). Deducts inventory from menu + addon ingredients; may return stock warnings.',
  })
  @Roles(Role.CASHIER)
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(actor, dto);
  }

  @ApiOperation({ summary: 'List orders for this restaurant' })
  @Roles(Role.CASHIER, Role.RESTAURANT_ADMIN)
  @Get()
  list(@CurrentUser() actor: AuthUser) {
    return this.ordersService.list(actor);
  }

  @ApiOperation({
    summary:
      'List sales (successful SALE orders) with invoice and financial columns',
  })
  @Roles(Role.CASHIER, Role.RESTAURANT_ADMIN)
  @Get('sales')
  listSales(@CurrentUser() actor: AuthUser) {
    return this.ordersService.listSales(actor);
  }

  @ApiOperation({
    summary:
      'Get current date payment summary: payment received, cash, card, bank transfer, and credit sales',
  })
  @Roles(Role.CASHIER, Role.RESTAURANT_ADMIN)
  @Get('today-payment-summary')
  todayPaymentSummary(@CurrentUser() actor: AuthUser) {
    return this.ordersService.todayPaymentSummary(actor);
  }

  @ApiOperation({
    summary: 'Void order and restore inventory from ingredient consumption',
  })
  @Roles(Role.CASHIER, Role.RESTAURANT_ADMIN)
  @Patch(':id/void')
  voidOrder(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.ordersService.voidOrder(actor, id);
  }

  @ApiOperation({
    summary:
      'Mark completed unpaid order as waste (cashier/admin). Keeps stock deduction and excludes from sales via orderType.',
  })
  @Roles(Role.CASHIER, Role.RESTAURANT_ADMIN)
  @Patch(':id/waste')
  markWaste(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: MarkWasteDto,
  ) {
    return this.ordersService.markWaste(actor, id, dto.reason);
  }

  @ApiOperation({
    summary:
      'Settle credit for an invoice (partial or full). Appends OrderPayment and updates paymentStatus when fully paid.',
  })
  @Roles(Role.CASHIER, Role.RESTAURANT_ADMIN)
  @Patch(':id/credit-settlement')
  settleCredit(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreditSettlementDto,
  ) {
    return this.ordersService.settleCredit(actor, id, dto);
  }
}
