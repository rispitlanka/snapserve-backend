import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class MarkWasteDto {
  @ApiProperty({
    description: 'Reason for waste',
    example: 'End of day leftovers',
  })
  @IsString()
  @MinLength(2)
  reason!: string;
}
