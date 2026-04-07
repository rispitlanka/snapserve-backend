import { PurchaseSettlementMethod } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PurchaseCreditSettlementDto {
  @ApiProperty({
    description: 'Amount to settle against this credit purchase',
    example: 500,
  })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ enum: PurchaseSettlementMethod })
  @IsEnum(PurchaseSettlementMethod)
  method!: PurchaseSettlementMethod;

  @ApiPropertyOptional({ description: 'Optional settlement note' })
  @IsOptional()
  @IsString()
  note?: string;
}
