import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'FreshCo' })
  @IsString()
  @MinLength(1)
  name!: string;
}
