import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString, MinLength } from 'class-validator';

export class AdjustInventoryStockDto {
  @ApiProperty({
    description: 'Quantity to subtract from current stock',
    example: 2.5,
  })
  @IsNumber()
  @Type(() => Number)
  count!: number;

  @ApiProperty({
    description: 'Reason for manual stock adjustment',
    example: 'Damaged stock found during audit',
  })
  @IsString()
  @MinLength(2)
  reason!: string;
}
