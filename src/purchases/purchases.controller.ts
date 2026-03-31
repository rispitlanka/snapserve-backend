import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchasesService } from './purchases.service';

@ApiTags('Purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @ApiOperation({ summary: 'List all purchases for this restaurant' })
  @Get()
  list(@CurrentUser() actor: AuthUser) {
    return this.purchasesService.list(actor);
  }

  @ApiOperation({
    summary: 'Create purchase with line items (restaurant admin only)',
  })
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreatePurchaseDto) {
    return this.purchasesService.create(actor, dto);
  }
}
