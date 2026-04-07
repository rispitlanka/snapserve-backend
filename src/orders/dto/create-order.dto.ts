import {
  BillDiscountType,
  MenuType,
  OrderPayMethod,
  OrderPaymentStatus,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderLineAddonDto {
  @ApiProperty()
  @IsString()
  addonId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  price!: number;

  @ApiPropertyOptional({
    description: 'Addon quantity (defaults to line effective quantity)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  quantity?: number;
}

export class CreateOrderLineDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantName?: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  price!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  discount!: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  netAmount!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  returnedAmount?: number;

  @ApiPropertyOptional({ type: [CreateOrderLineAddonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineAddonDto)
  addons?: CreateOrderLineAddonDto[];
}

export class BillDiscountDto {
  @ApiProperty({ enum: BillDiscountType })
  @IsEnum(BillDiscountType)
  type!: BillDiscountType;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  value!: number;
}

export class ExtraChargeDto {
  @ApiProperty()
  @IsString()
  reason!: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  amount!: number;
}

export class OrderPaymentLineDto {
  @ApiProperty({ enum: OrderPayMethod })
  @IsEnum(OrderPayMethod)
  method!: OrderPayMethod;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;
}

export class OrderCustomerDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  mobileNumber!: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [CreateOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  items!: CreateOrderLineDto[];

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  billTotal!: number;

  @ApiPropertyOptional({ type: BillDiscountDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillDiscountDto)
  billDiscount?: BillDiscountDto;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  vatAmount!: number;

  @ApiProperty({ description: 'Service charge percentage (e.g. 5 for 5%)' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  serviceChargePercent!: number;

  @ApiProperty({ type: [ExtraChargeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraChargeDto)
  extraCharges!: ExtraChargeDto[];

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  totalAmount!: number;

  @ApiProperty({ enum: MenuType, description: 'Order sale type' })
  @IsEnum(MenuType)
  saleType!: MenuType;

  @ApiPropertyOptional({
    description: 'Total returned amount in currency for this order',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  returnedAmount?: number;

  @ApiPropertyOptional({ description: 'Optional remarks for invoice/sales' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({ type: [OrderPaymentLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderPaymentLineDto)
  payments!: OrderPaymentLineDto[];

  @ApiProperty({ enum: OrderPaymentStatus })
  @IsEnum(OrderPaymentStatus)
  paymentStatus!: OrderPaymentStatus;

  @ApiPropertyOptional({ type: OrderCustomerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderCustomerDto)
  customer?: OrderCustomerDto;

  @ApiPropertyOptional({
    description:
      'Loyalty points to redeem in this order. Requires linked customer and enabled loyalty settings.',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  loyaltyPointsUsed?: number;

  @ApiPropertyOptional({
    description: 'Defaults to current user (cashier)',
  })
  @IsOptional()
  @IsString()
  placedByUserId?: string;

  @ApiPropertyOptional({
    description: 'Defaults to current user (cashier)',
  })
  @IsOptional()
  @IsString()
  receivedByUserId?: string;
}
