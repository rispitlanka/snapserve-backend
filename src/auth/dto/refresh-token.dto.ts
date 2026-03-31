import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token issued during login/refresh',
    example:
      '9a67b18462ea502e8a3e6eb2711a495bdf0bac1a8b127e2fce7240b0084df4df71c702502f06cad32d61c0830763f197',
  })
  @IsString()
  refreshToken!: string;
}
