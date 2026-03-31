import { MenuType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateMenuItemVariantPriceDto {
  @ApiProperty({ description: 'Variant id' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Type(() => Number)
  varientPrice!: number;
}

export class CreateMenuItemAddonPriceDto {
  @ApiProperty({ description: 'Addon id' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @Type(() => Number)
  addonsPrice!: number;
}

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Chicken Biryani' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ description: 'Menu category id' })
  @IsString()
  categoryId!: string;

  @ApiProperty({
    description: 'Menu type(s). Send both for Dinein + Take Away.',
    isArray: true,
    enum: MenuType,
    example: [MenuType.DINEIN, MenuType.TAKE_AWAY],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(MenuType, { each: true })
  menuType!: MenuType[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  kotEnabled?: boolean;

  @ApiProperty({ example: 199 })
  @IsNumber()
  @Type(() => Number)
  cost!: number;

  @ApiPropertyOptional({ example: 'https://...' })
  @IsOptional()
  @IsString()
  menuImage?: string;

  @ApiPropertyOptional({ type: [CreateMenuItemVariantPriceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMenuItemVariantPriceDto)
  varients?: CreateMenuItemVariantPriceDto[];

  @ApiPropertyOptional({ type: [CreateMenuItemAddonPriceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMenuItemAddonPriceDto)
  addons?: CreateMenuItemAddonPriceDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
