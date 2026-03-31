import { Role } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(Role)
  role!: Role;
}
