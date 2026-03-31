import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateAddonDto {
  @ApiProperty({ example: 'Extra Cheese' })
  @IsString()
  @MinLength(1)
  name!: string;
}
