import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateRegisterDto {
  @ApiProperty({ example: 'Counter 1' })
  @IsString()
  name!: string;
}
