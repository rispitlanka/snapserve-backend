import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SelectRegisterDto } from './dto/select-register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login (super admin or restaurant-scoped user)' })
  @ApiBody({ type: LoginDto })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Refresh access token by rotating refresh session' })
  @ApiBody({ type: RefreshTokenDto })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Logout by revoking active refresh session' })
  @ApiBody({ type: RefreshTokenDto })
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cashier selects register and receives register-bound tokens',
  })
  @ApiBody({ type: SelectRegisterDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CASHIER)
  @Post('select-register')
  selectRegister(
    @CurrentUser() user: AuthUser,
    @Body() dto: SelectRegisterDto,
  ) {
    return this.authService.selectRegister(user, dto.registerId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password and invalidate active sessions' })
  @ApiBody({ type: ChangePasswordDto })
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user, dto);
  }
}
