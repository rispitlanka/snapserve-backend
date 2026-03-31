import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomersService } from './customers.service';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @ApiOperation({ summary: 'Create customer (cashier only)' })
  @Roles(Role.CASHIER)
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(actor, dto);
  }

  @ApiOperation({ summary: 'List customers (cashier or restaurant admin)' })
  @Roles(Role.CASHIER, Role.RESTAURANT_ADMIN)
  @Get()
  list(@CurrentUser() actor: AuthUser) {
    return this.customersService.list(actor);
  }

  @ApiOperation({
    summary:
      'Sales history for this customer (completed sale orders with invoice and payments)',
  })
  @Roles(Role.CASHIER, Role.RESTAURANT_ADMIN)
  @Get(':customerId/sales')
  salesHistory(
    @CurrentUser() actor: AuthUser,
    @Param('customerId') customerId: string,
  ) {
    return this.customersService.getSalesHistory(actor, customerId);
  }

  @ApiOperation({
    summary:
      'Credit invoices for this customer with remaining balance (outstanding > 0)',
  })
  @Roles(Role.CASHIER, Role.RESTAURANT_ADMIN)
  @Get(':customerId/credits')
  creditOutstanding(
    @CurrentUser() actor: AuthUser,
    @Param('customerId') customerId: string,
  ) {
    return this.customersService.getCreditOutstanding(actor, customerId);
  }
}
