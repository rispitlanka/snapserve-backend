import { MenuType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CreateMenuItemAddonPriceDto,
  CreateMenuItemVariantPriceDto,
} from './create-menu-item.dto';

export class UpdateMenuItemDto {
  @ApiPropertyOptional({ example: 'Chicken Biryani' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ description: 'Menu category id' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Menu type(s). Send both for Dinein + Take Away.',
    isArray: true,
    enum: MenuType,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(MenuType, { each: true })
  menuType?: MenuType[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  kotEnabled?: boolean;

  @ApiPropertyOptional({ example: 199 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cost?: number;

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

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
