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
import { CreateRegisterDto } from './dto/create-register.dto';
import { UpdateRegisterDto } from './dto/update-register.dto';
import { RegistersService } from './registers.service';

@ApiTags('Registers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@Controller('registers')
export class RegistersController {
  constructor(private readonly registersService: RegistersService) {}

  @ApiOperation({ summary: 'Create register (restaurant admin)' })
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateRegisterDto) {
    return this.registersService.create(actor, dto);
  }

  @ApiOperation({ summary: 'List registers with occupancy status' })
  @Get()
  @Roles(Role.RESTAURANT_ADMIN, Role.CASHIER)
  list(@CurrentUser() actor: AuthUser) {
    return this.registersService.list(actor);
  }

  @ApiOperation({ summary: 'Update register details (restaurant admin)' })
  @Patch(':id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRegisterDto,
  ) {
    return this.registersService.update(actor, id, dto);
  }
}
