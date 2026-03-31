import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @ApiOperation({
    summary: 'List suppliers for this restaurant (restaurant admin only)',
  })
  @Get()
  list(@CurrentUser() actor: AuthUser) {
    return this.suppliersService.list(actor);
  }

  @ApiOperation({ summary: 'Create supplier (restaurant admin only)' })
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(actor, dto);
  }
}
