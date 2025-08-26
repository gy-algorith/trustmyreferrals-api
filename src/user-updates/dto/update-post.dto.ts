import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class UpdatePostDto {
  @ApiProperty({
    description: 'Updated post content',
    example: 'Modified update content.',
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description?: string;
}
