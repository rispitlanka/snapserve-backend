import { OrderPayMethod } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreditSettlementDto {
  @ApiProperty({
    description: 'Amount to settle (partial or full remaining balance)',
  })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ enum: OrderPayMethod })
  @IsEnum(OrderPayMethod)
  method!: OrderPayMethod;
}
