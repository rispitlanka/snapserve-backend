import { InventoryUnit } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsString, Min } from 'class-validator';

export class AddIngredientDto {
  @ApiProperty({ description: 'Inventory item id (ingredient)' })
  @IsString()
  ingredientId!: string;

  @ApiProperty({ example: 0.25 })
  @IsNumber()
  @Min(0.0001)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({
    enum: InventoryUnit,
    description: 'Must match the inventory item unit',
  })
  @IsEnum(InventoryUnit)
  unit!: InventoryUnit;
}
