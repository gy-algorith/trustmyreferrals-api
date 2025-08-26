import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Indicates if the request was successful', example: true })
  success: boolean;

  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiProperty({ description: 'Error message (if failed)', required: false, example: null })
  message?: string;
}
