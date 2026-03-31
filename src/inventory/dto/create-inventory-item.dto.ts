import { InventoryUnit } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'Tomato Grade A' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ description: 'Item category id' })
  @IsString()
  categoryId!: string;

  @ApiProperty({ description: 'Item sub-category id' })
  @IsString()
  subCategoryId!: string;

  @ApiProperty({ description: 'Brand id' })
  @IsString()
  brandId!: string;

  @ApiProperty({ enum: InventoryUnit })
  @IsEnum(InventoryUnit)
  unit!: InventoryUnit;

  @ApiPropertyOptional({
    description: 'ISO date (expiry)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
