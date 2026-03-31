import { VariantCategory } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class CreateVariantDto {
  @ApiProperty({ enum: VariantCategory, example: VariantCategory.SIZE })
  @IsEnum(VariantCategory)
  variantCategory!: VariantCategory;

  @ApiProperty({ example: 'Large' })
  @IsString()
  @MinLength(1)
  name!: string;
}
