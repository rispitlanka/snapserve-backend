import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class AddAddonToMenuItemDto {
  @ApiProperty({ description: 'Addon id' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Addon price for this item', example: 15 })
  @IsNumber()
  @Type(() => Number)
  addonsPrice!: number;
}
