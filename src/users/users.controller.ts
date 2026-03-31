import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('admins')
  @Roles(Role.SUPER_ADMIN)
  createRestaurantAdmin(@Body() dto: CreateAdminDto) {
    return this.usersService.createRestaurantAdmin(dto);
  }

  @Get('admins')
  @Roles(Role.SUPER_ADMIN)
  listRestaurantAdmins() {
    return this.usersService.listRestaurantAdmins();
  }

  @Patch('admins/:id')
  @Roles(Role.SUPER_ADMIN)
  updateRestaurantAdmin(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateRestaurantAdmin(id, dto);
  }

  @Delete('admins/:id')
  @Roles(Role.SUPER_ADMIN)
  deleteRestaurantAdmin(@Param('id') id: string) {
    return this.usersService.deleteRestaurantAdmin(id);
  }

  @Post('staff')
  @Roles(Role.RESTAURANT_ADMIN)
  createRestaurantStaff(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateStaffDto,
  ) {
    return this.usersService.createRestaurantStaff(user, dto);
  }

  @Get('staff')
  @Roles(Role.RESTAURANT_ADMIN)
  listRestaurantStaff(@CurrentUser() user: AuthUser) {
    return this.usersService.listRestaurantStaff(user);
  }

  @Patch('staff/:id')
  @Roles(Role.RESTAURANT_ADMIN)
  updateRestaurantStaff(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateRestaurantStaff(user, id, dto);
  }

  @Delete('staff/:id')
  @Roles(Role.RESTAURANT_ADMIN)
  deleteRestaurantStaff(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.usersService.deleteRestaurantStaff(user, id);
  }
}
