import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Customer full name',
    example: 'John Doe',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({
    description: 'Customer mobile number',
    example: '9876543210',
  })
  @IsString()
  @Matches(/^[0-9]{10,15}$/)
  mobileNumber!: string;
}
