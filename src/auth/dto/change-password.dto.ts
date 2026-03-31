import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'OldPass@123',
  })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    description: 'New password',
    minLength: 8,
    example: 'NewPass@123',
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
