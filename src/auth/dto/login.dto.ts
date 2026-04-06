import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiPropertyOptional({
    description: 'Restaurant ID for restaurant-scoped login',
    example: 'rispit-downtown-01',
  })
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @ApiPropertyOptional({
    description: 'User name for restaurant-scoped login',
    example: 'owner1',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description:
      'Password. Super admin login uses only password; restaurant login uses restaurantId+name+password.',
    minLength: 8,
    example: 'Owner@12345',
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
