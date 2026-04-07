import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, Max, Min } from 'class-validator';

export class UpdateLoyaltySettingsDto {
  @ApiProperty({
    description: 'Whether loyalty points are enabled for this restaurant',
    example: true,
  })
  @IsBoolean()
  loyaltyEnabled!: boolean;

  @ApiProperty({
    description:
      'Minimum bill amount required before loyalty points can be earned/redeemed',
    example: 500,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  loyaltyMargin!: number;

  @ApiProperty({
    description: 'Loyalty percentage to apply when loyalty is enabled',
    example: 5,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  loyaltyPercentage!: number;
}
