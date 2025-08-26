import { ApiProperty } from '@nestjs/swagger';
import { UserUpdateResponseDto } from './user-update-response.dto';

export class PaginatedUserUpdatesResponseDto {
  @ApiProperty({
    description: 'List of updates',
    type: [UserUpdateResponseDto],
  })
  updates: UserUpdateResponseDto[];

  @ApiProperty({
    description: 'Total number of items',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Page number',
    example: 1,
  })
  page: number;
}
