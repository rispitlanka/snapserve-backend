import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateRestaurantDto {
  @ApiPropertyOptional({
    description: 'Restaurant display name',
    example: 'Rispit Downtown',
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({
    description: 'Restaurant contact mobile number (digits only, 10–15)',
    example: '9876543210',
  })
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null ? undefined : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10,15}$/, {
    message: 'mobileNumber must be 10–15 digits',
  })
  mobileNumber?: string;

  @ApiPropertyOptional({
    description: 'Whether the restaurant is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
