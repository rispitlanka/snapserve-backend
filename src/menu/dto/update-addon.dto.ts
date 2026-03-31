import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateAddonDto {
  @ApiPropertyOptional({ example: 'Extra Spicy Sauce' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
