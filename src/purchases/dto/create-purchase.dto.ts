import { PurchasePaymentMethod } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreatePurchaseItemDto {
  @ApiProperty({ description: 'Inventory item id' })
  @IsString()
  inventoryItemId!: string;

  @ApiProperty({ example: 'Tomato Grade A' })
  @IsString()
  itemName!: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({ example: 'Batch A' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Type(() => Number)
  purchasePrice!: number;

  @ApiProperty({ example: 65 })
  @IsNumber()
  @Type(() => Number)
  sellingPrice!: number;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Type(() => Number)
  total!: number;
}

export class CreatePurchaseDto {
  @ApiProperty()
  @IsString()
  supplierId!: string;

  @ApiProperty({ description: 'ISO date-time for receive date' })
  @IsDateString()
  receiveDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refNo?: string;

  @ApiProperty({ enum: PurchasePaymentMethod })
  @IsEnum(PurchasePaymentMethod)
  paymentMethod!: PurchasePaymentMethod;

  @ApiProperty({ description: 'Must equal sum of line totals' })
  @IsNumber()
  @Type(() => Number)
  subTotal!: number;

  @ApiProperty({ type: [CreatePurchaseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items!: CreatePurchaseItemDto[];
}
