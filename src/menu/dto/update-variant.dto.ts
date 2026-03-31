import { VariantCategory } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateVariantDto {
  @ApiPropertyOptional({ enum: VariantCategory, example: VariantCategory.SIZE })
  @IsOptional()
  @IsEnum(VariantCategory)
  variantCategory?: VariantCategory;

  @ApiPropertyOptional({ example: 'Medium' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
