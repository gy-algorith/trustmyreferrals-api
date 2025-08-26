import { ApiProperty } from '@nestjs/swagger';
import { UpdateType } from '../../entities/user-update.entity';

export class UserUpdateResponseDto {
  @ApiProperty({
    description: 'Update ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Update type',
    enum: UpdateType,
    example: UpdateType.POST,
  })
  updateType: UpdateType;

  @ApiProperty({
    description: 'Update content',
    example: 'New update content.',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Metadata',
    example: { event: 'user_post', postedAt: '2025-08-17T10:00:00Z' },
    nullable: true,
  })
  metadata: Record<string, any> | null;

  @ApiProperty({
    description: 'Created at',
    example: '2025-08-17T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at',
    example: '2025-08-17T10:00:00Z',
  })
  updatedAt: Date;
}
