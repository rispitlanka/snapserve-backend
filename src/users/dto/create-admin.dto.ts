import { IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  restaurantId!: string;

  @IsString()
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
