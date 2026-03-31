import { ExpenseCategory, ExpensePaymentMethod } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({
    description: 'Expense date (ISO date-time)',
    example: '2026-03-30T12:00:00.000Z',
  })
  @IsDateString()
  expenseDate!: string;

  @ApiPropertyOptional({ example: 'EXP-2026-001' })
  @IsOptional()
  @IsString()
  refNo?: string;

  @ApiPropertyOptional({ example: 'ABC Supplies' })
  @IsOptional()
  @IsString()
  payeeName?: string;

  @ApiPropertyOptional({ example: 'Monthly cleaning service' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @ApiProperty({ enum: ExpensePaymentMethod })
  @IsEnum(ExpensePaymentMethod)
  paymentMethod!: ExpensePaymentMethod;

  @ApiProperty({ example: 1500.5 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;
}
