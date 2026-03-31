import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateItemSubCategoryDto {
  @ApiProperty({ description: 'Parent category id' })
  @IsString()
  categoryId!: string;

  @ApiProperty({ example: 'Leafy' })
  @IsString()
  @MinLength(1)
  name!: string;
}
