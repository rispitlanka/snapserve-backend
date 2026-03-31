import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateItemCategoryDto {
  @ApiProperty({ example: 'Vegetables' })
  @IsString()
  @MinLength(1)
  name!: string;
}
