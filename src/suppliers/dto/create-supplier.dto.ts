import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({
    description: 'Supplier name',
    example: 'Fresh Foods Co.',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    description: 'Supplier contact number',
    example: '9876543210',
  })
  @IsString()
  @Matches(/^[0-9]{10,15}$/)
  contactNumber!: string;

  @ApiPropertyOptional({
    description: 'Supplier description or notes',
    example: 'Vegetable and dairy partner',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
