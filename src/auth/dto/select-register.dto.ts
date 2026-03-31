import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SelectRegisterDto {
  @ApiProperty({ description: 'Register ID to acquire for cashier session' })
  @IsString()
  registerId!: string;
}
